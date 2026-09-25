// =====================================================================
//  LỚP HỌC — lưu trữ lớp, mã lớp và thành viên
//  Firestore:
//    classes/{id}              lớp: tên, phần/khoá, mã, đang mở cho vào, đã lưu trữ
//    classCodes/{MÃ}           mã lớp -> id lớp (học sinh tra đúng một mã, không liệt kê được)
//    classMembers/{id}_{uid}   học sinh thuộc lớp (tự tạo khi nhập đúng mã)
//  Bài tập (assignments) có trường classId — học sinh chỉ đọc được bài của lớp mình.
//  Chưa cấu hình Firebase (chế độ thử) → lưu localStorage.
// =====================================================================
import { initFirebase, isConfigured } from "../firebase.js";

const LS = { c: "ielts:cls:classes", m: "ielts:cls:members", a: "ielts:hw:assignments" };
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const toDate = (v) => (!v ? null : v.toDate ? v.toDate() : new Date(v));
const memId = (cid, uid) => `${cid}_${uid}`;

// Bỏ các ký tự dễ nhầm (0/O, 1/I/L) để học sinh gõ mã không sai
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const normCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
function genCode() {
  const buf = crypto.getRandomValues(new Uint8Array(6));
  return [...buf].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

function normClass(id, d) {
  return { id, ...d, createdAt: toDate(d.createdAt), archived: !!d.archived, joinOpen: d.joinOpen !== false };
}

/* ---------------- Lớp của tôi (học sinh) — nhớ lại để ẩn / hiện Homework ---------------- */
let mine = [];
export const myClasses = () => mine;
export const hasClass = () => mine.length > 0;

export async function loadMyClasses(user) {
  mine = user ? await listMyClasses(user.uid).catch((e) => { console.warn(e); return []; }) : [];
  return mine;
}

async function listMyClasses(uid) {
  if (!isConfigured) {
    const cls = lsGet(LS.c, {});
    return Object.values(lsGet(LS.m, {})).filter((m) => m.uid === uid && cls[m.classId])
      .map((m) => normClass(m.classId, cls[m.classId]));
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "classMembers"), dbMod.where("uid", "==", uid)));
  const out = await Promise.all(snap.docs.map(async (d) => {
    const c = await dbMod.getDoc(dbMod.doc(db, "classes", d.data().classId)).catch(() => null);
    return c?.exists() ? normClass(c.id, c.data()) : null;
  }));
  return out.filter(Boolean);
}

/* ---------------- Giáo viên ---------------- */
export async function listAllClasses() {
  if (!isConfigured) return Object.entries(lsGet(LS.c, {})).map(([id, c]) => normClass(id, c)).sort((a, b) => b.createdAt - a.createdAt);
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.collection(db, "classes"));
  return snap.docs.map((d) => normClass(d.id, d.data())).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getClass(id) {
  if (!isConfigured) { const c = lsGet(LS.c, {})[id]; return c ? normClass(id, c) : null; }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "classes", id));
  return snap.exists() ? normClass(snap.id, snap.data()) : null;
}

/** Tìm một mã chưa ai dùng */
async function freshCode() {
  for (let i = 0; i < 8; i++) {
    const code = genCode();
    if (!(await lookupCode(code))) return code;
  }
  throw new Error("Không tạo được mã lớp, thử lại.");
}

export async function createClass({ name, section }, user) {
  const code = await freshCode();
  const body = { name, section: section || "", code, joinOpen: true, archived: false,
    teacherName: user?.displayName || "", createdBy: user?.email || "" };
  if (!isConfigured) {
    const all = lsGet(LS.c, {});
    const id = `cl${Date.now().toString(36)}`;
    all[id] = { ...body, createdAt: new Date().toISOString() };
    lsSet(LS.c, all);
    return id;
  }
  const { db, dbMod } = await initFirebase();
  const ref = dbMod.doc(dbMod.collection(db, "classes"));
  const batch = dbMod.writeBatch(db);
  batch.set(ref, { ...body, createdAt: dbMod.serverTimestamp() });
  batch.set(dbMod.doc(db, "classCodes", code), { classId: ref.id, name, teacherName: body.teacherName });
  await batch.commit();
  return ref.id;
}

/** patch: { name, section, joinOpen, archived } */
export async function updateClass(cls, patch) {
  if (!isConfigured) {
    const all = lsGet(LS.c, {});
    all[cls.id] = { ...all[cls.id], ...patch };
    lsSet(LS.c, all);
    return;
  }
  const { db, dbMod } = await initFirebase();
  const batch = dbMod.writeBatch(db);
  batch.update(dbMod.doc(db, "classes", cls.id), patch);
  if (patch.name) batch.set(dbMod.doc(db, "classCodes", cls.code), { name: patch.name }, { merge: true });
  await batch.commit();
}

/** Đặt mã mới — mã cũ hết dùng được (học sinh đã vào lớp vẫn ở lại) */
export async function resetCode(cls) {
  const code = await freshCode();
  if (!isConfigured) {
    const all = lsGet(LS.c, {});
    all[cls.id] = { ...all[cls.id], code };
    lsSet(LS.c, all);
    return code;
  }
  const { db, dbMod } = await initFirebase();
  const batch = dbMod.writeBatch(db);
  batch.update(dbMod.doc(db, "classes", cls.id), { code });
  batch.set(dbMod.doc(db, "classCodes", code), { classId: cls.id, name: cls.name, teacherName: cls.teacherName || "" });
  if (cls.code) batch.delete(dbMod.doc(db, "classCodes", cls.code));
  await batch.commit();
  return code;
}

export async function listMembers(cid) {
  if (!isConfigured) {
    return Object.values(lsGet(LS.m, {})).filter((m) => m.classId === cid).map((m) => ({ ...m, joinedAt: toDate(m.joinedAt) }));
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "classMembers"), dbMod.where("classId", "==", cid)));
  return snap.docs.map((d) => ({ ...d.data(), joinedAt: toDate(d.data().joinedAt) }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
}

/** Số học sinh từng lớp (giáo viên) */
export async function countMembers() {
  const rows = !isConfigured ? Object.values(lsGet(LS.m, {}))
    : await (async () => {
      const { db, dbMod } = await initFirebase();
      return (await dbMod.getDocs(dbMod.collection(db, "classMembers"))).docs.map((d) => d.data());
    })();
  const m = new Map();
  for (const r of rows) m.set(r.classId, (m.get(r.classId) || 0) + 1);
  return m;
}

/** Giáo viên xoá học sinh khỏi lớp, hoặc học sinh tự rời lớp */
export async function removeMember(cid, uid) {
  if (!isConfigured) {
    const all = lsGet(LS.m, {});
    delete all[memId(cid, uid)];
    lsSet(LS.m, all);
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.deleteDoc(dbMod.doc(db, "classMembers", memId(cid, uid)));
}

/* ---------------- Học sinh vào lớp ---------------- */
/** Tra mã: { classId, name, teacherName } hoặc null */
export async function lookupCode(code) {
  code = normCode(code);
  if (code.length < 5) return null;
  if (!isConfigured) {
    const hit = Object.entries(lsGet(LS.c, {})).find(([, c]) => c.code === code);
    return hit ? { classId: hit[0], name: hit[1].name, teacherName: hit[1].teacherName || "" } : null;
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "classCodes", code));
  return snap.exists() ? snap.data() : null;
}

/**
 * Vào lớp bằng mã. Trả về { cls, already } — lỗi có err.code:
 * "bad-code" (sai mã) · "closed" (lớp đã khoá / lưu trữ)
 */
export async function joinClass(code, user) {
  code = normCode(code);
  const hit = await lookupCode(code);
  if (!hit) throw Object.assign(new Error("bad-code"), { code: "bad-code" });
  const cid = hit.classId;
  if (mine.some((c) => c.id === cid)) return { cls: mine.find((c) => c.id === cid), already: true };
  const rec = { classId: cid, uid: user.uid, code, name: user.displayName || "", email: user.email || "", photoURL: user.photoURL || "" };
  if (!isConfigured) {
    const c = lsGet(LS.c, {})[cid];
    if (!c || c.joinOpen === false || c.archived) throw Object.assign(new Error("closed"), { code: "closed" });
    const all = lsGet(LS.m, {});
    all[memId(cid, user.uid)] = { ...rec, joinedAt: new Date().toISOString() };
    lsSet(LS.m, all);
  } else {
    const { db, dbMod } = await initFirebase();
    try {
      await dbMod.setDoc(dbMod.doc(db, "classMembers", memId(cid, user.uid)), { ...rec, joinedAt: dbMod.serverTimestamp() });
    } catch (err) {
      // luật Firestore từ chối khi lớp đã khoá hoặc lưu trữ
      if (err.code === "permission-denied") throw Object.assign(new Error("closed"), { code: "closed" });
      throw err;
    }
  }
  await loadMyClasses(user);
  return { cls: mine.find((c) => c.id === cid) || { id: cid, name: hit.name }, already: false };
}

/* ---------------- Bài tập cũ chưa thuộc lớp nào ---------------- */
export async function orphanAssignments() {
  if (!isConfigured) return lsGet(LS.a, []).filter((a) => !a.classId).map((a) => a.id);
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.collection(db, "assignments"));
  return snap.docs.filter((d) => !d.data().classId).map((d) => d.id);
}

/** Gắn các bài tập cũ vào một lớp */
export async function adoptAssignments(ids, cid) {
  if (!isConfigured) {
    lsSet(LS.a, lsGet(LS.a, []).map((a) => (ids.includes(a.id) ? { ...a, classId: cid } : a)));
    return;
  }
  const { db, dbMod } = await initFirebase();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = dbMod.writeBatch(db);
    for (const id of ids.slice(i, i + 400)) batch.update(dbMod.doc(db, "assignments", id), { classId: cid });
    await batch.commit();
  }
}
