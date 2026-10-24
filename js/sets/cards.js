// Học phần dưới dạng danh sách thẻ + hàm dựng câu hỏi dùng chung cho các chế độ học và live game.
import { DECKS, getDeck, meaning } from "../data/vocab.js";
import { savedWords, poolFor } from "../vocab/progress.js";
import { shuffle } from "../ui.js";
import { L } from "../i18n.js";
import { getSet } from "./store.js";
import { makeQuestion } from "./qgen.js";

/** ref: "my:<id>" (học phần tự tạo) · "deck:<id>" (bộ từ có sẵn) · "saved" · "learning" */
export const refOf = (kind, id) => (id ? `${kind}:${id}` : kind);
export const parseRef = (ref) => { const i = ref.indexOf(":"); return i < 0 ? [ref, ""] : [ref.slice(0, i), ref.slice(i + 1)]; };

/** Thẻ chuẩn hoá: { id, word, vi, def, ipa, example } — giống từ trong js/data/vocab.js */
export function fromSet(set) {
  return set.cards.map((c, i) => ({ id: `${set.id}:${i}`, word: c.t, vi: c.d, def: "", ipa: "", example: "" }));
}

/** Trả về { ref, title, sub, cards, editable, set } hoặc null nếu không có */
export async function resolveSet(user, ref) {
  const [kind, id] = parseRef(ref);
  if (kind === "my" || kind === "set") {
    const set = await getSet(user, id);
    if (!set) return null;
    return {
      ref, title: set.title, sub: set.ownerName ? L(`Của ${set.ownerName}`, `By ${set.ownerName}`) : "",
      cards: fromSet(set), editable: set.ownerUid === user.uid, set,
    };
  }
  if (kind === "deck") {
    const d = getDeck(id);
    return d ? { ref, title: d.title, sub: d.sub, cards: d.words, editable: false } : null;
  }
  if (kind === "saved") return { ref, title: L("Sổ từ của tôi", "My word bank"), sub: "", cards: savedWords(), editable: false };
  if (kind === "learning") return { ref, title: L("Từ đang học", "Words in progress"), sub: "", cards: poolFor("learning"), editable: false };
  return null;
}

export { DECKS };

/* ---------- Mặt thẻ ---------- */
// dir "wd": nhìn từ, trả lời nghĩa · dir "dw": nhìn nghĩa, trả lời từ
export const front = (c, dir) => (dir === "dw" ? meaning(c) : c.word);
export const back = (c, dir) => (dir === "dw" ? c.word : meaning(c));
export const clip = (s, n = 110) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/* ---------- Chấm câu gõ ---------- */
const strip = (s) => s.toLowerCase().normalize("NFC").replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();
/** Các đáp án chấp nhận được: cả chuỗi, hoặc từng phần tách bởi "/" ";" */
function variants(text) {
  const out = new Set([strip(text)]);
  text.split(/\s*[\/;]\s*/).forEach((p) => { const v = strip(p); if (v) out.add(v); });
  return out;
}
export function isCorrect(input, expected) {
  const x = strip(input);
  return !!x && variants(expected).has(x);
}

/* ---------- Câu hỏi trắc nghiệm ---------- */
/** Chọn tối đa n-1 đáp án nhiễu khác nội dung với đáp án đúng */
export function distractors(card, pool, dir, n = 3) {
  const right = back(card, dir);
  const seen = new Set([right]);
  const out = [];
  const same = shuffle(pool.filter((w) => w.id !== card.id && w.pos && w.pos === card.pos));
  const rest = shuffle(pool.filter((w) => w.id !== card.id));
  for (const w of [...same.slice(0, 6), ...rest]) {
    const t = back(w, dir);
    if (seen.has(t)) continue;
    seen.add(t); out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

/** { card, dir, prompt, options, answer (chỉ số đúng) } */
export function makeMC(card, pool, dir = "wd", n = 4) {
  const right = back(card, dir);
  const opts = shuffle([right, ...distractors(card, pool, dir, n - 1)]);
  return { card, dir, prompt: front(card, dir), options: opts, answer: opts.indexOf(right) };
}

/**
 * Câu hỏi cho live game: { qs: [{ p, o, w, k }], key: [chỉ số đúng] } — key chỉ gửi cho giáo viên.
 * level: 0 dễ · 1 vừa · 2 khó · "ramp" tăng dần từ dễ đến khó. ai: gói câu hỏi AI của học phần.
 */
export function buildLiveQuestions(cards, count, { level = 1, ai = null } = {}) {
  const picked = shuffle(cards).slice(0, count);
  const qs = [], key = [];
  picked.forEach((c, i) => {
    const lv = level === "ramp" ? Math.min(2, Math.floor((i / Math.max(1, picked.length)) * 3)) : +level;
    const q = makeQuestion(c, { level: lv, pool: cards, ai, only: "mc" });
    qs.push({ p: clip(q.prompt, 160), o: q.options.map((o) => clip(o, 90)), w: c.word, k: q.label });
    key.push(q.answer);
  });
  return { qs, key };
}

/* ---------- Thẻ gắn sao (lưu theo máy) ---------- */
const STAR_KEY = "ielts:sets:stars";
const readStars = () => { try { return JSON.parse(localStorage.getItem(STAR_KEY) || "{}"); } catch { return {}; } };
export const starredIds = (ref) => new Set(readStars()[ref] || []);
export function toggleStar(ref, id) {
  const all = readStars();
  const set = new Set(all[ref] || []);
  if (set.has(id)) set.delete(id); else set.add(id);
  all[ref] = [...set];
  try { localStorage.setItem(STAR_KEY, JSON.stringify(all)); } catch { /* bỏ qua */ }
  return set.has(id);
}
