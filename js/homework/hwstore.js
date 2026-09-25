// =====================================================================
//  HOMEWORK — lưu trữ bài tập, đáp án và bài nộp
//  Firestore:
//    assignments/{id}        đề bài (học sinh chỉ đọc bài đã "published")
//    assignmentKeys/{id}     đáp án — học sinh chỉ đọc được SAU KHI đã nộp
//    hwSubmissions/{id_uid}  bài nộp, mỗi học sinh một bản cho mỗi bài tập
//  Storage:
//    homework/{id}/materials/…           file đề của giáo viên
//    homework/{id}/submissions/{uid}/…   file học sinh nộp
//  Chưa cấu hình Firebase (chế độ thử) → lưu localStorage, file dạng data URL.
// =====================================================================
import { initFirebase, isConfigured } from "../firebase.js";
import { HOMEWORK_MAX_MB } from "../config.js";

const LS = { a: "ielts:hw:assignments", k: "ielts:hw:keys", s: "ielts:hw:subs" };
const DEMO_MAX_MB = 3;

const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const toDate = (v) => (!v ? null : v.toDate ? v.toDate() : new Date(v));
const subId = (aid, uid) => `${aid}_${uid}`;
const safeName = (n) => String(n || "file").replace(/[^\w.\-]+/g, "_").slice(-80);

function normAssignment(id, d) {
  return { id, ...d, dueAt: toDate(d.dueAt), createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt) };
}
function normSub(id, d) {
  return { id, ...d, submittedAt: toDate(d.submittedAt), gradedAt: toDate(d.gradedAt) };
}

/* ---------------- Đáp án: "1. TRUE\n2. B\n3. hartley / the hartley" ---------------- */
export function parseKey(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(q\s*)?\d+\s*[.):\-]?\s*/i, "").trim())
    .filter(Boolean)
    .map((line) => line.split(/\s*\/\s*|\s*\|\s*/).map((s) => s.trim()).filter(Boolean));
}
export const keyToText = (answers = []) => answers.map((alts, i) => `${i + 1}. ${alts.join(" / ")}`).join("\n");

/* ---------------- Bài tập ---------------- */
export async function listAssignments({ admin }) {
  if (!isConfigured) {
    const all = lsGet(LS.a, []).map((a) => normAssignment(a.id, a));
    return (admin ? all : all.filter((a) => a.published)).sort((x, y) => x.dueAt - y.dueAt);
  }
  const { db, dbMod } = await initFirebase();
  const col = dbMod.collection(db, "assignments");
  const q = admin
    ? dbMod.query(col, dbMod.orderBy("dueAt", "desc"), dbMod.limit(200))
    : dbMod.query(col, dbMod.where("published", "==", true), dbMod.orderBy("dueAt", "asc"), dbMod.limit(200));
  const snap = await dbMod.getDocs(q);
  return snap.docs.map((d) => normAssignment(d.id, d.data()));
}

export async function getAssignment(id) {
  if (!isConfigured) {
    const a = lsGet(LS.a, []).find((x) => x.id === id);
    return a ? normAssignment(a.id, a) : null;
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "assignments", id));
  return snap.exists() ? normAssignment(snap.id, snap.data()) : null;
}

/** Tạo / sửa bài tập. data.dueAt là Date. answers là mảng đáp án (chỉ Reading/Listening). */
export async function saveAssignment(id, data, answers, user) {
  const body = {
    title: data.title, type: data.type, instructions: data.instructions || "",
    dueAt: data.dueAt, allowLate: !!data.allowLate, published: !!data.published,
    materials: data.materials || [], links: data.links || [],
    questionCount: answers ? answers.length : (data.type === "bank" ? data.bank?.count || 0 : 0),
    speaking: data.type === "speaking" ? (data.speaking || null) : null,
    bank: data.type === "bank" ? (data.bank || null) : null,    // { kind, id, title } — bài trong ngân hàng đề
  };
  if (!isConfigured) {
    const all = lsGet(LS.a, []);
    const now = new Date().toISOString();
    const newId = id || `hw${Date.now().toString(36)}`;
    const rec = { ...all.find((x) => x.id === newId), ...body, id: newId, dueAt: body.dueAt.toISOString(), updatedAt: now };
    if (!id) { rec.createdAt = now; rec.createdBy = user?.displayName || ""; }
    lsSet(LS.a, [...all.filter((x) => x.id !== newId), rec]);
    const keys = lsGet(LS.k, {});
    keys[newId] = answers || [];
    lsSet(LS.k, keys);
    return newId;
  }
  const { db, dbMod } = await initFirebase();
  const ref = id ? dbMod.doc(db, "assignments", id) : dbMod.doc(dbMod.collection(db, "assignments"));
  const payload = {
    ...body,
    dueAt: dbMod.Timestamp.fromDate(body.dueAt),
    updatedAt: dbMod.serverTimestamp(),
    ...(id ? {} : { createdAt: dbMod.serverTimestamp(), createdBy: user?.email || "" }),
  };
  await dbMod.setDoc(ref, payload, { merge: true });
  // Firestore không lưu được mảng lồng mảng → đổi mỗi đáp án thành chuỗi "a|b"
  await dbMod.setDoc(dbMod.doc(db, "assignmentKeys", ref.id), { answers: (answers || []).map((alts) => alts.join("|")) });
  return ref.id;
}

export async function deleteAssignment(id) {
  if (!isConfigured) {
    lsSet(LS.a, lsGet(LS.a, []).filter((x) => x.id !== id));
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.deleteDoc(dbMod.doc(db, "assignmentKeys", id));
  await dbMod.deleteDoc(dbMod.doc(db, "assignments", id));
}

/** Đáp án — giáo viên đọc bất kỳ lúc nào, học sinh chỉ sau khi nộp. */
export async function getKey(id) {
  if (!isConfigured) return lsGet(LS.k, {})[id] || [];
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "assignmentKeys", id));
  return snap.exists() ? (snap.data().answers || []).map((s) => String(s).split("|")) : [];
}

/* ---------------- File ---------------- */
function readDataUrl(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

/**
 * Upload một file. kind: "materials" (giáo viên) | "submissions" (học sinh).
 * onProgress(0..1). Trả về { name, url, path, contentType, size }.
 */
export async function uploadFile({ aid, uid, kind, file, name, onProgress }) {
  const fname = name || file.name || "file";
  const limit = isConfigured ? HOMEWORK_MAX_MB : DEMO_MAX_MB;
  if (file.size > limit * 1024 * 1024) {
    const err = new Error(`FILE_TOO_BIG:${fname}:${limit}`);
    err.code = "file-too-big";
    throw err;
  }
  const meta = { name: fname, contentType: file.type || "application/octet-stream", size: file.size };
  if (!isConfigured) {
    onProgress?.(1);
    return { ...meta, url: await readDataUrl(file), path: `demo/${Date.now()}-${safeName(fname)}` };
  }
  const { storage, stMod } = await initFirebase();
  const base = kind === "materials" ? `homework/${aid}/materials` : `homework/${aid}/submissions/${uid}`;
  const path = `${base}/${Date.now()}-${safeName(fname)}`;
  const ref = stMod.ref(storage, path);
  const task = stMod.uploadBytesResumable(ref, file, { contentType: meta.contentType });
  await new Promise((resolve, reject) => {
    task.on("state_changed", (s) => onProgress?.(s.bytesTransferred / (s.totalBytes || 1)), reject, resolve);
  });
  return { ...meta, url: await stMod.getDownloadURL(ref), path };
}

/* ---------------- Bài nộp ---------------- */
export async function getMySubmission(aid, uid) {
  if (!isConfigured) {
    const s = lsGet(LS.s, {})[subId(aid, uid)];
    return s ? normSub(subId(aid, uid), s) : null;
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "hwSubmissions", subId(aid, uid)));
  return snap.exists() ? normSub(snap.id, snap.data()) : null;
}

/** Map assignmentId → bài nộp của một học sinh */
export async function listMyHomework(uid) {
  if (!isConfigured) {
    const all = lsGet(LS.s, {});
    return new Map(Object.entries(all).filter(([, s]) => s.uid === uid).map(([id, s]) => [s.assignmentId, normSub(id, s)]));
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "hwSubmissions"), dbMod.where("uid", "==", uid)));
  return new Map(snap.docs.map((d) => [d.data().assignmentId, normSub(d.id, d.data())]));
}

export async function listSubmissionsFor(aid) {
  if (!isConfigured) {
    return Object.entries(lsGet(LS.s, {})).filter(([, s]) => s.assignmentId === aid).map(([id, s]) => normSub(id, s));
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "hwSubmissions"), dbMod.where("assignmentId", "==", aid)));
  return snap.docs.map((d) => normSub(d.id, d.data()));
}

/** Đếm số bài nộp theo từng bài tập (cho giáo viên) */
export async function countSubmissions() {
  if (!isConfigured) {
    const m = new Map();
    for (const s of Object.values(lsGet(LS.s, {}))) m.set(s.assignmentId, (m.get(s.assignmentId) || 0) + 1);
    return m;
  }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.collection(db, "hwSubmissions"));
  const m = new Map();
  for (const d of snap.docs) {
    const a = d.data().assignmentId;
    m.set(a, (m.get(a) || 0) + 1);
  }
  return m;
}

/**
 * Nộp / nộp lại. body: { answers?, text?, files?, note?, turns?, analysis?, analysisError? }
 * Thời điểm nộp lấy từ đồng hồ máy chủ.
 */
export async function submitHomework(assignment, user, body) {
  const base = {
    assignmentId: assignment.id,
    type: assignment.type,
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    answers: body.answers || null,
    text: body.text ?? null,
    files: body.files || [],
    note: body.note || "",
    turns: body.turns || null,          // Speaking: [{ part, prompt, seconds, audio }]
    analysis: body.analysis || null,    // Speaking: báo cáo AI 4 tiêu chí
    analysisError: body.analysisError || null,
    score: body.score || null,          // Ngân hàng đề: { raw, total } chấm tự động
    details: body.details || null,      // Ngân hàng đề: từng câu đúng/sai
    practiceId: body.practiceId || null,
    durationSec: body.durationSec ?? null,
    autoSubmitted: body.autoSubmitted ?? null,
  };
  if (!isConfigured) {
    const all = lsGet(LS.s, {});
    all[subId(assignment.id, user.uid)] = { ...base, submittedAt: new Date().toISOString() };
    lsSet(LS.s, all);
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.setDoc(dbMod.doc(db, "hwSubmissions", subId(assignment.id, user.uid)), {
    ...base,
    submittedAt: dbMod.serverTimestamp(),
  });
}

/** criteria (Speaking): { fc, lr, gra, p } — band giáo viên chấm từng tiêu chí, hoặc null */
export async function gradeHomework(sid, { score, comment, graderEmail, criteria = null }) {
  if (!isConfigured) {
    const all = lsGet(LS.s, {});
    if (all[sid]) {
      all[sid] = { ...all[sid], teacherScore: score, teacherComment: comment, teacherCriteria: criteria, gradedAt: new Date().toISOString(), graderEmail };
      lsSet(LS.s, all);
    }
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.updateDoc(dbMod.doc(db, "hwSubmissions", sid), {
    teacherScore: score, teacherComment: comment, teacherCriteria: criteria, graderEmail, gradedAt: dbMod.serverTimestamp(),
  });
}
