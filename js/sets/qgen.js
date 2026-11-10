// Bộ sinh câu hỏi chung cho Học phần, Live game và Trò chơi từ vựng.
//  · Nhiều dạng câu, từ dễ đến khó: nghĩa → từ → điền vào câu → chọn chính tả đúng → gõ từ theo định nghĩa / câu.
//  · Đáp án nhiễu "bẫy": cùng từ loại, viết gần giống, cùng chủ đề.
//  · Có gói câu hỏi AI (ai-qgen.js) thì ưu tiên câu AI soạn riêng cho tài liệu.
//  · Độ khó theo từng học sinh: mastery.js ghi lại từ nào em hay sai / đã chắc.
import { shuffle } from "../ui.js";
import { L } from "../i18n.js";
import { meaning } from "../data/vocab.js";

/* ---------- tiện ích chữ ---------- */
export const norm = (s) => String(s || "").toLowerCase().normalize("NFC").trim();
const strip = (s) => norm(s).replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();
export const aiKey = (word) => strip(word);

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 4) return 9;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Từ nhiễu cho `card`, xếp theo độ "bẫy": hard=true thì chọn những từ giống nhất */
export function trapCards(card, pool, n = 3, hard = false) {
  const w = strip(card.word);
  const scored = pool.filter((x) => x.id !== card.id && strip(x.word) !== w && meaning(x) !== meaning(card)).map((x) => {
    const xw = strip(x.word);
    let s = Math.random() * (hard ? 1 : 3);
    if (x.pos && x.pos === card.pos) s += 3;
    if (x.deckId && x.deckId === card.deckId) s += 1;
    const d = lev(xw, w);
    if (d <= 2) s += 3; else if (d <= 4) s += 1.5;
    if (xw.slice(0, 3) === w.slice(0, 3)) s += 1;
    if (xw.slice(-3) === w.slice(-3)) s += 1;
    if (Math.abs(xw.length - w.length) <= 2) s += 0.5;
    return [s, x];
  }).sort((a, b) => b[0] - a[0]);
  const out = [], seen = new Set();
  for (const [, x] of scored) {
    const k = strip(x.word);
    if (seen.has(k)) continue;
    seen.add(k); out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

/* ---------- điền vào câu ví dụ ---------- */
/** Tìm từ trong câu ví dụ (kể cả dạng chia: -s, -ed, -ing, -ies…). Trả { before, form, after } hoặc null */
export function findInSentence(word, sentence) {
  if (!sentence) return null;
  const w = strip(word);
  if (!w) return null;
  const words = w.split(" ");
  const last = words[words.length - 1];
  const stem = last.length > 4 ? last.replace(/(e|y)$/, "") : last;
  const head = words.slice(0, -1).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const re = new RegExp(`\\b(${head ? head + "\\s+" : ""}${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[a-z]{0,4})\\b`, "i");
  const m = sentence.match(re);
  if (!m) return null;
  return { before: sentence.slice(0, m.index), form: m[1], after: sentence.slice(m.index + m[1].length) };
}

/** Từ để hiện làm đáp án: bỏ ghi chú "(...)", lấy vế đầu của "a / b" */
const shown = (w) => String(w).replace(/\([^)]*\)/g, "").split("/")[0].replace(/\s+/g, " ").trim();
const capLike = (form, t) => (/^[A-Z]/.test(form) ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/** Chia từ nhiễu theo đuôi của dạng trong câu, để đáp án không lộ vì "lệch dạng" */
function inflectLike(base, form, target) {
  const b = strip(base), f = strip(form);
  if (f === b || target.includes(" ")) return target;
  const suf = f.startsWith(b) ? f.slice(b.length) : f.endsWith("ies") ? "s" : f.endsWith("ed") ? "ed" : f.endsWith("ing") ? "ing" : f.endsWith("s") ? "s" : "";
  if (!suf) return target;
  const t = target;
  if (suf === "s" || suf === "es") return /(s|x|ch|sh)$/.test(t) ? t + "es" : /[^aeiou]y$/.test(t) ? t.slice(0, -1) + "ies" : t + "s";
  if (suf === "ed" || suf === "d") return t.endsWith("e") ? t + "d" : /[^aeiou]y$/.test(t) ? t.slice(0, -1) + "ied" : t + "ed";
  if (suf === "ing") return t.endsWith("e") && !t.endsWith("ee") ? t.slice(0, -1) + "ing" : t + "ing";
  return target;
}

/* ---------- lỗi chính tả giả ---------- */
export function misspellings(word, n = 3) {
  const w = String(word);
  if (w.length < 4 || w.includes(" ")) return [];
  const out = new Set();
  const vowels = "aeiou";
  const tries = [
    () => w.replace(/([bcdfgklmnprst])\1/, "$1"),                     // bỏ phụ âm đôi
    () => w.replace(/([bcdfgklmnprst])(?!\1)([aeiouy])/, "$1$1$2"),     // thêm phụ âm đôi
    () => { const i = 1 + Math.floor(Math.random() * (w.length - 3)); return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); },   // đảo 2 chữ
    () => w.replace(/[aeiou]/g, (c, i) => (i > 0 && Math.random() < 0.4 ? vowels[(vowels.indexOf(c) + 1 + Math.floor(Math.random() * 3)) % 5] : c)),
    () => w.replace(/ie/, "ei").replace(/ence$/, "ance").replace(/ance$/, "ence").replace(/able$/, "ible"),
    () => w.replace(/ss/, "s").replace(/c(?=[ei])/, "s"),
    () => w.replace(/e$/, ""),
    () => w.replace(/ly$/, "ley").replace(/ful$/, "full"),
  ];
  for (let k = 0; k < 40 && out.size < n; k++) {
    const v = tries[k % tries.length]();
    if (v && v !== w && v[0] === w[0] && v[1] !== v[0] && /^[a-z'-]+$/i.test(v)) out.add(v);
  }
  return [...out].slice(0, n);
}

/* ======================= DẠNG CÂU ======================= */
// Câu hỏi: { kind, level, cardId, card, label, prompt, sub?, options?, answer? (chỉ số), accept? (chuỗi gõ), hint?, explain? }
// level: 0 dễ · 1 vừa · 2 khó · 3 rất khó (gõ)
export const KINDS = {
  mean: L("Chọn nghĩa đúng", "Choose the meaning"),
  meanTrap: L("Chọn nghĩa đúng (đáp án gần nghĩa)", "Choose the exact meaning"),
  word: L("Từ nào mang nghĩa này?", "Which word has this meaning?"),
  cloze: L("Chọn từ điền vào chỗ trống", "Choose the word for the gap"),
  spelling: L("Chọn cách viết đúng", "Choose the correct spelling"),
  defType: L("Đọc định nghĩa, gõ từ", "Read the definition, type the word"),
  clozeType: L("Gõ từ còn thiếu", "Type the missing word"),
  meanType: L("Nhìn nghĩa, gõ từ", "See the meaning, type the word"),
};

const mc = (kind, level, card, prompt, right, wrongs, extra = {}) => {
  const options = shuffle([right, ...wrongs.filter((x) => x && norm(x) !== norm(right))].slice(0, 4));
  return options.length < 2 ? null : { kind, level, cardId: card.id, card, label: KINDS[kind], prompt, options, answer: options.indexOf(right), ...extra };
};

function qMean(card, pool, ai, hard) {
  const traps = hard && ai?.meaningTraps?.length ? ai.meaningTraps : trapCards(card, pool, 3, hard).map(meaning);
  return mc(hard ? "meanTrap" : "mean", hard ? 2 : 0, card, card.word, meaning(card), traps, { sub: card.ipa || "", speak: card.word });
}
function qWord(card, pool, hard) {
  return mc("word", 1, card, meaning(card), card.word, trapCards(card, pool, 3, hard).map((x) => x.word));   // giữ nguyên để khớp đúng từ trong thẻ
}
function qCloze(card, pool, ai, hard) {
  if (ai?.sentence && ai.answer) {
    const wrong = ai.traps?.length >= 2 ? ai.traps : trapCards(card, pool, 3, true).map((x) => capLike(ai.answer, inflectLike(card.word, ai.answer, shown(x.word))));
    return mc("cloze", 2, card, ai.sentence.replace(/_{2,}/, "_____"), ai.answer, wrong, { explain: ai.explain || "" });
  }
  const f = findInSentence(card.word, card.example);
  if (!f) return null;
  const wrong = trapCards(card, pool.filter((x) => !/\b(sb|sth|doing)\b|\.\.\./.test(x.word)), 3, hard).map((x) => capLike(f.form, inflectLike(card.word, f.form, shown(x.word))));
  return mc("cloze", hard ? 2 : 1, card, `${f.before}_____${f.after}`, f.form, wrong);
}
function qSpelling(card) {
  const bad = misspellings(card.word, 3);
  return bad.length >= 2 ? mc("spelling", 2, card, meaning(card), card.word, bad, { sub: L("Cách viết nào đúng?", "Which spelling is correct?") }) : null;
}
function typed(kind, level, card, prompt, accept, extra = {}) {
  return { kind, level, cardId: card.id, card, label: KINDS[kind], prompt, accept, hint: hintOf(accept), ...extra };
}
const hintOf = (w) => String(w).split(" ").map((p) => p[0] + "_".repeat(Math.max(0, p.length - 1))).join(" ");
function qDefType(card) {
  return card.def ? typed("defType", 3, card, card.def, card.word, { sub: meaning(card) === card.def ? "" : "" }) : null;
}
function qClozeType(card, ai) {
  if (ai?.sentence && ai.answer) return typed("clozeType", 3, card, ai.sentence.replace(/_{2,}/, "_____"), ai.answer, { sub: meaning(card), explain: ai.explain || "" });
  const f = findInSentence(card.word, card.example);
  return f ? typed("clozeType", 3, card, `${f.before}_____${f.after}`, f.form, { sub: meaning(card) }) : null;
}
function qMeanType(card) { return typed("meanType", 2, card, meaning(card), card.word); }

/** Các dạng thử theo thứ tự cho từng mức (mức cao thử dạng khó trước, không làm được thì lùi) */
const LADDER = {
  0: ["mean", "word"],
  1: ["word", "cloze", "mean"],
  2: ["cloze", "meanTrap", "spelling", "word"],
  3: ["clozeType", "defType", "cloze", "meanType"],
  4: ["clozeType", "defType", "meanType", "cloze"],
};

/**
 * Sinh một câu hỏi cho `card`.
 * opts: { level 0–4, pool, ai (gói AI của học phần: { [aiKey(word)]: {...} }), typed (cho phép câu gõ), only: ["mc"|"type"] }
 */
export function makeQuestion(card, { level = 0, pool = [], ai = null, typed: allowTyped = true, only = null } = {}) {
  const pack = ai?.[aiKey(card.word)] || null;
  const order = [...(LADDER[Math.max(0, Math.min(4, level))] || LADDER[0])];
  if (level >= 2 && Math.random() < 0.35) order.push(order.shift());   // đổi dạng cho đỡ nhàm
  if (only === "type" && level === 2) order.unshift(...(Math.random() < 0.6 ? ["clozeType", "defType"] : []));   // câu gõ mức khó: hay hỏi điền vào câu
  const build = {
    mean: () => qMean(card, pool, pack, false),
    meanTrap: () => qMean(card, pool, pack, true),
    word: () => qWord(card, pool, level >= 2),
    cloze: () => qCloze(card, pool, pack, level >= 2),
    spelling: () => qSpelling(card),
    clozeType: () => qClozeType(card, pack),
    defType: () => qDefType(card),
    meanType: () => qMeanType(card),
  };
  const isType = (k) => ["clozeType", "defType", "meanType"].includes(k);
  for (const k of [...order, "word", "mean"]) {
    if (isType(k) && (!allowTyped || only === "mc")) continue;
    if (!isType(k) && only === "type") continue;
    const q = build[k]();
    if (q) return q;
  }
  return only === "type" ? qMeanType(card) : qMean(card, pool, pack, false);
}

/* ======================= CHẤM CÂU GÕ ======================= */
function variants(text) {
  const out = new Set([strip(text)]);
  String(text).split(/\s*[\/;]\s*/).forEach((p) => { const v = strip(p); if (v) out.add(v); });
  return out;
}
/** "ok" đúng · "close" sai 1 chữ (gõ nhầm) · "bad" */
export function checkTyped(input, expected) {
  const x = strip(input);
  if (!x) return "bad";
  const vs = variants(expected);
  if (vs.has(x)) return "ok";
  for (const v of vs) if (v.length >= 5 && lev(x, v) === 1) return "close";
  return "bad";
}
