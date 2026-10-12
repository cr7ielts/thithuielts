// =====================================================================
//  BÀI KIỂM TRA TỪ FILE WORD (.docx)
//  Giáo viên tải file đề (bản học sinh) + file đáp án (bản giáo viên) → web tự dựng bài làm và đáp án.
//
//  Cách đọc file đề (theo thứ tự trong file):
//    "PART 2 - COLLOCATIONS (Questions 11-18)"   → tiêu đề phần
//    "Read the passage…" + tên bài + các đoạn     → bài đọc (hiện trong khung riêng)
//    "11.  Nicotine is ____ addictive."            → câu hỏi số 11
//    "A. absolutely  B. highly  C. …"              → phương án trắc nghiệm của câu ngay trên
//    "… (6) ____ of chemicals …"                   → ô trống trong đoạn văn (điền / chọn trong khung từ)
//    "A  risk assessment"  (sau đoạn tóm tắt)      → khung từ A–J
//    Phần hướng dẫn có TRUE / FALSE / NOT GIVEN    → câu chọn TRUE / FALSE / NOT GIVEN
//    Câu không có "____" và không có phương án     → câu viết tự do, giáo viên chấm tay
//  File đáp án: bảng "Câu | Đáp án | Giải thích" (cột thứ 3 là giải thích / câu mẫu).
//
//  Dữ liệu lưu trong bài tập (assignments.quiz):
//    { title, subtitle, items: [ {t:"part"|"text"|"head"|"passage"|"gaptext"|"bank"|"q", …} ] }
//    câu hỏi: { t:"q", n, kind:"mcq"|"choice"|"text"|"free", text, extra:[dòng], options:[{v,t}] }
//    ô trống trong đoạn: { t:"gaptext", text: "… {{6}} …", gaps: { "6": "bank"|"text" } }
//  Đáp án lưu ở assignmentKeys như các bài khác: answers[i] = [cách viết đúng…]; câu tự do = ["*"].
//  Thêm why[i] (giải thích) và sample[i] (câu mẫu cho câu tự do).
// =====================================================================

/* ---------------- docx → các dòng chữ ---------------- */
let zipLib = null;
async function jszip() {
  if (zipLib) return zipLib;
  if (globalThis.JSZip) return (zipLib = globalThis.JSZip);
  await new Promise((ok, bad) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = ok; s.onerror = () => bad(new Error("Không tải được bộ đọc file Word, hãy kiểm tra mạng."));
    document.head.append(s);
  });
  return (zipLib = globalThis.JSZip);
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m);

function paraText(xml) {
  let out = "";
  for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g)) {
    out += m[1] !== undefined ? decode(m[1]) : m[0] === "<w:tab/>" ? "\t" : "\n";
  }
  return out;
}

/** document.xml → mảng dòng. Bảng: mỗi hàng một dòng, các ô ngăn bằng tab. */
export function xmlToLines(xml) {
  const body = xml.slice(xml.indexOf("<w:body"));
  const lines = [];
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[\s\S]*?<\/w:p>/g)) {
    const blk = m[0];
    if (blk.startsWith("<w:tbl>")) {
      for (const tr of blk.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)) {
        const cells = [...tr[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((tc) =>
          [...tc[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) => paraText(p[0]).trim()).filter(Boolean).join(" "));
        lines.push(cells.join("\t"));
      }
    } else lines.push(blk.endsWith("/>") ? "" : paraText(blk));
  }
  return lines.flatMap((l) => l.split("\n")).map((l) => l.replace(/ /g, " ").replace(/[   ]+$/g, "").replace(/^ +/, ""));
}

export async function docxLines(file) {
  const Z = await jszip();
  const zip = await Z.loadAsync(file);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("File này không phải file Word (.docx).");
  return xmlToLines(await doc.async("string"));
}

/* ---------------- Dựng bài từ các dòng của file đề ---------------- */
const GAP = /_{3,}|\.{6,}|…{2,}/;
const RE_PART = /^(PART|SECTION|PHẦN)\s+\d+\b/i;
const RE_QHEAD = /^Questions?\s+\d+\s*([-–—]|to|and)\s*\d+\s*$/i;
const RE_Q = /^(\d{1,3})[.)]\s+(.*)$/;
const RE_OPT = /^\(?([A-H])[.)]\s+\S/;
const RE_BANK = /^([A-L])(\t|\s{2,})(\S.*)$/;

/** "A. absolutely\tB. highly\tC. completely" → [{v,t}] */
function splitOptions(line) {
  const parts = line.split(/\t+|\s{2,}(?=\(?[A-H][.)]\s)/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const m = /^\(?([A-H])[.)]\s+(.*)$/.exec(p);
    if (m) out.push({ v: m[1], t: m[2].trim() });
    else if (out.length) out[out.length - 1].t += " " + p;
  }
  return out;
}

export function parseQuiz(lines) {
  const items = [];
  const L0 = lines.map((s) => s.trim());
  let i = 0;
  // phần đầu file: tên bài, dòng phụ; bỏ ô Name / Class / Score
  const head = [];
  while (i < L0.length && !RE_PART.test(L0[i])) {
    const s = L0[i++];
    if (s && !/^(name|class|score|họ tên|lớp|điểm)\s*:/i.test(s.split("\t")[0])) head.push(s.replace(/\t+/g, "  "));
  }
  const quiz = { title: head[0] || "Bài kiểm tra", subtitle: head.slice(1), items };
  if (i >= L0.length) { i = 0; quiz.subtitle = []; }   // không có PART: coi cả file là một phần

  let lastQ = null, choiceSet = null, partBank = null, passage = null, expectTitle = false;
  const gapItems = [];
  const closeQ = () => { lastQ = null; };
  for (; i < L0.length; i++) {
    const s = L0[i];
    if (!s) { if (passage && passage.paras.length) passage.gapAfter = true; continue; }
    if (/^-?\s*END OF TEST\s*-?$/i.test(s)) break;
    if (RE_PART.test(s)) {
      closeQ(); passage = null; choiceSet = null; partBank = null;
      items.push({ t: "part", text: s.replace(/\s{2,}/g, " ") });
      continue;
    }
    if (RE_QHEAD.test(s)) { closeQ(); passage = null; choiceSet = null; items.push({ t: "head", text: s }); continue; }
    // bài đọc
    if (/^read the (passage|text|article)/i.test(s)) {
      closeQ(); items.push({ t: "text", text: s });
      passage = { t: "passage", title: "", paras: [] }; items.push(passage); expectTitle = true;
      continue;
    }
    if (passage) {
      if (expectTitle && s.length < 90 && !/^[A-L](\t|\s{2,})/.test(s)) { passage.title = s; expectTitle = false; continue; }
      expectTitle = false;
      const m = /^([A-L])(\t|\s{2,})(.*)$/.exec(s);
      passage.paras.push(m ? { label: m[1], text: m[3].trim() } : { label: "", text: s });
      continue;
    }
    // hướng dẫn TRUE/FALSE/NOT GIVEN, YES/NO/NOT GIVEN
    if (/NOT GIVEN/.test(s) && !RE_Q.test(s)) {
      choiceSet = /\bYES\b/.test(s) || L0.slice(i, i + 4).some((x) => /^YES\b/.test(x)) ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
    }
    // câu hỏi
    const q = RE_Q.exec(s);
    if (q) {
      const n = +q[1];
      let text = q[2].split("\t").map((x) => x.trim()).filter(Boolean).join("  ");
      const tail = GAP.test(text.replace(/\s*\(([A-Z]{3,})\)\s*$/, ""));
      lastQ = { t: "q", n, kind: "", text, extra: [], options: [] };
      if (choiceSet && tail && /\s(_{3,}|\.{6,})\s*$/.test(text)) {
        lastQ.text = text.replace(/\s*(_{3,}|\.{6,})\s*$/, "");
        lastQ.kind = "choice"; lastQ.options = choiceSet.map((v) => ({ v, t: v }));
      }
      items.push(lastQ);
      continue;
    }
    // phương án A–D của câu vừa rồi
    if (lastQ && RE_OPT.test(s) && !lastQ.kind) {
      const opts = splitOptions(s);
      if (opts.length) { lastQ.options.push(...opts); continue; }
    }
    // đoạn có ô trống đánh số "(6) ____"
    if (/\(\d{1,3}\)\s*(_{3,}|\.{6,}|…)/.test(s)) {
      closeQ();
      const gaps = {};
      const text = s.replace(/\((\d{1,3})\)\s*(_{3,}|\.{6,}|…+)/g, (_, n) => { gaps[n] = "text"; return `{{${n}}}`; });
      const it = { t: "gaptext", text, gaps };
      items.push(it); gapItems.push(it);
      continue;
    }
    // khung từ A–J (sau đoạn có ô trống)
    if (gapItems.length && RE_BANK.test(s) && s.length < 80) {
      const row = s.split(/\t+/).map((c) => c.trim()).filter(Boolean);
      const add = [];
      for (let k = 0; k < row.length; k++) {
        const m = /^([A-L])(?:\s{1,}|$)(.*)$/.exec(row[k]);
        if (m && m[2]) add.push({ v: m[1], t: m[2].trim() });
        else if (m && row[k + 1]) { add.push({ v: m[1], t: row[k + 1] }); k++; }
      }
      if (add.length) {
        if (!partBank) { partBank = { t: "bank", options: [] }; items.push(partBank); }
        partBank.options.push(...add);
        gapItems.forEach((g) => Object.keys(g.gaps).forEach((n) => { g.gaps[n] = "bank"; g.bank = partBank.options; }));
        continue;
      }
    }
    // dòng phụ của câu (→ ____, từ khoá, câu viết lại…)
    if (lastQ && !lastQ.kind) { lastQ.extra.push(s.split("\t").map((x) => x.trim()).filter(Boolean).join("  ")); continue; }
    closeQ();
    items.push({ t: "text", text: s.split("\t").map((x) => x.trim()).filter(Boolean).join("  ") });
  }
  // xác định loại câu
  for (const it of items) {
    if (it.t !== "q" || it.kind) continue;
    if (it.options.length >= 2) it.kind = "mcq";
    else if (GAP.test(it.text) || it.extra.some((x) => GAP.test(x))) it.kind = "text";
    else it.kind = "free";
  }
  for (const g of gapItems) if (g.bank === undefined) delete g.bank;
  return quiz;
}

/** danh sách số câu theo thứ tự xuất hiện + loại */
export function quizQuestions(quiz) {
  const out = [];
  for (const it of quiz?.items || []) {
    if (it.t === "q") out.push({ n: it.n, kind: it.kind });
    if (it.t === "gaptext") for (const n of Object.keys(it.gaps)) out.push({ n: +n, kind: it.gaps[n] });
  }
  return out.sort((a, b) => a.n - b.n);
}

/* ---------------- Đáp án từ file của giáo viên ---------------- */
function cleanAnswer(raw, kind) {
  let s = String(raw || "").trim();
  if (kind === "mcq" || kind === "bank") {
    const m = /^\(?([A-L])\b/.exec(s);
    return m ? [m[1]] : [s];
  }
  if (kind === "choice") return [s.toUpperCase().replace(/\s+/g, " ")];
  if (s.includes("→")) s = s.split("→").pop();
  else if (s.includes("->")) s = s.split("->").pop();
  return s.split(/\s*\/\s*|\s*;\s*/).map((x) => x.replace(/^["“]|["”]$/g, "").trim()).filter(Boolean);
}

/** Đọc bảng đáp án: dòng bắt đầu bằng số câu, ô 2 = đáp án, ô cuối = giải thích (câu tự do: ô cuối = câu mẫu). */
export function parseKeyDoc(lines, quiz) {
  const qs = quizQuestions(quiz);
  const kindOf = new Map(qs.map((q) => [q.n, q.kind]));
  const rows = new Map();
  for (const raw of lines) {
    const cells = raw.split("\t").map((c) => c.trim()).filter(Boolean);
    let m = cells.length ? /^(\d{1,3})[.)]?$/.exec(cells[0]) : null;
    if (m && cells.length >= 2) { rows.set(+m[1], cells.slice(1)); continue; }
    m = /^(\d{1,3})[.)]\s+(.+)$/.exec(cells[0] || "");   // dạng "1. TRUE" mỗi dòng
    if (m && !rows.has(+m[1])) rows.set(+m[1], [m[2], ...cells.slice(1)]);
  }
  const answers = [], why = [], sample = [];
  for (const q of qs) {
    const r = rows.get(q.n) || [];
    if (q.kind === "free") {
      answers.push(["*"]);
      why.push(""); sample.push(r.length ? r[r.length - 1] : "");
    } else {
      answers.push(r.length ? cleanAnswer(r[0], q.kind) : []);
      why.push(r.length > 1 ? r[r.length - 1] : ""); sample.push("");
    }
  }
  return { answers, why, sample, found: qs.filter((q) => rows.has(q.n)).length, total: qs.length };
}

/** Chấm phần tự động; câu tự do (["*"]) để giáo viên chấm. */
export function gradeQuiz(quiz, key, given, isCorrect) {
  const qs = quizQuestions(quiz);
  let raw = 0, auto = 0, free = 0;
  const details = qs.map((q, i) => {
    const alts = key?.[i] || [];
    const g = String(given?.[q.n] ?? "").trim();
    if (q.kind === "free" || alts[0] === "*") { free++; return { n: q.n, kind: "free", given: g, ok: null }; }
    auto++;
    const ok = alts.length ? isCorrect(g, alts) : false;
    if (ok) raw++;
    return { n: q.n, kind: q.kind, given: g, ok, key: alts.join(" / ") };
  });
  return { raw, auto, free, total: qs.length, details };
}
