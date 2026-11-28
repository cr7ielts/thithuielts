// THẺ ĐIỂM HỌC VIÊN — phần "học viên đã đạt" ở trang đăng nhập và trang chủ, thay cho ảnh chụp bảng điểm.
//  Mỗi thẻ: kỳ thi (IELTS / TOEIC), tên, ngày thi, điểm Overall + 4 kỹ năng (L/R/S/W), một dòng ghi chú.
//   IELTS: band 0–9 (bước 0.5); Overall tự tính theo cách làm tròn của IELTS.
//   TOEIC: Listening, Reading 5–495; Speaking, Writing 0–200 (không thi S/W thì để trống); Overall = L + R (/990).
//  Firestore `scoreCards`: ai cũng đọc được (trang đăng nhập chưa đăng nhập), chỉ giáo viên thêm/sửa/xoá.
//  Chế độ thử: localStorage. Chỉ nhập điểm thật, đã được học viên đồng ý công khai.
import { el, icon, toast, confirmDialog } from "./ui.js";
import { L } from "./i18n.js";
import { initFirebase, isConfigured, isAdmin } from "./firebase.js";

const LS = "ielts:scoreCards";
const COL = "scoreCards";
const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; } };
const lsSet = (v) => { try { localStorage.setItem(LS, JSON.stringify(v)); } catch { /* đầy bộ nhớ */ } };

export async function listScoreCards() {
  let list;
  if (!isConfigured) list = lsGet();
  else {
    const { db, dbMod } = await initFirebase();
    const snap = await dbMod.getDocs(dbMod.collection(db, COL));
    list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return list.sort((a, b) => String(b.testDate || "").localeCompare(String(a.testDate || "")));
}
async function saveCard(c) {
  const body = { exam: c.exam, name: c.name, testDate: c.testDate, l: c.l, r: c.r, s: c.s, w: c.w, overall: c.overall, note: c.note || "", updatedAt: Date.now() };
  if (!isConfigured) {
    const list = lsGet();
    const i = list.findIndex((x) => x.id === c.id);
    if (i >= 0) list[i] = { ...list[i], ...body }; else list.push({ id: "sc" + Date.now().toString(36), ...body });
    lsSet(list); return;
  }
  const { db, dbMod } = await initFirebase();
  if (c.id) await dbMod.setDoc(dbMod.doc(db, COL, c.id), body);
  else await dbMod.addDoc(dbMod.collection(db, COL), body);
}
async function deleteCard(id) {
  if (!isConfigured) { lsSet(lsGet().filter((x) => x.id !== id)); return; }
  const { db, dbMod } = await initFirebase();
  await dbMod.deleteDoc(dbMod.doc(db, COL, id));
}

/* ---------- điểm ---------- */
const SKILLS = [["l", "Listening"], ["r", "Reading"], ["s", "Speaking"], ["w", "Writing"]];
/** IELTS: trung bình 4 kỹ năng, lẻ .25 lên .5, lẻ .75 lên 1 */
export function ieltsOverall(l, r, s, w) {
  const avg = (l + r + s + w) / 4;
  const base = Math.floor(avg), f = avg - base;
  return f < 0.25 ? base : f < 0.75 ? base + 0.5 : base + 1;
}
const RULES = {
  IELTS: { l: [0, 9, 0.5], r: [0, 9, 0.5], s: [0, 9, 0.5], w: [0, 9, 0.5] },
  TOEIC: { l: [5, 495, 5], r: [5, 495, 5], s: [0, 200, 10], w: [0, 200, 10] },
};
const maxOf = (exam, k) => RULES[exam][k][1];
const fmt = (exam, v) => (v == null || v === "" ? "—" : exam === "IELTS" ? Number(v).toFixed(1) : String(v));
const fmtDate = (d) => (d ? d.split("-").reverse().join("/") : "");

/* ---------- một thẻ ---------- */
function cardView(c, admin, onEdit, onDelete) {
  const toeic = c.exam === "TOEIC";
  return el("article", { class: `score-card ${toeic ? "toeic" : "ielts"}` },
    el("div", { class: "score-card-top" },
      el("span", { class: "score-exam" }, toeic ? "TOEIC" : "IELTS"),
      c.testDate ? el("span", { class: "score-date" }, L(`Thi ${fmtDate(c.testDate)}`, `Tested ${fmtDate(c.testDate)}`)) : null),
    el("div", { class: "score-name" }, c.name),
    el("div", { class: "score-overall" },
      el("span", { class: "score-overall-k" }, toeic ? "Total (L+R)" : "Overall"),
      el("span", { class: "score-overall-v" }, toeic ? String(c.overall) : Number(c.overall).toFixed(1),
        toeic ? el("small", {}, " /990") : null)),
    el("div", { class: "score-skills" }, SKILLS.map(([k, name]) =>
      el("div", { class: "score-skill" + (c[k] == null ? " none" : "") },
        el("span", { class: "score-skill-k", title: name }, k.toUpperCase()),
        el("span", { class: "score-skill-v", title: toeic ? `${name}: ${fmt(c.exam, c[k])}/${maxOf("TOEIC", k)}` : name }, fmt(c.exam, c[k]))))),
    toeic ? el("div", { class: "score-scale" }, L("L, R thang 495; S, W thang 200", "L, R out of 495; S, W out of 200")) : null,
    c.note ? el("div", { class: "score-note" }, c.note) : null,
    admin ? el("div", { class: "row", style: "gap:6px;justify-content:flex-end;margin-top:8px" },
      el("button", { class: "btn btn-sm btn-ghost", onclick: onEdit }, icon("edit"), L("Sửa", "Edit")),
      el("button", { class: "btn btn-sm btn-ghost", onclick: onDelete }, icon("trash"))) : null);
}

/* ---------- form giáo viên ---------- */
function editCard(c, onSaved) {
  const cur = { exam: "IELTS", name: "", testDate: "", l: null, r: null, s: null, w: null, note: "", ...(c || {}) };
  const back = el("div", { class: "modal-back" });
  const close = () => back.remove();
  const exam = el("select", { id: "sc-exam" }, ["IELTS", "TOEIC"].map((x) => el("option", { value: x, selected: cur.exam === x ? "" : null }, x)));
  const name = el("input", { id: "sc-name", type: "text", value: cur.name, placeholder: L("Ví dụ: Minh Anh, lớp IELTS tối 3-5-7", "e.g. Minh Anh, evening class") });
  const date = el("input", { id: "sc-date", type: "date", value: cur.testDate || "" });
  const note = el("input", { id: "sc-note", type: "text", value: cur.note, maxlength: "120", placeholder: L("Ví dụ: từ 5.5 lên 7.0 sau 4 tháng", "e.g. from 5.5 to 7.0 in 4 months") });
  const inputs = Object.fromEntries(SKILLS.map(([k]) => [k, el("input", { id: `sc-${k}`, type: "number", inputmode: "decimal", value: cur[k] ?? "" })]));
  const overall = el("strong", { class: "score-form-overall" });
  const hint = el("div", { class: "tiny muted" });
  const read = () => {
    const ex = exam.value, R = RULES[ex], v = {};
    for (const [k, nameK] of SKILLS) {
      const raw = inputs[k].value.trim();
      if (raw === "") { v[k] = null; continue; }
      const n = Number(raw.replace(",", "."));
      const [lo, hi, step] = R[k];
      if (!Number.isFinite(n) || n < lo || n > hi || Math.abs(n / step - Math.round(n / step)) > 1e-9)
        return { err: L(`${nameK}: từ ${lo} đến ${hi}, bước ${step}`, `${nameK}: ${lo}–${hi}, steps of ${step}`) };
      v[k] = n;
    }
    if (ex === "IELTS" && SKILLS.some(([k]) => v[k] == null)) return { v, err: L("IELTS cần đủ 4 kỹ năng", "IELTS needs all four skills") };
    if (ex === "TOEIC" && (v.l == null || v.r == null)) return { v, err: L("TOEIC cần Listening và Reading", "TOEIC needs Listening and Reading") };
    v.overall = ex === "IELTS" ? ieltsOverall(v.l, v.r, v.s, v.w) : v.l + v.r;
    return { v };
  };
  const sync = () => {
    const ex = exam.value;
    SKILLS.forEach(([k]) => { const [lo, hi, step] = RULES[ex][k]; Object.assign(inputs[k], { min: lo, max: hi, step }); inputs[k].placeholder = ex === "TOEIC" && (k === "s" || k === "w") ? L("không thi thì để trống", "blank if not taken") : `${lo}–${hi}`; });
    hint.textContent = ex === "IELTS" ? L("Overall tự tính: trung bình 4 kỹ năng, làm tròn như IELTS.", "Overall is worked out for you, rounded the IELTS way.")
      : L("Overall = Listening + Reading (thang 990). Speaking, Writing thang 200.", "Overall = Listening + Reading (out of 990). Speaking and Writing are out of 200.");
    const { v, err } = read();
    overall.textContent = err ? "—" : (ex === "IELTS" ? v.overall.toFixed(1) : `${v.overall}/990`);
  };
  exam.onchange = sync; Object.values(inputs).forEach((i) => { i.oninput = sync; });
  const field = (label, node) => el("label", { class: "stack-sm" }, el("span", { class: "tiny strong" }, label), node);
  back.append(el("div", { class: "modal score-form" },
    el("h3", {}, c?.id ? L("Sửa thẻ điểm", "Edit score card") : L("Thêm thẻ điểm học viên", "Add a student score card")),
    el("div", { class: "score-form-grid" },
      field(L("Kỳ thi", "Exam"), exam), field(L("Ngày thi", "Test date"), date),
      el("div", { style: "grid-column:1/-1" }, field(L("Tên hiển thị", "Display name"), name))),
    el("div", { class: "score-form-skills" }, SKILLS.map(([k, n]) => field(n, inputs[k]))),
    el("div", { class: "row", style: "gap:8px;margin-top:10px" }, el("span", { class: "small" }, "Overall:"), overall), hint,
    field(L("Ghi chú (không bắt buộc)", "Note (optional)"), note),
    el("div", { class: "tiny muted", style: "margin-top:8px" }, L("Thẻ hiện công khai ở trang đăng nhập. Chỉ nhập điểm thật và hỏi học viên trước khi đăng tên.",
      "Cards are public on the sign-in page. Enter real results only and ask the student before showing their name.")),
    el("div", { class: "modal-actions" },
      el("button", { class: "btn", onclick: close }, L("Huỷ", "Cancel")),
      el("button", { class: "btn btn-primary", onclick: async (e) => {
        const { v, err } = read();
        if (!name.value.trim()) return toast(L("Nhập tên hiển thị", "Enter a display name"), "err");
        if (err) return toast(err, "err");
        e.target.disabled = true;
        try {
          await saveCard({ id: c?.id, exam: exam.value, name: name.value.trim(), testDate: date.value, note: note.value.trim(), ...v });
          close(); toast(L("Đã lưu thẻ điểm", "Score card saved"), "ok"); onSaved();
        } catch (er) { e.target.disabled = false; toast(er.message, "err", 6000); }
      } }, L("Lưu", "Save")))));
  sync();
  document.body.append(back);
  name.focus();
}

/**
 * Khối "Học viên đạt điểm". user: người đang đăng nhập (null ở trang đăng nhập).
 * Chưa có thẻ nào: học sinh / khách không thấy gì; giáo viên thấy nút thêm.
 */
export function scoreCardsSection(user = null, { title = L("Học viên đã đạt", "Our students' results") } = {}) {
  const admin = !!user && isAdmin(user);
  const box = el("section", { class: "score-section" });
  let filter = "all";
  const load = async () => {
    let list = [];
    try { list = await listScoreCards(); } catch (err) { console.warn("scoreCards", err); }
    if (!list.length && !admin) { box.replaceChildren(); box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    const exams = [...new Set(list.map((c) => c.exam))];
    if (exams.length < 2) filter = "all";
    const shown = list.filter((c) => filter === "all" || c.exam === filter);
    box.replaceChildren(
      el("div", { class: "section-head" },
        el("h2", {}, title),
        el("div", { class: "row wrap", style: "gap:6px" },
          exams.length > 1 ? [["all", L("Tất cả", "All")], ...exams.map((x) => [x, x])].map(([k, t]) =>
            el("button", { class: "chip-btn" + (filter === k ? " on" : ""), onclick: () => { filter = k; load(); } }, t)) : null,
          admin ? el("button", { class: "btn btn-sm", onclick: () => editCard(null, load) }, icon("plus"), L("Thêm thẻ điểm", "Add score card")) : null)),
      list.length ? el("div", { class: "score-grid" }, shown.map((c) => cardView(c, admin, () => editCard(c, load), async () => {
        if (!(await confirmDialog({ title: L("Xoá thẻ điểm?", "Delete this card?"), body: c.name, danger: true, okText: L("Xoá", "Delete") }))) return;
        try { await deleteCard(c.id); load(); } catch (er) { toast(er.message, "err"); }
      })))
        : el("div", { class: "card muted small" }, L("Chưa có thẻ điểm nào. Bấm “Thêm thẻ điểm” để nhập kết quả thật của học viên (IELTS hoặc TOEIC); thẻ sẽ hiện ở trang đăng nhập và trang chủ.",
          "No score cards yet. Click “Add score card” to enter a real student result (IELTS or TOEIC); cards show on the sign-in page and the home page.")));
  };
  load();
  return box;
}
