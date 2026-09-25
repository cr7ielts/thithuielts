// Lưu / đọc bài nộp. Có Firebase thì dùng Firestore, chưa cấu hình thì lưu tạm localStorage.
import { initFirebase, isConfigured } from "./firebase.js";
import { ENABLE_AUDIO_UPLOAD } from "./config.js";
import { L } from "./i18n.js";

const LOCAL_KEY = "ielts:submissions";

function localAll() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); }
  catch { return []; }
}
function localWrite(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-300)));
}

/** Ghi hồ sơ học sinh (lần đầu đăng nhập hoặc cập nhật lần đăng nhập gần nhất) */
export async function ensureStudentProfile(user) {
  if (!isConfigured) return;
  const fb = await initFirebase();
  const { dbMod, db } = fb;
  const ref = dbMod.doc(db, "students", user.uid);
  const existing = await dbMod.getDoc(ref);
  await dbMod.setDoc(
    ref,
    {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      provider: user.providerData?.[0]?.providerId || "password",
      lastLoginAt: dbMod.serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: dbMod.serverTimestamp() }),
    },
    { merge: true }
  );
}

/**
 * Nộp bài. THỜI GIAN NỘP được lấy từ đồng hồ máy chủ Firestore (serverTimestamp),
 * nên học sinh không thể chỉnh giờ máy để gian lận.
 * Trả về { id, submittedAt }.
 */
export async function saveSubmission(user, payload) {
  const nowIso = new Date().toISOString();
  const base = {
    ...payload,
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    clientSubmittedAt: nowIso, // giờ trên máy học sinh, để đối chiếu
  };

  if (!isConfigured) {
    const rec = { ...base, id: `local-${Date.now()}`, submittedAt: nowIso, local: true };
    const list = localAll();
    list.push(rec);
    localWrite(list);
    return rec;
  }

  const { db, dbMod } = await initFirebase();
  const ref = await dbMod.addDoc(dbMod.collection(db, "submissions"), {
    ...base,
    submittedAt: dbMod.serverTimestamp(),
  });
  const snap = await dbMod.getDoc(ref);
  const data = snap.data() || {};
  return {
    id: ref.id,
    ...base,
    submittedAt: data.submittedAt?.toDate?.()?.toISOString?.() || nowIso,
  };
}

function toIso(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v.toDate) return v.toDate().toISOString();
  return null;
}

export async function listMySubmissions(uid) {
  if (!isConfigured) {
    return localAll().filter((s) => s.uid === uid).reverse();
  }
  const { db, dbMod } = await initFirebase();
  const q = dbMod.query(
    dbMod.collection(db, "submissions"),
    dbMod.where("uid", "==", uid),
    dbMod.orderBy("submittedAt", "desc"),
    dbMod.limit(100)
  );
  const snap = await dbMod.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), submittedAt: toIso(d.data().submittedAt) }));
}

export async function listAllSubmissions() {
  if (!isConfigured) return localAll().reverse();
  const { db, dbMod } = await initFirebase();
  const q = dbMod.query(
    dbMod.collection(db, "submissions"),
    dbMod.orderBy("submittedAt", "desc"),
    dbMod.limit(300)
  );
  const snap = await dbMod.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), submittedAt: toIso(d.data().submittedAt) }));
}

/** Giáo viên: danh sách học sinh đã đăng ký, kèm XP từ vựng */
export async function listStudents() {
  if (!isConfigured) {
    const byUid = new Map();
    for (const s of localAll()) byUid.set(s.uid, { uid: s.uid, name: s.name, email: s.email, provider: "demo" });
    return [...byUid.values()];
  }
  const { db, dbMod } = await initFirebase();
  const [studentsSnap, lbSnap] = await Promise.all([
    dbMod.getDocs(dbMod.query(dbMod.collection(db, "students"), dbMod.orderBy("lastLoginAt", "desc"), dbMod.limit(500))),
    dbMod.getDocs(dbMod.collection(db, "leaderboard")).catch(() => ({ docs: [] })),
  ]);
  const xp = new Map(lbSnap.docs.map((d) => [d.id, d.data()]));
  return studentsSnap.docs.map((d) => {
    const s = d.data();
    return {
      ...s,
      createdAt: toIso(s.createdAt),
      lastLoginAt: toIso(s.lastLoginAt),
      xp: xp.get(d.id)?.xp ?? 0,
      level: xp.get(d.id)?.level ?? 1,
      streak: xp.get(d.id)?.streak ?? 0,
    };
  });
}

/** Giáo viên chấm Writing / Speaking */
export async function gradeSubmission(id, { band, comment, graderEmail }) {
  if (!isConfigured) {
    const list = localAll();
    const i = list.findIndex((s) => s.id === id);
    if (i >= 0) {
      list[i] = { ...list[i], teacherBand: band, teacherComment: comment, graded: true, graderEmail };
      localWrite(list);
    }
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.updateDoc(dbMod.doc(db, "submissions", id), {
    teacherBand: band,
    teacherComment: comment,
    graded: true,
    graderEmail,
    gradedAt: dbMod.serverTimestamp(),
  });
}

/** Tải file ghi âm Speaking lên Firebase Storage; trả về URL hoặc null */
export async function uploadAudio(uid, blob, path) {
  if (!isConfigured || !ENABLE_AUDIO_UPLOAD) return null;
  try {
    const { storage, stMod } = await initFirebase();
    const ref = stMod.ref(storage, `speaking/${uid}/${path}`);
    await stMod.uploadBytes(ref, blob, { contentType: blob.type || "audio/webm" });
    return await stMod.getDownloadURL(ref);
  } catch (err) {
    console.warn("Không tải được file ghi âm:", err);
    return null;
  }
}

/* ===================== Từ vựng: tiến độ & bảng xếp hạng ===================== */

/** Đọc tiến độ từ vựng của học sinh trên Firestore (null nếu chưa có / chưa cấu hình) */
export async function loadVocabCloud(uid) {
  if (!isConfigured || !uid || uid.startsWith("demo-")) return null;
  const { db, dbMod } = await initFirebase();
  const snap = await dbMod.getDoc(dbMod.doc(db, "vocab", uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveVocabCloud(uid, data) {
  if (!isConfigured || !uid || uid.startsWith("demo-")) return;
  const { db, dbMod } = await initFirebase();
  await dbMod.setDoc(dbMod.doc(db, "vocab", uid), JSON.parse(JSON.stringify(data)));
}

const LB_LOCAL = "ielts:leaderboard";

/** Cập nhật điểm của mình lên bảng xếp hạng (chỉ tên, ảnh, XP — không có email) */
export async function updateLeaderboard(user, { xp, level, streak }) {
  if (!user) return;
  const row = { uid: user.uid, name: user.displayName || L("Học viên", "Student"), photoURL: user.photoURL || "", xp, level, streak };
  if (!isConfigured) {
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem(LB_LOCAL) || "[]"); } catch { rows = []; }
    rows = rows.filter((r) => r.uid !== user.uid).concat(row);
    localStorage.setItem(LB_LOCAL, JSON.stringify(rows));
    return;
  }
  const { db, dbMod } = await initFirebase();
  await dbMod.setDoc(dbMod.doc(db, "leaderboard", user.uid), { ...row, updatedAt: dbMod.serverTimestamp() });
}

export async function listLeaderboard(max = 20) {
  if (!isConfigured) {
    try {
      return JSON.parse(localStorage.getItem(LB_LOCAL) || "[]").sort((a, b) => b.xp - a.xp).slice(0, max);
    } catch { return []; }
  }
  const { db, dbMod } = await initFirebase();
  const q = dbMod.query(dbMod.collection(db, "leaderboard"), dbMod.orderBy("xp", "desc"), dbMod.limit(max));
  const snap = await dbMod.getDocs(q);
  return snap.docs.map((d) => d.data());
}
