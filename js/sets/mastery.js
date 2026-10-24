// Độ thành thạo từng thẻ của học sinh (lưu trên máy): quyết định câu hỏi dễ hay khó.
// Thẻ thuộc bộ từ có sẵn còn lấy thêm lịch ôn SRS (khoảng cách ôn càng dài → câu càng khó).
import { cardState } from "../vocab/progress.js";

const KEY = "ielts:mastery";
let cache = null;
const load = () => { if (!cache) { try { cache = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { cache = {}; } } return cache; };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* đầy bộ nhớ: bỏ qua */ } };

const keyOf = (card) => (card.deckId ? card.id : `w:${String(card.word).toLowerCase().trim()}`);

/** Mức 0–4 */
export function levelOf(card) {
  const m = load()[keyOf(card)];
  let lv = m ? m.lv : 0;
  const s = card.deckId ? cardState(card.id) : null;
  if (s) {
    const srs = s.interval >= 21 ? 4 : s.interval >= 10 ? 3 : s.interval >= 3 ? 2 : s.interval >= 1 ? 1 : 0;
    lv = Math.max(lv, srs - Math.min(2, s.lapses || 0));
  }
  return Math.max(0, Math.min(4, lv));
}

export const missesOf = (card) => load()[keyOf(card)]?.miss || 0;

/** Ghi kết quả: đúng lên 1 mức (câu khó mức ≥2 đúng ngay thì lên thẳng), sai xuống 1–2 mức */
export function record(card, ok, qLevel = 0) {
  const all = load();
  const k = keyOf(card);
  const m = all[k] || { lv: levelOf(card), miss: 0, hit: 0 };
  if (ok) { m.hit++; m.lv = Math.min(4, Math.max(m.lv + 1, qLevel + 1)); }
  else { m.miss++; m.lv = Math.max(0, m.lv - (qLevel >= 2 ? 1 : 2)); }
  m.t = Date.now();
  all[k] = m;
  save();
  return m.lv;
}

/** Chọn n thẻ, ưu tiên thẻ hay sai và chưa chắc */
export function pickAdaptive(cards, n) {
  const w = cards.map((c) => [Math.random() * (1 + missesOf(c) * 1.5 + (4 - levelOf(c))), c]);
  return w.sort((a, b) => b[0] - a[0]).slice(0, n).map(([, c]) => c);
}
