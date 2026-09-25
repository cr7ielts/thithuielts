// =====================================================================
//  LỚP HỌC — lưu trữ lớp, mã lớp và thành viên
//  Firestore:
//    classes/{id}              lớp: tên, phần/khoá, mã, đang mở cho vào, đã lưu trữ
//    classCodes/{MÃ}           mã lớp -> id lớp (học sinh tra đúng một mã, không liệt kê được)
//    classMembers/{id}_{uid}   học sinh thuộc lớp (tự tạo khi nhập đúng mã)
//                              status "pending" = chờ giáo viên duyệt · "active" (hoặc không có) = đã vào lớp
//  Storage: classes/{id}/avatar-…  ảnh đại diện lớp
//  Bài tập (assignments) có trường classId — học sinh chỉ đọc được bài của lớp mình.
//  Chưa cấu hình Firebase (chế độ thử) → lưu localStorage.
// =====================================================================
import { initFirebase, isConfigured } from "../firebase.js";
import { DEFAULT_THEME } from "./themes.js";

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
  return { id, ...d, createdAt: toDate(d.createdAt), archived: !!d.archived, joinOpen: d.joinOpen !== false,
    requireApproval: d.requireApproval !== false };   // mặc định: giáo viên duyệt học sinh mới
}
const isActive = (m) => (m.status || "active") === "active";

/* ---------------- Lớp của tôi (học sinh) — nhớ lại để ẩn / hiện Homework ---------------- */
let mine = [];      // lớp đã được duyệt
let waiting = [];   // lớp đang chờ giáo viên duyệt: { id, name, teacherName }
export const myClasses = () => mine;
export const myPending = () => waiting;
export const hasClass = () => mine.length > 0;

export async function loadMyClasses(user) {
  const { active, pending } = user ? await listMyClasses(user.uid).catch((e) => { console.warn(e); return { active: [], pending: [] }; })
    : { active: [], pending: [] };
  mine = active; waiting = pending;
  return mine;
}

async function listMyClasses(uid) {
  const pendingOf = (m) => ({ id: m.classId, name: m.className || "", teacherName: m.teacherName || "", pending: true });
  if (!isConfigured) {
    const cls = lsGet(LS.c, {});
    const ms = Object.values(lsGet(LS.m, {})).filter((m) => m.uid === uid && cls[m.classId]);
    return { active: ms.filter(isActive).map((m) => normClass(m.classId, cls[m.classId])),
      pending: ms.filter((m) => !isActive(m)).map(pendingOf) };
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "classMembers"), dbMod.where("uid", "==", uid)));
  const ms = snap.docs.map((d) => d.data());
  // lớp đang chờ duyệt: chưa đọc được tài liệu lớp -> dùng tên lưu sẵn trong thẻ thành viên
  const active = await Promise.all(ms.filter(isActive).map(async (m) => {
    const c = await dbMod.getDoc(dbMod.doc(db, "classes", m.classId)).catch(() => null);
    return c?.exists() ? normClass(c.id, c.data()) : null;
  }));
  return { active: active.filter(Boolean), pending: ms.filter((m) => !isActive(m)).map(pendingOf) };
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
  const body = { name, section: section || "", code, joinOpen: true, archived: false, requireApproval: true, theme: DEFAULT_THEME,
    avatarUrl: "", teacherName: user?.displayName || "", createdBy: user?.email || "" };
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
  batch.set(dbMod.doc(db, "classCodes", code), { classId: ref.id, name, teacherName: body.teacherName, requireApproval: true });
  await batch.commit();
  return ref.id;
}

/** patch: { name, section, joinOpen, archived, requireApproval, theme, avatarUrl, avatarPath } */
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
  // mã lớp giữ bản sao tên + chế độ duyệt để học sinh (chưa đọc được lớp) biết trước khi gửi yêu cầu
  const codePatch = {};
  if (patch.name) codePatch.name = patch.name;
  if ("requireApproval" in patch) codePatch.requireApproval = patch.requireApproval;
  if (cls.code && Object.keys(codePatch).length) batch.set(dbMod.doc(db, "classCodes", cls.code), codePatch, { merge: true });
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
  batch.set(dbMod.doc(db, "classCodes", code), { classId: cls.id, name: cls.name, teacherName: cls.teacherName || "", requireApproval: cls.requireApproval !== false });
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

/** Số học sinh đã vào từng lớp (giáo viên). pendingOut (Map) nếu truyền vào: số yêu cầu chờ duyệt */
export async function countMembers(pendingOut = null) {
  const rows = !isConfigured ? Object.values(lsGet(LS.m, {}))
    : await (async () => {
      const { db, dbMod } = await initFirebase();
      return (await dbMod.getDocs(dbMod.collection(db, "classMembers"))).docs.map((d) => d.data());
    })();
  const m = new Map();
  for (const r of rows) {
    if (isActive(r)) m.set(r.classId, (m.get(r.classId) || 0) + 1);
    else pendingOut?.set(r.classId, (pendingOut.get(r.classId) || 0) + 1);
  }
  return m;
}

/** Giáo viên duyệt yêu cầu vào lớp */
export async function approveMember(cid, uid) {
  if (!isConfigured) {
    const all = lsGet(LS.m, {});
    if (all[memId(cid, uid)]) all[memId(cid, uid)].status = "active";
    lsSet(LS.m, all);
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.updateDoc(dbMod.doc(db, "classMembers", memId(cid, uid)), { status: "active", approvedAt: dbMod.serverTimestamp() });
}

/** Giáo viên xoá học sinh khỏi lớp / từ chối yêu cầu, hoặc học sinh tự rời lớp / huỷ yêu cầu */
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
/** Tra mã: { classId, name, teacherName, requireApproval } hoặc null */
export async function lookupCode(code) {
  code = normCode(code);
  if (code.length < 5) return null;
  if (!isConfigured) {
    const hit = Object.entries(lsGet(LS.c, {})).find(([, c]) => c.code === code);
    return hit ? { classId: hit[0], name: hit[1].name, teacherName: hit[1].teacherName || "", requireApproval: hit[1].requireApproval !== false } : null;
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "classCodes", code));
  return snap.exists() ? snap.data() : null;
}

/**
 * Vào lớp bằng mã. Trả về { cls, already, pending } — pending: đã gửi yêu cầu, chờ giáo viên duyệt.
 * Lỗi có err.code:
 * "bad-code" (sai mã) · "closed" (lớp đã khoá / lưu trữ)
 */
export async function joinClass(code, user) {
  code = normCode(code);
  const hit = await lookupCode(code);
  if (!hit) throw Object.assign(new Error("bad-code"), { code: "bad-code" });
  const cid = hit.classId;
  if (mine.some((c) => c.id === cid)) return { cls: mine.find((c) => c.id === cid), already: true };
  if (waiting.some((c) => c.id === cid)) return { cls: waiting.find((c) => c.id === cid), already: true, pending: true };
  const status = hit.requireApproval === false ? "active" : "pending";
  const rec = { classId: cid, uid: user.uid, code, status, className: hit.name || "", teacherName: hit.teacherName || "",
    name: user.displayName || "", email: user.email || "", photoURL: user.photoURL || "" };
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
  return { cls: mine.find((c) => c.id === cid) || { id: cid, name: hit.name }, already: false, pending: status === "pending" };
}

/* ---------------- Ảnh đại diện lớp ---------------- */
/** Thu nhỏ ảnh về tối đa 320 px (JPEG) để tải nhanh và nhẹ Storage */
function shrinkImage(file, max = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = Object.assign(document.createElement("canvas"), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      cv.toBlob((b) => (b ? resolve(b) : reject(new Error("Không đọc được ảnh"))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("File này không phải ảnh"));
    img.src = URL.createObjectURL(file);
  });
}

export async function setClassAvatar(cls, file) {
  const blob = await shrinkImage(file);
  if (!isConfigured) {
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
    await updateClass(cls, { avatarUrl: url, avatarPath: "" });
    return url;
  }
  const { storage, stMod } = await initFirebase();
  const path = `classes/${cls.id}/avatar-${Date.now()}.jpg`;
  const ref = stMod.ref(storage, path);
  await stMod.uploadBytes(ref, blob, { contentType: "image/jpeg" });
  const url = await stMod.getDownloadURL(ref);
  await updateClass(cls, { avatarUrl: url, avatarPath: path });
  if (cls.avatarPath) stMod.deleteObject(stMod.ref(storage, cls.avatarPath)).catch(() => {});   // xoá ảnh cũ
  return url;
}

export async function clearClassAvatar(cls) {
  await updateClass(cls, { avatarUrl: "", avatarPath: "" });
  if (isConfigured && cls.avatarPath) {
    const { storage, stMod } = await initFirebase();
    stMod.deleteObject(stMod.ref(storage, cls.avatarPath)).catch(() => {});
  }
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
