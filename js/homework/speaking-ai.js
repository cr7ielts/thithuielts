// =====================================================================
//  AI chấm Speaking homework — Gemini qua Firebase AI Logic
//  Mỗi request chỉ nhận 1 file âm thanh, nên chạy 2 bước:
//   1) Từng câu trả lời: nghe audio → chép lời + nhận xét + lỗi & cách sửa
//   2) Tổng hợp (chỉ văn bản): chấm band 4 tiêu chí + điểm mạnh + ưu tiên cải thiện
//  Band tổng do web tự tính theo quy tắc làm tròn của IELTS.
// =====================================================================
import { initAI, isConfigured } from "../firebase.js";
import { AI_SPEAKING } from "../config.js";

export const CRITERIA = [
  { key: "fc",  name: "Fluency & Coherence" },
  { key: "lr",  name: "Lexical Resource" },
  { key: "gra", name: "Grammatical Range & Accuracy" },
  { key: "p",   name: "Pronunciation" },
];

export const aiAvailable = () => AI_SPEAKING.enabled;

/** IELTS: trung bình 4 tiêu chí, .25 làm tròn lên .5, .75 làm tròn lên số nguyên */
export function overallBand(bands) {
  const vals = bands.filter((b) => typeof b === "number" && !Number.isNaN(b));
  if (vals.length !== 4) return null;
  const avg = vals.reduce((s, b) => s + b, 0) / 4;
  const whole = Math.floor(avg);
  const frac = avg - whole;
  return frac < 0.25 ? whole : frac < 0.75 ? whole + 0.5 : whole + 1;
}

const clampBand = (b) => (Number.isFinite(Number(b)) && b !== null ? Math.min(9, Math.max(0, Math.round(Number(b) * 2) / 2)) : null);
const FILLERS = /\b(um+|uh+|er+|erm|ah+|hmm+|you know|i mean|kind of|sort of)\b/gi;

function textStats(transcripts, seconds) {
  const text = transcripts.join(" ");
  const words = (text.match(/[A-Za-z']+/g) || []).map((w) => w.toLowerCase());
  const unique = new Set(words).size;
  const minutes = Math.max(seconds / 60, 0.1);
  return {
    words: words.length,
    seconds,
    wpm: Math.round(words.length / minutes),
    fillers: (text.match(FILLERS) || []).length,
    uniqueRatio: words.length ? +(unique / words.length).toFixed(2) : 0,
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function withRetry(fn, tries = 4) {
  let delay = 2500;
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (err) {
      const msg = String(err?.message || err);
      // Hết tín dụng / chưa bật thanh toán thì thử lại cũng vô ích
      const billing = /prepay|credits|billing/i.test(msg);
      const retryable = !billing && /429|quota|rate|overload|503|unavailable|resource.?exhausted/i.test(msg);
      if (!retryable || i >= tries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

const LANG_LINE = () => (AI_SPEAKING.feedbackLang === "vi"
  ? "Write every explanation, comment and suggestion in Vietnamese. Keep quotes from the student and corrected English sentences in English."
  : "Write everything in English.");

/* ---------------- Khuôn JSON ---------------- */
function schemas(S) {
  const turn = S.object({
    properties: {
      transcript: S.string({ description: "Verbatim transcript of what the student said, including hesitations like um/uh. Empty string if nothing intelligible." }),
      relevance: S.string({ description: "One short sentence: did the answer address the question?" }),
      fluency: S.string({ description: "1-2 sentences on fluency and coherence in this answer." }),
      lexical: S.string({ description: "1-2 sentences on vocabulary range and accuracy." }),
      grammar: S.string({ description: "1-2 sentences on grammatical range and accuracy." }),
      pronunciation: S.string({ description: "1-2 sentences on pronunciation, stress, intonation and intelligibility, based on the audio." }),
      mistakes: S.array({
        items: S.object({
          properties: {
            quote: S.string({ description: "Exact words the student said." }),
            correction: S.string({ description: "Corrected or more natural English." }),
            type: S.enumString({ enum: ["grammar", "vocabulary", "pronunciation", "coherence"] }),
            explanation: S.string({ description: "Short reason." }),
          },
        }),
      }),
      upgrades: S.array({
        items: S.object({
          properties: {
            original: S.string({ description: "A plain word or phrase the student used." }),
            better: S.string({ description: "A higher-band alternative that fits the context." }),
          },
        }),
      }),
    },
  });

  const criterion = S.object({
    properties: {
      band: S.number({ description: "Band 0-9 in steps of 0.5, using the public IELTS Speaking band descriptors." }),
      summary: S.string({ description: "2-3 sentences justifying the band with reference to the descriptors." }),
      evidence: S.array({ items: S.string({ description: "Short quote or observation from the answers." }) }),
    },
  });

  const final = S.object({
    properties: {
      fc: criterion, lr: criterion, gra: criterion, p: criterion,
      strengths: S.array({ items: S.string() }),
      priorities: S.array({ items: S.string({ description: "A concrete next step the student should practise." }) }),
      teacherNote: S.string({ description: "2-3 sentences for the teacher: overall level, reliability of this estimate, anything to listen for." }),
    },
  });
  return { turn, final };
}

/**
 * turns: [{ part, prompt, blob, seconds }]
 * onProgress(step, total, label)
 * Trả về đối tượng analysis để lưu cùng bài nộp.
 */
export async function analyzeSpeaking(turns, { taskTitle = "", onProgress } = {}) {
  if (!isConfigured) return demoAnalysis(turns);

  const { aiMod, ai } = await initAI();
  const S = aiMod.Schema;
  const { turn: turnSchema, final: finalSchema } = schemas(S);
  const system = [
    "You are an experienced, fair IELTS Speaking examiner helping a teacher mark homework.",
    "Base every judgement on the public IELTS Speaking band descriptors. Do not inflate scores.",
    "Only comment on what you actually hear; if audio is unclear or silent, say so.",
    LANG_LINE(),
  ].join(" ");

  const turnModel = aiMod.getGenerativeModel(ai, {
    model: AI_SPEAKING.model,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json", responseSchema: turnSchema, temperature: 0.2 },
  });
  const finalModel = aiMod.getGenerativeModel(ai, {
    model: AI_SPEAKING.model,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json", responseSchema: finalSchema, temperature: 0.2 },
  });

  const total = turns.length + 1;
  const perTurn = [];
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    onProgress?.(i, total, t.prompt);
    const mimeType = (t.blob.type || "audio/webm").split(";")[0];
    const data = await blobToBase64(t.blob);
    const prompt = `Part: ${t.part}\nQuestion: ${t.prompt}\nThe student spoke for about ${t.seconds} seconds. ` +
      "Transcribe the answer and assess it. List at most 6 mistakes (most important first) and at most 5 vocabulary upgrades.";
    const res = await withRetry(() => turnModel.generateContent([prompt, { inlineData: { data, mimeType } }]));
    perTurn.push(JSON.parse(res.response.text()));
  }

  const seconds = turns.reduce((s, t) => s + (t.seconds || 0), 0);
  const stats = textStats(perTurn.map((p) => p.transcript || ""), seconds);
  onProgress?.(turns.length, total, "overall");
  const digest = turns.map((t, i) => [
    `### ${t.part} — ${t.prompt}`,
    `Transcript: ${perTurn[i].transcript || "(nothing intelligible)"}`,
    `Fluency: ${perTurn[i].fluency}`, `Lexical: ${perTurn[i].lexical}`,
    `Grammar: ${perTurn[i].grammar}`, `Pronunciation: ${perTurn[i].pronunciation}`,
  ].join("\n")).join("\n\n");
  const finalPrompt = [
    `Homework: ${taskTitle}`,
    `Measured by the website: ${stats.words} words in ${stats.seconds} s of speaking (${stats.wpm} words/min), ` +
      `${stats.fillers} filler words, type-token ratio ${stats.uniqueRatio}.`,
    "Per-answer notes from listening to each recording:",
    digest,
    "Give a band for each of the four criteria, with evidence quoted from the transcripts.",
  ].join("\n\n");
  const fin = JSON.parse((await withRetry(() => finalModel.generateContent(finalPrompt))).response.text());

  const criteria = {};
  for (const c of CRITERIA) {
    criteria[c.key] = { band: clampBand(fin[c.key]?.band), summary: fin[c.key]?.summary || "", evidence: fin[c.key]?.evidence || [] };
  }
  onProgress?.(total, total, "done");
  return {
    model: AI_SPEAKING.model,
    createdAt: new Date().toISOString(),
    criteria,
    overall: overallBand(CRITERIA.map((c) => criteria[c.key].band)),
    strengths: fin.strengths || [],
    priorities: fin.priorities || [],
    teacherNote: fin.teacherNote || "",
    stats,
    turns: perTurn.map((p) => ({
      transcript: p.transcript || "", relevance: p.relevance || "",
      fluency: p.fluency || "", lexical: p.lexical || "", grammar: p.grammar || "", pronunciation: p.pronunciation || "",
      mistakes: (p.mistakes || []).slice(0, 8), upgrades: (p.upgrades || []).slice(0, 6),
    })),
  };
}

/* Chế độ thử (chưa có Firebase): trả về một báo cáo mẫu để xem giao diện */
function demoAnalysis(turns) {
  const band = (b) => ({ band: b, summary: "Demo — sample feedback, not a real analysis.", evidence: ["(demo)"] });
  const criteria = { fc: band(6), lr: band(6.5), gra: band(5.5), p: band(6) };
  return {
    model: "demo", demo: true, createdAt: new Date().toISOString(), criteria,
    overall: overallBand([6, 6.5, 5.5, 6]),
    strengths: ["Demo: answers are relevant and extended."],
    priorities: ["Demo: practise past tenses when telling stories."],
    teacherNote: "Demo mode — connect Firebase AI Logic to get real analysis.",
    stats: { words: 0, seconds: turns.reduce((s, t) => s + t.seconds, 0), wpm: 0, fillers: 0, uniqueRatio: 0 },
    turns: turns.map(() => ({
      transcript: "(demo transcript)", relevance: "", fluency: "", lexical: "", grammar: "", pronunciation: "",
      mistakes: [{ quote: "I go there yesterday", correction: "I went there yesterday", type: "grammar", explanation: "Past simple for a finished time." }],
      upgrades: [{ original: "very good", better: "outstanding" }],
    })),
  };
}
