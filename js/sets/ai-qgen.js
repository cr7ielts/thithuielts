// AI đọc học phần / bộ từ rồi soạn câu hỏi riêng cho từng từ (Gemini qua Firebase AI Logic).
// Gói câu hỏi: { [aiKey(word)]: { sentence, answer, traps[], meaningTraps[], explain } }
//  · Học phần tự tạo: lưu ở trường `ai` của studySets/<id> (chủ học phần tạo).
//  · Bộ từ có sẵn: lưu ở aiPacks/deck_<id> (giáo viên tạo, mọi học sinh dùng chung).
import { initAI, initFirebase, isConfigured } from "../firebase.js";
import { AI_QUIZ } from "../config.js";
import { L } from "../i18n.js";
import { meaning } from "../data/vocab.js";
import { parseRef } from "./cards.js";
import { aiKey, findInSentence } from "./qgen.js";

export const aiQuizAvailable = () => isConfigured && AI_QUIZ.enabled;

/* ---------- lưu / đọc ---------- */
const LS = "ielts:aipacks";
const lsAll = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
const memo = new Map();

async function readDeckPack(deckId) {
  if (memo.has(deckId)) return memo.get(deckId);
  let pack = {};
  if (!isConfigured) pack = lsAll()[`deck_${deckId}`] || {};
  else {
    try {
      const { db, dbMod } = await initFirebase();
      const snap = await dbMod.getDoc(dbMod.doc(db, "aiPacks", `deck_${deckId}`));
      pack = snap.exists() ? snap.data().items || {} : {};
    } catch { pack = {}; }
  }
  memo.set(deckId, pack);
  return pack;
}

/** Gói câu hỏi AI cho học phần đã mở (r = kết quả resolveSet) */
export async function loadPackFor(r) {
  if (r.set) return r.set.ai || {};
  const decks = [...new Set(r.cards.map((c) => c.deckId).filter(Boolean))].slice(0, 12);
  const packs = await Promise.all(decks.map(readDeckPack));
  return Object.assign({}, ...packs);
}

export async function savePack(user, r, pack) {
  const [kind, id] = parseRef(r.ref);
  if (kind === "my") {
    r.set.ai = pack;
    if (!isConfigured || user.uid.startsWith("demo-")) {
      const list = JSON.parse(localStorage.getItem("ielts:studysets") || "[]");
      const i = list.findIndex((s) => s.id === id);
      if (i >= 0) { list[i].ai = pack; localStorage.setItem("ielts:studysets", JSON.stringify(list)); }
      return;
    }
    const { db, dbMod } = await initFirebase();
    await dbMod.updateDoc(dbMod.doc(db, "studySets", id), { ai: pack, aiAt: Date.now() });
    return;
  }
  if (kind === "deck") {
    memo.set(id, pack);
    if (!isConfigured) { const all = lsAll(); all[`deck_${id}`] = pack; localStorage.setItem(LS, JSON.stringify(all)); return; }
    const { db, dbMod } = await initFirebase();
    await dbMod.setDoc(dbMod.doc(db, "aiPacks", `deck_${id}`), { items: pack, updatedAt: Date.now(), by: user.uid });
  }
}

/** Ai được bấm "AI soạn câu hỏi": chủ học phần; bộ từ có sẵn thì giáo viên */
export function canGenerate(r, user, teacher) {
  const [kind] = parseRef(r.ref);
  return (kind === "my" && r.editable) || (kind === "deck" && teacher);
}

/* ---------- gọi AI ---------- */
function schema(S) {
  const item = S.object({
    properties: {
      word: S.string({ description: "The target word exactly as given." }),
      sentence: S.string({ description: "A NEW natural sentence (IELTS level, on the set's topic when possible, 10–22 words) where the target word fits the gap. The gap is written as _____ (five underscores) and appears exactly once. Must not be the example sentence given." }),
      answer: S.string({ description: "The exact form of the target word that fills the gap (inflect if needed, e.g. 'mitigated')." }),
      traps: S.array({ items: S.string(), description: "3 wrong options for the gap: real English words, same part of speech and same inflection as the answer, plausible-looking (similar meaning, collocation trap or similar spelling) but clearly wrong in this context. Never synonyms that would also be correct." }),
      meaningTraps: S.array({ items: S.string(), description: "3 wrong meanings written in the same language and style as the given meaning, close enough to confuse a learner (near-synonym, opposite, related concept), but wrong." }),
      explain: S.string({ description: "One short sentence in Vietnamese: why the answer fits and why the most tempting trap is wrong." }),
    },
  });
  return S.object({ properties: { items: S.array({ items: item }) } });
}

function validItem(card, it) {
  if (!it || !it.sentence || !it.answer) return null;
  const sentence = it.sentence.replace(/_{3,}/g, "_____");
  if ((sentence.match(/_____/g) || []).length !== 1) return null;
  const filled = sentence.replace("_____", it.answer);
  if (!findInSentence(card.word, filled) && !it.answer.toLowerCase().includes(card.word.toLowerCase().slice(0, 4))) return null;
  const clean = (a) => [...new Set((a || []).map((x) => String(x).trim()).filter(Boolean))].slice(0, 3);
  return {
    sentence, answer: it.answer.trim(),
    traps: clean(it.traps).filter((t) => t.toLowerCase() !== it.answer.toLowerCase()),
    meaningTraps: clean(it.meaningTraps).filter((t) => t !== meaning(card)),
    explain: String(it.explain || "").slice(0, 240),
  };
}

/**
 * Soạn câu hỏi cho các thẻ chưa có (hoặc tất cả nếu redo). onProgress(done, total).
 * Trả gói đã gộp với gói cũ.
 */
export async function generatePack(r, oldPack = {}, { redo = false, onProgress = () => {} } = {}) {
  if (!aiQuizAvailable()) throw new Error(L("Chưa bật AI soạn câu hỏi (AI_QUIZ trong js/config.js) hoặc đang ở chế độ thử.", "AI questions are off (AI_QUIZ in js/config.js) or you're in demo mode."));
  const { aiMod, ai } = await initAI();
  const model = aiMod.getGenerativeModel(ai, {
    model: AI_QUIZ.model,
    systemInstruction: "You are an experienced IELTS teacher writing vocabulary questions for Vietnamese learners. Questions must test real understanding and usage, not recognition. Return JSON only.",
    generationConfig: { responseMimeType: "application/json", responseSchema: schema(aiMod.Schema), temperature: 0.7 },
  });
  const pack = { ...oldPack };
  const todo = r.cards.filter((c) => redo || !pack[aiKey(c.word)]);
  const BATCH = 15;
  let done = 0;
  onProgress(0, todo.length);
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const lines = batch.map((c, k) => `${k + 1}. word: ${c.word}${c.pos ? ` (${c.pos})` : ""} | meaning: ${meaning(c)}${c.def && c.def !== meaning(c) ? ` | definition: ${c.def}` : ""}${c.example ? ` | example (do not reuse): ${c.example}` : ""}`);
    const prompt = `Study set: "${r.title}"${r.set?.desc ? ` — ${r.set.desc}` : ""}.\nAll words in the set: ${r.cards.slice(0, 120).map((c) => c.word).join(", ")}.\n` +
      `Write one item per word below. Prefer traps taken from the other words of this set when they fit the rules.\n${lines.join("\n")}`;
    let res = null;
    for (let t = 0; t < 3 && !res; t++) {
      try { res = JSON.parse((await model.generateContent(prompt)).response.text()); }
      catch (err) {
        const msg = String(err?.message || err);
        if (/prepay|credits|billing|permission|not enabled|API has not been used/i.test(msg) || t === 2) throw err;
        await new Promise((ok) => setTimeout(ok, 2500 * (t + 1)));
      }
    }
    (res?.items || []).forEach((it) => {
      const card = batch.find((c) => aiKey(c.word) === aiKey(it.word || "")) || null;
      const v = card && validItem(card, it);
      if (v) pack[aiKey(card.word)] = v;
    });
    done += batch.length;
    onProgress(done, todo.length);
  }
  return pack;
}
