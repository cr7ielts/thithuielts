// =====================================================================
//  Tiến độ học từ vựng: lịch ôn ngắt quãng (SRS), sổ từ, XP, chuỗi ngày
//  Lưu trong localStorage theo từng tài khoản; nếu có Firebase thì
//  đồng bộ thêm lên Firestore (xem store.js: loadVocabCloud/saveVocabCloud).
// =====================================================================
import { ALL_WORDS, getWord } from "../data/vocab.js";
import { loadVocabCloud, saveVocabCloud, updateLeaderboard } from "../store.js";
import { L } from "../i18n.js";

const DAY = 24 * 60 * 60 * 1000;
export const NEW_PER_SESSION = 10;

let uid = null;
let user = null;
let state = null;
let saveTimer = null;
const listeners = new Set();

const empty = () => ({
  srs: {},           // { [wordId]: { ease, interval, reps, lapses, due, last } }
  saved: [],         // wordId[]
  xp: 0,
  streak: { count: 0, last: null },
  today: { date: null, reviewed: 0, xp: 0 },
  best: {},          // { [gameId]: điểm cao nhất }
  updatedAt: 0,
});

const key = () => `ielts:vocab:${uid || "anon"}`;
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ---------------- tải / lưu ---------------- */
export async function initProgress(u) {
  user = u;
  uid = u?.uid || null;
  try { state = { ...empty(), ...JSON.parse(localStorage.getItem(key()) || "{}") }; }
  catch { state = empty(); }

  // Firebase: lấy bản mới hơn giữa máy và cloud
  try {
    const cloud = await loadVocabCloud(uid);
    if (cloud && (cloud.updatedAt || 0) > (state.updatedAt || 0)) {
      state = { ...empty(), ...cloud };
      writeLocal();
    }
  } catch (e) { console.warn("Không đọc được tiến độ từ vựng trên cloud:", e); }

  rollDay();
  emit();
}

function writeLocal() {
  try { localStorage.setItem(key(), JSON.stringify(state)); } catch { /* đầy bộ nhớ */ }
}

function persist() {
  state.updatedAt = Date.now();
  writeLocal();
  emit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveVocabCloud(uid, state).catch((e) => console.warn(e));
    updateLeaderboard(user, { xp: state.xp, level: levelOf(state.xp).level, streak: state.streak.count })
      .catch((e) => console.warn(e));
  }, 1500);
}

export function onProgress(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn(state); }

function rollDay() {
  const t = todayStr();
  if (state.today.date !== t) state.today = { date: t, reviewed: 0, xp: 0 };
}

/* ---------------- XP, cấp độ, chuỗi ngày ---------------- */
export function levelOf(xp) {
  // Cấp n cần 50·(n-1)² XP: 0, 50, 200, 450, 800…
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const from = 50 * (level - 1) ** 2;
  const to = 50 * level ** 2;
  return { level, from, to, pct: Math.round(((xp - from) / (to - from)) * 100) };
}

export function addXP(n) {
  if (!n) return;
  rollDay();
  state.xp += n;
  state.today.xp += n;
  touchStreak();
  persist();
}

function touchStreak() {
  const t = todayStr();
  if (state.streak.last === t) return;
  const y = todayStr(new Date(Date.now() - DAY));
  state.streak = { count: state.streak.last === y ? state.streak.count + 1 : 1, last: t };
}

export function getStats() {
  rollDay();
  const y = todayStr(new Date(Date.now() - DAY));
  const alive = state.streak.last === todayStr() || state.streak.last === y;
  return {
    xp: state.xp,
    ...levelOf(state.xp),
    streak: alive ? state.streak.count : 0,
    doneToday: state.streak.last === todayStr(),
    reviewedToday: state.today.reviewed,
    xpToday: state.today.xp,
    learned: Object.keys(state.srs).length,
    mastered: Object.values(state.srs).filter((s) => s.interval >= 21).length,
    due: dueIds().length,
    saved: state.saved.length,
  };
}

/* ---------------- Sổ từ ---------------- */
export const isSaved = (id) => state.saved.includes(id);
export function toggleSaved(id) {
  state.saved = isSaved(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id];
  persist();
  return isSaved(id);
}
export const savedWords = () => state.saved.map(getWord).filter(Boolean);

/* ---------------- Lịch ôn ngắt quãng (SM-2 rút gọn) ---------------- */
// grade: 0 = Quên, 1 = Khó, 2 = Nhớ, 3 = Dễ
export function cardState(id) { return state.srs[id] || null; }

export function dueIds(now = Date.now()) {
  return Object.entries(state.srs).filter(([, s]) => s.due <= now).map(([id]) => id);
}

export function wordStatus(id) {
  const s = state.srs[id];
  if (!s) return "new";
  if (s.due <= Date.now()) return "due";
  return s.interval >= 21 ? "mastered" : "learning";
}

export function schedule(s, grade) {
  const cur = s || { ease: 2.5, interval: 0, reps: 0, lapses: 0 };
  let { ease, interval, reps, lapses } = cur;
  let dueIn;

  if (grade === 0) {
    reps = 0; lapses += 1; ease = Math.max(1.3, ease - 0.2); interval = 0;
    dueIn = 60 * 1000;                                 // 1 phút sau hỏi lại
  } else if (grade === 1) {
    ease = Math.max(1.3, ease - 0.15);
    if (reps === 0) {
      interval = 0; dueIn = 10 * 60 * 1000;            // từ mới thấy khó: 10 phút sau hỏi lại
    } else {
      interval = Math.max(1, Math.round(interval * 1.2)); reps += 1;
      dueIn = interval * DAY;
    }
  } else if (grade === 2) {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
    reps += 1;
    dueIn = interval * DAY;
  } else {
    interval = reps === 0 ? 4 : Math.round(Math.max(interval, 1) * ease * 1.3);
    ease += 0.15; reps += 1;
    dueIn = interval * DAY;
  }
  return { ease: +ease.toFixed(2), interval, reps, lapses, due: Date.now() + dueIn, last: Date.now() };
}

export function previewLabel(id, grade) {
  const next = schedule(state.srs[id], grade);
  const ms = next.due - Date.now();
  if (ms < 2 * 60 * 1000) return L("< 1 phút", "< 1 min");
  if (ms < 60 * 60 * 1000) return L(`${Math.round(ms / 60000)} phút`, `${Math.round(ms / 60000)} min`);
  if (ms < DAY) return L(`${Math.round(ms / 3600000)} giờ`, `${Math.round(ms / 3600000)} h`);
  const d = Math.round(ms / DAY);
  if (d < 30) return L(`${d} ngày`, d === 1 ? "1 day" : `${d} days`);
  const m = Math.round(d / 30);
  return m < 12 ? L(`${m} tháng`, `${m} mo`) : L(`${(d / 365).toFixed(1)} năm`, `${(d / 365).toFixed(1)} yr`);
}

export function grade(id, g) {
  rollDay();
  state.srs[id] = schedule(state.srs[id], g);
  state.today.reviewed += 1;
  const xp = [0, 1, 2, 3][g];
  state.xp += xp;
  state.today.xp += xp;
  touchStreak();
  persist();
  return state.srs[id];
}

/** Tạo hàng đợi ôn: từ đến hạn trước, rồi thêm tối đa `newLimit` từ mới. */
export function buildQueue(words, { newLimit = NEW_PER_SESSION, includeNew = true } = {}) {
  const now = Date.now();
  const due = words.filter((w) => state.srs[w.id] && state.srs[w.id].due <= now)
    .sort((a, b) => state.srs[a.id].due - state.srs[b.id].due);
  const fresh = includeNew ? words.filter((w) => !state.srs[w.id]).slice(0, newLimit) : [];
  return [...due, ...fresh];
}

export function deckProgress(deck) {
  const n = deck.words.length;
  let learned = 0, due = 0, mastered = 0;
  for (const w of deck.words) {
    const s = state.srs[w.id];
    if (!s) continue;
    learned++;
    if (s.due <= Date.now()) due++;
    if (s.interval >= 21) mastered++;
  }
  return { total: n, learned, due, mastered, pct: Math.round((learned / n) * 100) };
}

/* ---------------- Điểm trò chơi ---------------- */
export function recordGame(gameId, score) {
  const prev = state.best[gameId] || 0;
  const isBest = score > prev;
  if (isBest) state.best[gameId] = score;
  const xp = Math.max(1, Math.round(score / 10));
  addXP(xp); // addXP đã gọi persist()
  return { isBest, best: Math.max(prev, score), xp };
}
export const bestScore = (gameId) => state.best[gameId] || 0;

/** Từ dùng cho trò chơi: sổ từ / từ đang học / cả bộ */
export function poolFor(source) {
  if (source === "saved") return savedWords();
  if (source === "learning") return Object.keys(state.srs).map(getWord).filter(Boolean);
  if (source && source !== "all") return ALL_WORDS.filter((w) => w.deckId === source);
  return ALL_WORDS;
}
