// Dữ liệu học phần (study set) và nền tảng thời gian thực cho live game.
// Có Firebase thì dùng Firestore; chưa cấu hình (chế độ thử) thì lưu localStorage,
// live game chạy được giữa các tab của cùng một trình duyệt (BroadcastChannel).
import { initFirebase, isConfigured } from "../firebase.js";

const clean = (o) => JSON.parse(JSON.stringify(o));

/* ===================== Học phần ===================== */
const SETS_KEY = "ielts:studysets";
const readLocal = () => { try { return JSON.parse(localStorage.getItem(SETS_KEY) || "[]"); } catch { return []; } };
const writeLocal = (list) => localStorage.setItem(SETS_KEY, JSON.stringify(list));
const useLocal = (user) => !isConfigured || !user || user.uid?.startsWith("demo-");

export const MAX_CARDS = 500;

/** Học phần của tôi, mới sửa trước */
export async function listMySets(user) {
  if (useLocal(user)) return readLocal().filter((s) => s.ownerUid === user.uid).sort((a, b) => b.updatedAt - a.updatedAt);
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "studySets"), dbMod.where("ownerUid", "==", user.uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Học phần giáo viên chia sẻ cho cả web */
export async function listTeacherSets(user) {
  if (useLocal(user)) return readLocal().filter((s) => s.byTeacher && s.shared).sort((a, b) => b.updatedAt - a.updatedAt);
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "studySets"),
    dbMod.where("byTeacher", "==", true), dbMod.where("shared", "==", true)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSet(user, id) {
  if (useLocal(user)) return readLocal().find((s) => s.id === id) || null;
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "studySets", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Tạo hoặc sửa; trả về id. set.cards = [{ t, d }] */
export async function saveSet(user, set, { teacher = false } = {}) {
  const cards = set.cards.filter((c) => c.t.trim() && c.d.trim()).slice(0, MAX_CARDS).map((c) => ({ t: c.t.trim(), d: c.d.trim() }));
  const body = {
    title: set.title.trim().slice(0, 120), desc: (set.desc || "").trim().slice(0, 300), cards, count: cards.length,
    shared: !!set.shared, byTeacher: !!teacher && !!set.shared,
    ownerUid: user.uid, ownerName: user.displayName || "", updatedAt: Date.now(),
  };
  if (useLocal(user)) {
    const list = readLocal();
    const id = set.id || "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const i = list.findIndex((s) => s.id === id);
    const rec = { ...(i >= 0 ? list[i] : { createdAt: Date.now() }), ...body, id };
    if (i >= 0) list[i] = rec; else list.push(rec);
    writeLocal(list);
    return id;
  }
  const { db, dbMod } = await initFirebase();
  if (set.id) {
    await dbMod.setDoc(dbMod.doc(db, "studySets", set.id), clean({ ...body, createdAt: set.createdAt || Date.now() }));
    return set.id;
  }
  const ref = await dbMod.addDoc(dbMod.collection(db, "studySets"), clean({ ...body, createdAt: Date.now() }));
  return ref.id;
}

export async function deleteSet(user, id) {
  if (useLocal(user)) { writeLocal(readLocal().filter((s) => s.id !== id)); return; }
  const { db, dbMod } = await initFirebase();
  await dbMod.deleteDoc(dbMod.doc(db, "studySets", id));
}

/* ===================== CSDL thời gian thực cho live game ===================== */
// Đường dẫn dạng "liveGames/123456" (tài liệu) hoặc "liveGames/123456/players" (bộ sưu tập).
const LOCAL_DB = "ielts:livedb";
const readDb = () => { try { return JSON.parse(localStorage.getItem(LOCAL_DB) || "{}"); } catch { return {}; } };
const bus = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("ielts-live") : null;
const subs = new Set();   // { path, col, cb }

function notify() {
  const db = readDb();
  for (const s of subs) {
    if (s.col) {
      const pre = s.path + "/";
      s.cb(Object.keys(db).filter((k) => k.startsWith(pre) && !k.slice(pre.length).includes("/"))
        .map((k) => ({ id: k.slice(pre.length), ...db[k] })));
    } else s.cb(db[s.path] ? { ...db[s.path] } : null);
  }
}
bus?.addEventListener("message", () => notify());
window.addEventListener("storage", (e) => { if (e.key === LOCAL_DB) notify(); });

function localMutate(fn) {
  const db = readDb();
  fn(db);
  localStorage.setItem(LOCAL_DB, JSON.stringify(db));
  bus?.postMessage(1);
  notify();
}

const segs = (p) => p.split("/");

export const liveDb = {
  async get(path) {
    if (!isConfigured) return readDb()[path] || null;
    const { db, dbMod } = await initFirebase();
    const snap = await dbMod.getDoc(dbMod.doc(db, ...segs(path)));
    return snap.exists() ? snap.data() : null;
  },
  async set(path, data) {
    if (!isConfigured) return localMutate((db) => { db[path] = clean(data); });
    const { db, dbMod } = await initFirebase();
    await dbMod.setDoc(dbMod.doc(db, ...segs(path)), clean(data));
  },
  async update(path, patch) {
    if (!isConfigured) return localMutate((db) => { db[path] = { ...(db[path] || {}), ...clean(patch) }; });
    const { db, dbMod } = await initFirebase();
    await dbMod.updateDoc(dbMod.doc(db, ...segs(path)), clean(patch));
  },
  async del(path) {
    if (!isConfigured) return localMutate((db) => { for (const k of Object.keys(db)) if (k === path || k.startsWith(path + "/")) delete db[k]; });
    const { db, dbMod } = await initFirebase();
    await dbMod.deleteDoc(dbMod.doc(db, ...segs(path)));
  },
  /** Ghi nhiều tài liệu một lần: [[path, patch], …] */
  async updateMany(list) {
    if (!list.length) return;
    if (!isConfigured) return localMutate((db) => { for (const [p, patch] of list) db[p] = { ...(db[p] || {}), ...clean(patch) }; });
    const { db, dbMod } = await initFirebase();
    for (let i = 0; i < list.length; i += 400) {
      const b = dbMod.writeBatch(db);
      list.slice(i, i + 400).forEach(([p, patch]) => b.update(dbMod.doc(db, ...segs(p)), clean(patch)));
      await b.commit();
    }
  },
  /** Theo dõi một tài liệu; cb(data|null). Trả về hàm huỷ. */
  watch(path, cb) {
    if (!isConfigured) {
      const s = { path, col: false, cb };
      subs.add(s);
      queueMicrotask(() => cb(readDb()[path] ? { ...readDb()[path] } : null));
      return () => subs.delete(s);
    }
    let off = () => {}, dead = false;
    initFirebase().then(({ db, dbMod }) => {
      if (dead) return;
      off = dbMod.onSnapshot(dbMod.doc(db, ...segs(path)), (snap) => cb(snap.exists() ? snap.data() : null), (err) => console.warn("watch", path, err));
    });
    return () => { dead = true; off(); };
  },
  /** Theo dõi một bộ sưu tập; cb([{id, …}]) */
  watchCol(path, cb) {
    if (!isConfigured) {
      const s = { path, col: true, cb };
      subs.add(s);
      queueMicrotask(notify);
      return () => subs.delete(s);
    }
    let off = () => {}, dead = false;
    initFirebase().then(({ db, dbMod }) => {
      if (dead) return;
      off = dbMod.onSnapshot(dbMod.collection(db, ...segs(path)), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.warn("watchCol", path, err));
    });
    return () => { dead = true; off(); };
  },
};
