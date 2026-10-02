// =====================================================================
//  HOMEWORK — lưu trữ bài tập, đáp án và bài nộp
//  Firestore:
//    assignments/{id}        đề bài, thuộc một lớp (classId); học sinh chỉ đọc bài "published" của lớp mình
//    assignmentKeys/{id}     đáp án — học sinh chỉ đọc được SAU KHI đã nộp
//    hwSubmissions/{id_uid}  bài nộp, mỗi học sinh một bản cho mỗi bài tập
//  Storage:
//    homework/{id}/materials/…           file đề của giáo viên
//    homework/{id}/submissions/{uid}/…   file học sinh nộp
//  Chưa cấu hình Firebase (chế độ thử) → lưu localStorage, file dạng data URL.
// =====================================================================
import { initFirebase, isConfigured } from "../firebase.js";
import { HOMEWORK_MAX_MB } from "../config.js";

const LS = { a: "ielts:hw:assignments", k: "ielts:hw:keys", s: "ielts:hw:subs", d: "ielts:hw:drafts" };
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
/**
 * Giáo viên: mọi bài (classId: lọc theo một lớp).
 * Học sinh: bài đã "published" của các lớp mình học — truyền classIds (luật Firestore chặn lớp khác).
 */
export async function listAssignments({ admin, classIds = [], classId = null }) {
  const byDue = (list, dir) => list.sort((x, y) => dir * (x.dueAt - y.dueAt));
  if (!isConfigured) {
    const all = lsGet(LS.a, []).map((a) => normAssignment(a.id, a));
    if (admin) return byDue(all.filter((a) => !classId || a.classId === classId), -1);
    return byDue(all.filter((a) => a.published && classIds.includes(a.classId)), 1);
  }
  const { db, dbMod } = await initFirebase();
  const col = dbMod.collection(db, "assignments");
  if (admin) {
    const q = classId ? dbMod.query(col, dbMod.where("classId", "==", classId))
      : dbMod.query(col, dbMod.orderBy("dueAt", "desc"), dbMod.limit(300));
    const snap = await dbMod.getDocs(q);
    return byDue(snap.docs.map((d) => normAssignment(d.id, d.data())), -1);
  }
  // mỗi lớp một truy vấn (chỉ lọc bằng dấu "==" nên không cần tạo index)
  const snaps = await Promise.all(classIds.map((cid) =>
    dbMod.getDocs(dbMod.query(col, dbMod.where("classId", "==", cid), dbMod.where("published", "==", true)))
      .catch(() => ({ docs: [] }))));   // vừa bị xoá khỏi lớp: bỏ qua lớp đó, không làm hỏng cả trang
  return byDue(snaps.flatMap((s) => s.docs.map((d) => normAssignment(d.id, d.data()))), 1);
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
    title: data.title, type: data.type, instructions: data.instructions || "", classId: data.classId || null,
    dueAt: data.dueAt, allowLate: !!data.allowLate, published: !!data.published, allowResubmit: !!data.allowResubmit,
    materials: data.materials || [], links: data.links || [],
    questionCount: answers ? answers.length : (data.type === "bank" ? data.bank?.count || 0 : 0),
    speaking: data.type === "speaking" ? (data.speaking || null) : null,
    bank: data.type === "bank" ? (data.bank || null) : null,    // { kind, id, title } — bài trong ngân hàng đề
    writing: data.type === "writingmock" ? (data.writing || null) : null,   // Writing full test: đề Task 1 (+ hình) và Task 2
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

/**
 * Đếm số bài nộp theo từng bài tập (cho giáo viên): Map assignmentId -> số bài nộp.
 * Map trả về có thêm .graded: Map assignmentId -> số bài giáo viên đã chấm.
 */
export async function countSubmissions() {
  const rows = !isConfigured ? Object.values(lsGet(LS.s, {}))
    : await (async () => {
      const { db, dbMod } = await initFirebase();
      return (await dbMod.getDocs(dbMod.collection(db, "hwSubmissions"))).docs.map((d) => d.data());
    })();
  const m = new Map();
  m.graded = new Map();
  for (const s of rows) {
    m.set(s.assignmentId, (m.get(s.assignmentId) || 0) + 1);
    if (s.gradedAt || s.teacherScore) m.graded.set(s.assignmentId, (m.graded.get(s.assignmentId) || 0) + 1);
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
    tasks: body.tasks || null,          // Writing full test: [{ id, title, text, words, minWords }]
    analysis: body.analysis || null,    // Speaking: báo cáo AI 4 tiêu chí
    analysisError: body.analysisError || null,
    score: body.score || null,          // Ngân hàng đề: { raw, total } chấm tự động
    details: body.details || null,      // Ngân hàng đề: từng câu đúng/sai
    practiceId: body.practiceId || null,
    durationSec: body.durationSec ?? null,
    autoSubmitted: body.autoSubmitted ?? null,
    startedAt: body.startedAt || null,
    integrity: body.integrity || null,  // giám sát: rời màn hình, dán chữ… (js/proctor.js)
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

/* ---------------- Bản nháp có giờ (Writing full test) ----------------
 * hwDrafts/<bài>_<học sinh>: { assignmentId, uid, name, email, type, minutes, tasks, startedAtServer, updatedAt }
 * Lưu vài chục giây một lần trong lúc làm. startedAtServer lấy đồng hồ máy chủ; luật Firestore chặn ghi sau
 * startedAtServer + minutes (+2 phút dư). Hết giờ mà học sinh không nộp: bản nháp được chuyển thành bài nộp
 * (học sinh mở lại trang, hoặc giáo viên mở trang Chấm bài).
 */
const normDraft = (id, d) => ({ id, ...d, startedAtServer: toDate(d.startedAtServer), updatedAt: toDate(d.updatedAt) });
/** hết giờ chưa (theo giờ bắt đầu của máy chủ) */
export const draftExpired = (d, now = Date.now()) => !!d?.startedAtServer && now > d.startedAtServer.getTime() + d.minutes * 60e3;

export async function getDraft(aid, uid) {
  if (!isConfigured) { const d = lsGet(LS.d, {})[subId(aid, uid)]; return d ? normDraft(subId(aid, uid), d) : null; }
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "hwDrafts", subId(aid, uid)));
  return snap.exists() ? normDraft(snap.id, snap.data()) : null;
}

/** first=true: lần đầu bấm Bắt đầu (ghi giờ bắt đầu máy chủ); sau đó chỉ cập nhật bài làm */
export async function saveDraft(a, user, { tasks, minutes, integrity = null, first = false }) {
  const id = subId(a.id, user.uid);
  if (!isConfigured) {
    const all = lsGet(LS.d, {});
    const now = new Date().toISOString();
    all[id] = { ...(all[id] || { assignmentId: a.id, uid: user.uid, name: user.displayName || "", email: user.email || "", type: a.type, minutes, startedAtServer: now }),
      tasks, integrity, updatedAt: now };
    lsSet(LS.d, all);
    return;
  }
  const { db, dbMod } = await initFirebase();
  const ref = dbMod.doc(db, "hwDrafts", id);
  if (first) {
    await dbMod.setDoc(ref, { assignmentId: a.id, uid: user.uid, name: user.displayName || "", email: user.email || "", type: a.type,
      minutes, tasks, integrity, startedAtServer: dbMod.serverTimestamp(), updatedAt: dbMod.serverTimestamp() });
  } else {
    await dbMod.updateDoc(ref, { tasks, integrity, updatedAt: dbMod.serverTimestamp() });
  }
}

export async function listDraftsFor(aid) {
  if (!isConfigured) return Object.entries(lsGet(LS.d, {})).filter(([, d]) => d.assignmentId === aid).map(([id, d]) => normDraft(id, d));
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDocs(dbMod.query(dbMod.collection(db, "hwDrafts"), dbMod.where("assignmentId", "==", aid)));
  return snap.docs.map((d) => normDraft(d.id, d.data()));
}

/** Giáo viên: bản nháp đã hết giờ mà học sinh chưa nộp -> thành bài nộp (tự nộp khi hết giờ) */
export async function submitDraftAsTeacher(a, d) {
  const tasks = d.tasks || [];
  const base = {
    assignmentId: a.id, type: a.type, uid: d.uid, name: d.name || "", email: d.email || "",
    answers: null, files: [], note: "", turns: null, analysis: null, analysisError: null, score: null, details: null, practiceId: null,
    tasks, text: tasks.map((t) => `${String(t.title || t.id).toUpperCase()}\n${t.text || ""}`).join("\n\n"),
    startedAt: d.startedAtServer?.toISOString() || null, durationSec: d.minutes * 60, autoSubmitted: true, fromDraft: true,
    integrity: d.integrity || null,
  };
  if (!isConfigured) {
    const all = lsGet(LS.s, {});
    // thời điểm nộp = lúc hết giờ (không phải lúc giáo viên mở trang)
    all[d.id] = { ...base, submittedAt: new Date(d.startedAtServer.getTime() + d.minutes * 60e3).toISOString() };
    lsSet(LS.s, all);
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.setDoc(dbMod.doc(db, "hwSubmissions", d.id), {
    ...base, submittedAt: dbMod.Timestamp.fromDate(new Date(d.startedAtServer.getTime() + d.minutes * 60e3)),
  });
}

export async function deleteDraft(aid, uid) {
  if (!isConfigured) { const all = lsGet(LS.d, {}); delete all[subId(aid, uid)]; lsSet(LS.d, all); return; }
  const { db, dbMod } = await initFirebase();
  await dbMod.deleteDoc(dbMod.doc(db, "hwDrafts", subId(aid, uid))).catch(() => {});
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
