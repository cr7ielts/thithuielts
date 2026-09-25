// HOMEWORK — trang học sinh (danh sách, làm bài) và trang giáo viên (tạo bài, chấm bài)
import { el, icon, toast, confirmDialog, fmtDateTime, draft } from "../ui.js";
import { createCat } from "../cat.js";
import { isCorrect, countWords } from "../engine.js";
import { isAdmin } from "../firebase.js";
import { listStudents } from "../store.js";
import { L } from "../i18n.js";
import {
  listAssignments, getAssignment, saveAssignment, deleteAssignment, getKey, parseKey, keyToText,
  uploadFile, getMySubmission, listMyHomework, listSubmissionsFor, countSubmissions, submitHomework, gradeHomework,
} from "./hwstore.js";
import { speakingFormSection, speakingWorkArea, recordingsList, aiReport, speakingTurns } from "./speaking.js";
import { CRITERIA, overallBand, aiAvailable } from "./speaking-ai.js";
import { bankPicker, findBankItem } from "../bank/bank.js";
import { myClasses, hasClass, listAllClasses, countMembers, listMembers } from "../classes/clstore.js";
import { noClassView, joinPromptCard } from "../classes/views.js";

const TYPES = {
  reading:   { icon: "reading",   color: "var(--c-reading)",   label: "Reading" },
  listening: { icon: "listening", color: "var(--c-listening)", label: "Listening" },
  writing:   { icon: "writing",   color: "var(--c-writing)",   label: "Writing" },
  speaking:  { icon: "mic",       color: "var(--c-speaking)",  label: "Speaking" },
  upload:    { icon: "upload",    color: "#9a8f7a",            label: L("Nộp file", "File upload") },
  bank:      { icon: "file",      color: "#a47ad8",            label: L("Ngân hàng đề", "Question bank") },
};
const HOUR = 3600 * 1000;

/* ======================= Tiện ích ======================= */
function dueInfo(a) {
  const ms = a.dueAt - Date.now();
  const when = fmtDateTime(a.dueAt).replace(/:\d\d$/, "");
  if (ms < 0) return { state: "overdue", text: L(`Hết hạn ${when}`, `Was due ${when}`) };
  const h = ms / HOUR;
  const rel = h < 1 ? L(`còn ${Math.max(1, Math.round(ms / 60000))} phút`, `${Math.max(1, Math.round(ms / 60000))} min left`)
    : h < 48 ? L(`còn ${Math.round(h)} giờ`, `${Math.round(h)} h left`)
    : L(`còn ${Math.round(h / 24)} ngày`, `${Math.round(h / 24)} days left`);
  return { state: h < 48 ? "soon" : "open", text: `${L("Hạn", "Due")} ${when} · ${rel}` };
}

/** todo | late-ok | missed | submitted | late | graded */
export function statusOf(a, sub) {
  if (sub) {
    if (sub.gradedAt || sub.teacherScore) return "graded";
    return sub.submittedAt && sub.submittedAt > a.dueAt ? "late" : "submitted";
  }
  if (a.dueAt < Date.now()) return a.allowLate ? "late-ok" : "missed";
  return "todo";
}
const STATUS = {
  todo:      { cls: "chip",          label: L("Chưa làm", "To do") },
  "late-ok": { cls: "chip chip-warn", label: L("Quá hạn — vẫn nộp được", "Overdue — still open") },
  missed:    { cls: "chip chip-bad",  label: L("Đã lỡ hạn", "Missed") },
  submitted: { cls: "chip chip-ok",   label: L("Đã nộp", "Submitted") },
  late:      { cls: "chip chip-warn", label: L("Nộp muộn", "Submitted late") },
  graded:    { cls: "chip chip-gold", label: L("Đã chấm", "Marked") },
};

const typeTag = (t) => el("span", { class: "hw-type", style: `--t:${TYPES[t]?.color}` }, icon(TYPES[t]?.icon || "file"), TYPES[t]?.label || t);
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function uploadErrorText(err) {
  if (err.code === "file-too-big") {
    const [, name, mb] = err.message.split(":");
    return L(`“${name}” lớn hơn ${mb} MB.`, `“${name}” is larger than ${mb} MB.`);
  }
  if (String(err.code || "").startsWith("storage/")) {
    return L("Không tải file lên được. Giáo viên cần bật Firebase Storage (gói Blaze).", "Upload failed. The teacher needs to turn on Firebase Storage (Blaze plan).") + ` (${err.code})`;
  }
  return err.message;
}

function loading() { return el("div", { class: "card muted" }, L("Đang tải…", "Loading…")); }

/* ======================= Tài liệu đề bài ======================= */
function materialsBlock(a) {
  const items = [...(a.materials || []), ...(a.links || []).map((l) => ({ ...l, isLink: true }))];
  if (!items.length) return null;
  const box = el("div", { class: "card hw-materials" }, el("h3", {}, L("Tài liệu đề bài", "Test materials")));
  for (const f of items) {
    if (f.isLink) {
      box.append(el("a", { class: "hw-file", href: f.url, target: "_blank", rel: "noopener" }, icon("link"), el("span", {}, f.label || f.url), icon("arrow")));
    } else if (f.contentType?.startsWith("image/")) {
      box.append(el("figure", { class: "hw-figure" },
        el("a", { href: f.url, target: "_blank", rel: "noopener" }, el("img", { src: f.url, alt: f.name, loading: "lazy" })),
        el("figcaption", { class: "tiny muted" }, f.name)));
    } else if (f.contentType?.startsWith("audio/")) {
      box.append(el("div", { class: "hw-audio" }, el("div", { class: "small strong" }, icon("listening"), " ", f.name),
        el("audio", { controls: "", preload: "metadata", src: f.url })));
    } else if (f.contentType === "application/pdf") {
      box.append(el("div", { class: "hw-pdf" },
        el("div", { class: "row", style: "justify-content:space-between" },
          el("span", { class: "small strong" }, icon("file"), " ", f.name),
          el("a", { class: "btn btn-sm", href: f.url, target: "_blank", rel: "noopener" }, L("Mở toàn màn hình", "Open full screen"), icon("arrow"))),
        el("iframe", { src: f.url, title: f.name, loading: "lazy" })));
    } else {
      box.append(el("a", { class: "hw-file", href: f.url, target: "_blank", rel: "noopener" }, icon("file"),
        el("span", {}, f.name), el("span", { class: "tiny muted" }, fmtSize(f.size || 0))));
    }
  }
  return box;
}

function fileList(files) {
  if (!files?.length) return null;
  return el("div", { class: "hw-filelist" }, files.map((f) =>
    f.contentType?.startsWith("image/")
      ? el("a", { class: "hw-thumb", href: f.url, target: "_blank", rel: "noopener", title: f.name }, el("img", { src: f.url, alt: f.name, loading: "lazy" }))
      : f.contentType?.startsWith("audio/")
        ? el("div", { class: "hw-audio sm" }, el("div", { class: "tiny strong" }, f.name), el("audio", { controls: "", preload: "metadata", src: f.url }))
        : el("a", { class: "hw-file", href: f.url, target: "_blank", rel: "noopener" }, icon("file"), el("span", {}, f.name), el("span", { class: "tiny muted" }, fmtSize(f.size || 0)))));
}

/* ======================= HỌC SINH: danh sách ======================= */
export function renderHomework(ctx) {
  if (isAdmin(ctx.user)) return renderTeacherHomework(ctx);
  if (!hasClass()) return noClassView(ctx);   // chưa vào lớp nào thì không có bài tập

  const wrap = el("div", { class: "stack-lg" });
  const cat = createCat({ size: 120, mood: "idle", bubbleSide: "left" });
  wrap.append(el("section", { class: "games-hero" },
    el("div", { style: "flex:1;min-width:240px" },
      el("div", { class: "eyebrow" }, "Homework"),
      el("h1", {}, L("Bài tập về nhà", "Your homework")),
      el("p", { class: "lead mb-0" }, L("Bài tập giáo viên giao, kèm hạn nộp. Nộp xong là giáo viên thấy ngay.", "Assignments from your teacher, with deadlines. Your teacher sees your work as soon as you submit."))),
    el("div", { class: "games-hero-cat" }, cat)));
  const body = loading();
  wrap.append(body);

  Promise.all([listAssignments({ admin: false, classIds: myClasses().map((c) => c.id) }), listMyHomework(ctx.user.uid)]).then(([list, mine]) => {
    body.replaceWith(studentLists(ctx, list, mine));
    const todo = list.filter((a) => ["todo", "late-ok"].includes(statusOf(a, mine.get(a.id))));
    const soon = todo.filter((a) => a.dueAt - Date.now() < 48 * HOUR);
    cat.setMood(soon.length ? "wow" : todo.length ? "idle" : "happy");
    cat.say(soon.length ? L(`${soon.length} bài sắp hết hạn!`, `${soon.length} due very soon!`)
      : todo.length ? L(`Còn ${todo.length} bài cần làm`, `${todo.length} to do`)
      : L("Làm hết bài rồi, giỏi quá!", "All done — great job!"));
  }).catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));

  return wrap;
}

export function studentLists(ctx, list, mine) {
  const groups = { todo: [], done: [], missed: [] };
  for (const a of list) {
    const st = statusOf(a, mine.get(a.id));
    (st === "todo" || st === "late-ok" ? groups.todo : st === "missed" ? groups.missed : groups.done).push(a);
  }
  groups.done.sort((x, y) => y.dueAt - x.dueAt);
  const section = (title, arr, empty) => el("div", { class: "stack" },
    el("div", { class: "section-head" }, el("h2", {}, title), el("span", { class: "chip" }, String(arr.length))),
    arr.length ? el("div", { class: "hw-grid" }, arr.map((a) => hwCard(ctx, a, mine.get(a.id)))) : el("p", { class: "muted small" }, empty));
  return el("div", { class: "stack-lg" },
    section(L("Cần làm", "To do"), groups.todo, L("Không có bài nào cần làm.", "Nothing to do right now.")),
    section(L("Đã nộp", "Submitted"), groups.done, L("Chưa nộp bài nào.", "Nothing submitted yet.")),
    groups.missed.length ? section(L("Đã lỡ hạn", "Missed"), groups.missed, "") : null);
}

export function hwCard(ctx, a, sub) {
  const st = statusOf(a, sub);
  const due = dueInfo(a);
  const cls = myClasses().length > 1 ? myClasses().find((c) => c.id === a.classId) : null;
  return el("button", { class: `hw-card due-${due.state}`, style: `--t:${TYPES[a.type]?.color}`, onclick: () => ctx.go(`homework/${a.id}`) },
    el("div", { class: "row", style: "justify-content:space-between" }, typeTag(a.type), el("span", { class: STATUS[st].cls }, STATUS[st].label)),
    el("h3", {}, a.title),
    cls ? el("div", { class: "tiny muted strong" }, icon("users"), " ", cls.name) : null,
    el("div", { class: "hw-due" }, icon("clock"), due.text),
    sub?.teacherScore ? el("div", { class: "small strong" }, `${L("Điểm", "Mark")}: ${sub.teacherScore}`) : null);
}

/* ======================= HỌC SINH: làm bài ======================= */
export function renderHomeworkDetail(ctx, id) {
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("homework") }, icon("back"), "Homework"));
  const body = loading();
  wrap.append(body);

  (async () => {
    const a = await getAssignment(id);
    if (!a) { body.replaceWith(el("div", { class: "notice notice-error" }, L("Không tìm thấy bài tập này.", "Assignment not found."))); return; }
    const teacher = isAdmin(ctx.user);
    const sub = teacher ? null : await getMySubmission(id, ctx.user.uid);
    const due = dueInfo(a);
    const st = statusOf(a, sub);

    const head = el("section", { class: "card hw-head", style: `--t:${TYPES[a.type]?.color}` },
      el("div", { class: "row wrap", style: "gap:8px" }, typeTag(a.type), teacher ? null : el("span", { class: STATUS[st].cls }, STATUS[st].label),
        ["reading", "listening", "bank"].includes(a.type) && a.questionCount ? el("span", { class: "chip" }, L(`${a.questionCount} câu`, `${a.questionCount} questions`)) : null,
        a.type === "speaking" ? el("span", { class: "chip" }, ((n) => L(`${n} câu hỏi`, `${n} question${n === 1 ? "" : "s"}`))(speakingTurns(a).length)) : null),
      el("h1", { style: "margin:8px 0 4px" }, a.title),
      el("div", { class: `hw-due due-${due.state}` }, icon("clock"), due.text, a.allowLate ? el("span", { class: "tiny muted" }, L(" · cho phép nộp muộn", " · late work accepted")) : null),
      a.instructions ? el("div", { class: "hw-instructions" }, a.instructions) : null);

    const parts = [head];
    if (teacher) {
      parts.push(el("div", { class: "notice notice-info row wrap", style: "gap:10px" },
        el("span", { style: "flex:1" }, L("Bạn đang xem bài tập như học sinh sẽ thấy.", "You're previewing this assignment as students see it.")),
        el("button", { class: "btn btn-sm", onclick: () => ctx.go(`homework/edit/${a.id}`) }, icon("writing"), L("Sửa", "Edit")),
        el("button", { class: "btn btn-sm btn-primary", onclick: () => ctx.go(`homework/review/${a.id}`) }, icon("cards"), L("Chấm bài", "Review work"))));
    }
    const mats = materialsBlock(a);
    if (mats) parts.push(mats);
    if (sub && (sub.teacherScore || sub.teacherComment)) parts.push(feedbackBlock(sub));

    const closed = !teacher && st === "missed";
    if (closed) {
      parts.push(el("div", { class: "notice notice-error" }, L("Đã hết hạn nộp bài này.", "The deadline for this assignment has passed.")));
    } else if (a.type === "reading" || a.type === "listening") {
      parts.push(await answerSheet(ctx, a, sub, teacher));
    } else if (a.type === "speaking") {
      parts.push(speakingWorkArea(ctx, a, sub, teacher));
    } else if (a.type === "bank") {
      parts.push(await bankWorkArea(ctx, a, sub, teacher));
    } else {
      parts.push(workArea(ctx, a, sub, teacher));
    }
    body.replaceWith(el("div", { class: "stack-lg" }, ...parts));
  })().catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));

  return wrap;
}

function feedbackBlock(sub) {
  return el("div", { class: "card hw-feedback" },
    el("div", { class: "row", style: "gap:10px" }, icon("star"), el("h3", { class: "mb-0" }, L("Giáo viên đã chấm", "Teacher feedback")),
      sub.teacherScore ? el("span", { class: "chip chip-gold" }, sub.teacherScore) : null),
    sub.teacherCriteria ? el("div", { class: "crit-chips" }, CRITERIA.map((c) =>
      sub.teacherCriteria[c.key] != null ? el("span", { class: "chip" }, `${c.name}: ${Number(sub.teacherCriteria[c.key]).toFixed(1)}`) : null)) : null,
    sub.teacherComment ? el("p", { class: "mb-0", style: "white-space:pre-wrap" }, sub.teacherComment) : null);
}

/* ----- Reading / Listening: phiếu trả lời, chấm tự động ----- */
async function answerSheet(ctx, a, sub, teacher) {
  const n = a.questionCount || 0;
  const card = el("div", { class: "card" });

  if (sub) {
    // Đã nộp: được đọc đáp án để xem kết quả
    let key = [];
    try { key = await getKey(a.id); } catch { /* rules chưa cho đọc */ }
    const rows = [];
    let correct = 0;
    for (let i = 1; i <= n; i++) {
      const given = sub.answers?.[i] ?? "";
      const ok = key[i - 1] ? isCorrect(given, key[i - 1]) : false;
      if (ok) correct++;
      rows.push(el("div", { class: "sheet-cell " + (ok ? "ok" : "bad") },
        el("span", { class: "qnum" }, i),
        el("span", { class: "strong" }, given || L("(trống)", "(blank)")),
        ok ? null : el("span", { class: "ans-key tiny" }, key[i - 1]?.join(" / ") || "")));
    }
    card.append(
      el("div", { class: "row wrap", style: "gap:14px;margin-bottom:14px" },
        el("div", { class: "band-ring sm", style: `--pct:${n ? (correct / n) * 100 : 0}%` }, el("div", { class: "val" }, `${correct}/${n}`)),
        el("div", {}, el("h2", { class: "mb-0" }, L("Kết quả của bạn", "Your result")),
          el("div", { class: "muted small" }, `${L("Nộp lúc", "Submitted")} ${fmtDateTime(sub.submittedAt)}`))),
      el("div", { class: "sheet-grid" }, rows));
    return card;
  }

  const answers = {};
  const saved = draft.load(ctx.user.uid, `hw-${a.id}`);
  if (saved?.data) Object.assign(answers, saved.data);
  const inputs = [];
  for (let i = 1; i <= n; i++) {
    const inp = el("input", {
      type: "text", id: `hw-q${i}`, value: answers[i] || "", autocomplete: "off", spellcheck: "false",
      oninput: (e) => { answers[i] = e.target.value; draft.save(ctx.user.uid, `hw-${a.id}`, answers); },
      onkeydown: (e) => { if (e.key === "Enter") { e.preventDefault(); inputs[i]?.focus(); } },
    });
    inputs.push(inp);
  }
  const submitBtn = el("button", { class: "btn btn-primary btn-lg", disabled: teacher ? "" : null }, icon("check"), L("Nộp bài", "Submit answers"));
  submitBtn.onclick = async () => {
    const blank = inputs.filter((x) => !x.value.trim()).length;
    const ok = await confirmDialog({
      title: L("Nộp phiếu trả lời?", "Submit your answers?"),
      body: (blank ? L(`Còn <strong>${blank}</strong> câu bỏ trống. `, `<strong>${blank}</strong> answers are blank. `) : "") +
        L("Bài Reading/Listening chỉ nộp được <strong>một lần</strong>.", "Reading/Listening homework can only be submitted <strong>once</strong>."),
      okText: L("Nộp bài", "Submit"),
    });
    if (!ok) return;
    submitBtn.disabled = true;
    try {
      const clean = {};
      inputs.forEach((x, k) => { clean[k + 1] = x.value.trim(); });
      await submitHomework(a, ctx.user, { answers: clean });
      draft.clear(ctx.user.uid, `hw-${a.id}`);
      toast(L("Đã nộp bài!", "Submitted!"), "ok");
      ctx.go(`homework/${a.id}`, { t: Date.now() });
    } catch (err) {
      submitBtn.disabled = false;
      toast(L("Không nộp được: ", "Couldn't submit: ") + err.message, "err", 6000);
    }
  };
  card.append(
    el("h2", {}, L("Phiếu trả lời", "Answer sheet")),
    el("p", { class: "muted small" }, L("Xem đề ở trên rồi điền đáp án. Nhấn Enter để sang câu tiếp theo. Bài được lưu nháp tự động.",
      "Read the test above and type your answers. Press Enter to jump to the next question. Your answers are saved as a draft.")),
    el("div", { class: "sheet-grid" }, inputs.map((inp, k) =>
      el("label", { class: "sheet-cell", for: inp.id }, el("span", { class: "qnum" }, k + 1), inp))),
    el("div", { class: "row", style: "margin-top:16px" }, submitBtn));
  return card;
}

/* ----- Ngân hàng đề: làm trên giao diện luyện đề, chấm tự động ----- */
async function bankWorkArea(ctx, a, sub, teacher) {
  const found = await findBankItem(a.bank);
  const card = el("div", { class: "card stack" });
  if (!found) {
    card.append(el("div", { class: "notice notice-error" }, L("Không tìm thấy bài này trong ngân hàng đề (có thể đã bị xoá).", "This test is no longer in the question bank.")));
    return card;
  }
  const route = `bank/${a.bank.kind}/${a.bank.id}`;
  card.append(el("div", { class: "row wrap", style: "gap:10px" },
    el("div", { style: "flex:1;min-width:220px" },
      el("div", { class: "eyebrow" }, L("Bài trong ngân hàng đề", "From the question bank")),
      el("h2", { class: "mb-0" }, found.title),
      el("div", { class: "muted small" }, L(`${found.count} câu · chấm tự động`, `${found.count} questions · marked automatically`)))));
  if (sub?.score) {
    const { raw, total } = sub.score;
    card.append(
      el("div", { class: "row wrap", style: "gap:14px" },
        el("div", { class: "band-ring sm", style: `--pct:${total ? (raw / total) * 100 : 0}%` }, el("div", { class: "val" }, `${raw}/${total}`)),
        el("div", {}, el("h3", { class: "mb-0" }, L("Kết quả của bạn", "Your result")),
          el("div", { class: "muted small" }, `${L("Nộp lúc", "Submitted")} ${fmtDateTime(sub.submittedAt)}`))),
      sub.details ? el("div", { class: "sheet-grid" }, sub.details.map((d) =>
        el("div", { class: "sheet-cell " + (d.ok ? "ok" : "bad") }, el("span", { class: "qnum" }, d.n),
          el("span", { class: "strong" }, d.given || L("(trống)", "(blank)")), d.ok ? null : el("span", { class: "ans-key tiny" }, d.key)))) : null,
      el("div", {}, el("button", { class: "btn", onclick: () => ctx.go(route) }, icon("refresh"), L("Luyện lại (không tính điểm)", "Practise again (not marked)"))));
    return card;
  }
  card.append(
    el("p", { class: "muted small mb-0" }, teacher
      ? L("Học sinh bấm “Làm bài” để làm trên giao diện luyện đề; nộp xong bài được chấm và hiện ở trang Chấm bài.",
          "Students press “Start” to do it in the practice view; it's marked on submit and appears on the Review page.")
      : L("Đề và phiếu trả lời mở trong giao diện luyện đề, có đồng hồ. Nộp xong máy chấm ngay và giáo viên thấy kết quả. Chỉ nộp một lần.",
          "The paper and answer sheet open in the practice view with a timer. It's marked as soon as you submit and your teacher sees the result. One attempt only.")),
    el("div", {}, el("button", { class: "btn btn-primary btn-lg", onclick: () => ctx.go(teacher ? route : `${route}/hw/${a.id}`) },
      icon("check"), teacher ? L("Xem bài (như học sinh)", "Open (as a student sees it)") : L("Làm bài", "Start"))));
  return card;
}

/* ----- Writing / Nộp file ----- */
function workArea(ctx, a, sub, teacher) {
  const card = el("div", { class: "card stack" });
  let files = [...(sub?.files || [])];
  const pending = []; // { file, name, preview }
  const graded = !!(sub?.gradedAt || sub?.teacherScore);
  const locked = teacher || graded;

  let textArea = null, counter = null;
  if (a.type === "writing") {
    textArea = el("textarea", { id: "hw-text", class: "essay", placeholder: L("Viết bài của bạn ở đây…", "Write your answer here…"), spellcheck: "false", disabled: locked ? "" : null });
    const saved = draft.load(ctx.user.uid, `hw-${a.id}`);
    textArea.value = sub?.text ?? saved?.data?.text ?? "";
    counter = el("span", { class: "chip" });
    const upd = () => { counter.textContent = L(`${countWords(textArea.value)} từ`, `${countWords(textArea.value)} words`); };
    textArea.oninput = () => { upd(); draft.save(ctx.user.uid, `hw-${a.id}`, { text: textArea.value }); };
    upd();
  }

  const note = el("textarea", { id: "hw-note", placeholder: L("Lời nhắn cho giáo viên (không bắt buộc)", "Note to your teacher (optional)"), style: "width:100%;min-height:70px", disabled: locked ? "" : null });
  note.value = sub?.note || "";

  const listBox = el("div", { class: "hw-attach" });
  const paintFiles = () => {
    listBox.innerHTML = "";
    const row = (label, meta, onRemove, extra) => el("div", { class: "hw-attach-row" }, icon("file"), el("span", { class: "strong" }, label),
      el("span", { class: "tiny muted" }, meta), extra, el("div", { class: "spacer" }),
      locked ? null : el("button", { class: "icon-btn", title: L("Bỏ file", "Remove"), onclick: onRemove }, icon("x")));
    files.forEach((f, i) => listBox.append(row(f.name, `${fmtSize(f.size || 0)} · ${L("đã tải lên", "uploaded")}`, () => { files.splice(i, 1); paintFiles(); },
      f.contentType?.startsWith("audio/") ? el("audio", { controls: "", src: f.url, preload: "metadata" }) : null)));
    pending.forEach((p, i) => listBox.append(row(p.name, `${fmtSize(p.file.size)} · ${L("chưa tải lên", "not uploaded yet")}`, () => { pending.splice(i, 1); paintFiles(); },
      p.preview ? el("audio", { controls: "", src: p.preview }) : null)));
    if (!files.length && !pending.length) listBox.append(el("div", { class: "muted small" }, L("Chưa có file nào.", "No files attached.")));
  };
  paintFiles();

  const picker = el("input", { type: "file", multiple: "", id: "hw-files", class: "hidden",
    accept: "image/*,audio/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" });
  picker.onchange = () => { for (const f of picker.files) pending.push({ file: f, name: f.name }); picker.value = ""; paintFiles(); };

  const recorder = audioRecorder((blob, secs) => {
    const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
    const name = `recording-${pending.length + files.length + 1}-${secs}s.${ext}`;
    pending.push({ file: new File([blob], name, { type: blob.type || "audio/webm" }), name, preview: URL.createObjectURL(blob) });
    paintFiles();
  });

  const progress = el("div", { class: "progress hidden" }, el("span", { style: "width:0%" }));
  const status = el("div", { class: "small muted", "aria-live": "polite" });
  const submitBtn = el("button", { class: "btn btn-primary btn-lg", disabled: locked ? "" : null },
    icon("check"), sub ? L("Nộp lại", "Resubmit") : L("Nộp bài", "Submit"));

  submitBtn.onclick = async () => {
    const text = textArea?.value.trim() ?? null;
    if (a.type === "writing" && !text && !files.length && !pending.length) { toast(L("Bạn chưa viết gì.", "You haven't written anything yet."), "err"); return; }
    if (a.type === "upload" && !files.length && !pending.length) { toast(L("Hãy thêm ít nhất một file hoặc ghi âm.", "Add at least one file or recording."), "err"); return; }
    submitBtn.disabled = true;
    progress.classList.remove("hidden");
    try {
      const total = pending.reduce((s, p) => s + p.file.size, 0) || 1;
      let done = 0;
      while (pending.length) {
        const p = pending[0];
        status.textContent = L(`Đang tải lên ${p.name}…`, `Uploading ${p.name}…`);
        const meta = await uploadFile({ aid: a.id, uid: ctx.user.uid, kind: "submissions", file: p.file, name: p.name,
          onProgress: (f) => { progress.firstChild.style.width = `${Math.round(((done + f * p.file.size) / total) * 100)}%`; } });
        done += p.file.size;
        files.push(meta);
        pending.shift();
        paintFiles();
      }
      status.textContent = L("Đang lưu bài nộp…", "Saving your submission…");
      await submitHomework(a, ctx.user, { text, files, note: note.value.trim() });
      draft.clear(ctx.user.uid, `hw-${a.id}`);
      toast(sub ? L("Đã nộp lại!", "Resubmitted!") : L("Đã nộp bài!", "Submitted!"), "ok");
      ctx.go(`homework/${a.id}`, { t: Date.now() });
    } catch (err) {
      submitBtn.disabled = false;
      status.textContent = "";
      progress.classList.add("hidden");
      toast(uploadErrorText(err), "err", 7000);
    }
  };

  card.append(el("h2", { class: "mb-0" }, a.type === "writing" ? L("Bài làm của bạn", "Your writing") : L("Nộp bài", "Your submission")));
  if (sub) {
    card.append(el("div", { class: "notice notice-info small" },
      `${L("Đã nộp lúc", "Submitted")} ${fmtDateTime(sub.submittedAt)}. ` +
      (graded ? L("Giáo viên đã chấm nên không nộp lại được.", "It has been marked, so it can't be changed.")
              : L("Bạn vẫn có thể sửa và nộp lại trước hạn.", "You can still edit and resubmit before the deadline."))));
  }
  if (textArea) card.append(el("div", { class: "row", style: "justify-content:flex-end" }, counter), textArea);
  card.append(
    el("div", { class: "stack-sm" },
      el("div", { class: "row wrap", style: "gap:8px" },
        el("strong", { style: "flex:1" }, a.type === "writing" ? L("File đính kèm (không bắt buộc)", "Attachments (optional)") : L("File & ghi âm", "Files & recordings")),
        locked ? null : el("button", { class: "btn btn-sm", onclick: () => picker.click() }, icon("upload"), L("Chọn file", "Choose files")),
        locked ? null : recorder.button),
      locked ? null : recorder.panel,
      listBox, picker,
      el("div", { class: "tiny muted" }, L("Ảnh, PDF, Word, PowerPoint, audio, video — tối đa 50 MB mỗi file.", "Images, PDF, Word, PowerPoint, audio or video — up to 50 MB each."))),
    note, progress, status,
    el("div", { class: "row" }, submitBtn));
  return card;
}

/** Nút ghi âm dùng MediaRecorder. onDone(blob, seconds) */
function audioRecorder(onDone) {
  let rec = null, stream = null, chunks = [], t0 = 0, iv = null;
  const clock = el("span", { class: "rec-clock" }, "00:00");
  const panel = el("div", { class: "rec-panel hidden" }, el("span", { class: "rec-dot" }), el("span", { class: "strong" }, L("Đang ghi âm", "Recording")), clock);
  const button = el("button", { class: "btn btn-sm" }, icon("mic"), L("Ghi âm", "Record audio"));
  const stop = () => { if (rec && rec.state !== "inactive") rec.stop(); };
  button.onclick = async () => {
    if (rec && rec.state === "recording") { stop(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast(L("Không truy cập được micro. Hãy cho phép micro trong trình duyệt.", "Can't use the microphone. Allow microphone access in your browser."), "err", 6000);
      return;
    }
    chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(iv);
      stream.getTracks().forEach((t) => t.stop());
      panel.classList.add("hidden");
      button.innerHTML = "";
      button.append(icon("mic"), L("Ghi âm", "Record audio"));
      button.classList.remove("btn-danger");
      const secs = Math.round((Date.now() - t0) / 1000);
      if (chunks.length) onDone(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), secs);
    };
    rec.start();
    t0 = Date.now();
    panel.classList.remove("hidden");
    button.innerHTML = "";
    button.append(icon("x"), L("Dừng ghi", "Stop"));
    button.classList.add("btn-danger");
    iv = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      clock.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      if (s >= 600) stop(); // tối đa 10 phút mỗi lần ghi
    }, 250);
  };
  return { button, panel };
}

/* ======================= GIÁO VIÊN: danh sách ======================= */
function renderTeacherHomework(ctx) {
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("section", { class: "games-hero" },
    el("div", { style: "flex:1;min-width:240px" },
      el("div", { class: "eyebrow" }, L("Giáo viên", "Teacher")),
      el("h1", {}, L("Giao bài tập", "Homework")),
      el("p", { class: "lead" }, aiAvailable()
        ? L("Tạo bài Reading/Listening có đáp án chấm tự động, Writing, Speaking ghi âm có AI phân tích, bài lấy từ Ngân hàng đề, hoặc bài nộp file — kèm hạn nộp.",
          "Set auto-marked Reading/Listening, Writing, recorded Speaking with AI analysis, or file-upload homework — each with a deadline.")
        : L("Tạo bài Reading/Listening có đáp án chấm tự động, Writing, Speaking ghi âm trên web, bài lấy từ Ngân hàng đề (passage Reading, đề hoặc section Listening), hoặc bài nộp file — kèm hạn nộp.",
          "Set auto-marked Reading/Listening, Writing, recorded Speaking, a test from the Question bank (Reading passage, Listening test or section), or file-upload homework — each with a deadline.")),
      el("button", { class: "btn btn-primary btn-lg", onclick: () => ctx.go("homework/new") }, icon("upload"), L("Tạo bài tập mới", "New assignment"))),
    el("div", { class: "games-hero-cat" }, createCat({ size: 120, mood: "think", bubbleSide: "left", say: L("Hôm nay giao bài gì đây?", "What's today's homework?") }))));
  const body = loading();
  wrap.append(body);

  Promise.all([listAssignments({ admin: true }), countSubmissions(), listAllClasses(), countMembers()]).then(([list, counts, classes, sizes]) => {
    if (!classes.length) {
      body.replaceWith(el("div", { class: "notice notice-info row wrap", style: "gap:10px" },
        el("span", { style: "flex:1" }, L("Bài tập giờ được giao theo lớp. Hãy tạo lớp trước, rồi gửi mã lớp cho học sinh.",
          "Homework is now set per class. Create a class first, then share its code with students.")),
        el("button", { class: "btn btn-primary btn-sm", onclick: () => ctx.go("classes") }, icon("users"), L("Đến Lớp học", "Go to Classes"))));
      return;
    }
    const names = new Map(classes.map((c) => [c.id, c.name]));
    let pick = "all";
    const out = el("div");
    const filters = el("div", { class: "tabs" });
    const paint = () => {
      filters.innerHTML = "";
      const opts = [["all", L("Tất cả lớp", "All classes")], ...classes.filter((c) => !c.archived).map((c) => [c.id, c.name])];
      if (list.some((a) => !a.classId)) opts.push(["none", L("Chưa có lớp", "No class")]);
      for (const [v, t] of opts) filters.append(el("button", { class: "chip-btn" + (pick === v ? " on" : ""), onclick: () => { pick = v; paint(); } }, t));
      const shown = list.filter((a) => pick === "all" || (pick === "none" ? !a.classId : a.classId === pick));
      out.replaceChildren(shown.length ? teacherTable(ctx, shown, counts, (a) => sizes.get(a.classId) || 0, pick === "all" ? names : null)
        : el("div", { class: "card muted" }, L("Chưa có bài tập nào. Bấm “Tạo bài tập mới” để bắt đầu.", "No assignments yet. Tap “New assignment” to start.")));
    };
    paint();
    body.replaceWith(el("div", { class: "stack" }, filters, out));
  }).catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));

  return wrap;
}

/** Bảng bài tập cho giáo viên. sizeOf(a): sĩ số lớp của bài · names: Map id lớp -> tên (null thì ẩn cột Lớp) */
export function teacherTable(ctx, list, counts, sizeOf, names = null) {
  const table = el("table");
  table.append(el("thead", {}, el("tr", {},
    el("th", {}, L("Bài tập", "Assignment")), names ? el("th", {}, L("Lớp", "Class")) : null,
    el("th", {}, L("Loại", "Type")), el("th", {}, L("Hạn nộp", "Due")),
    el("th", {}, L("Đã nộp", "Submitted")), el("th", {}, ""))));
  const tbody = el("tbody");
  for (const a of list) {
    const n = counts.get(a.id) || 0;
    const size = sizeOf(a);
    tbody.append(el("tr", {},
      el("td", {}, el("div", { class: "strong" }, a.title),
        a.published ? null : el("span", { class: "chip chip-warn tiny" }, L("Bản nháp — học sinh chưa thấy", "Draft — hidden from students"))),
      names ? el("td", { class: "small" }, names.get(a.classId) || el("span", { class: "chip chip-warn tiny" }, L("Chưa có lớp", "No class"))) : null,
      el("td", {}, typeTag(a.type)),
      el("td", { class: dueInfo(a).state === "overdue" ? "dim" : "" }, fmtDateTime(a.dueAt).replace(/:\d\d$/, "")),
      el("td", {}, `${n}${size ? ` / ${size}` : ""}`),
      el("td", { class: "nowrap" },
        el("button", { class: "btn btn-sm btn-primary", onclick: () => ctx.go(`homework/review/${a.id}`) }, L("Chấm bài", "Review")),
        " ",
        el("button", { class: "btn btn-sm", onclick: () => ctx.go(`homework/edit/${a.id}`) }, L("Sửa", "Edit")),
        " ",
        el("button", { class: "btn btn-sm btn-ghost", title: L("Xem như học sinh", "Preview as student"), onclick: () => ctx.go(`homework/${a.id}`) }, icon("eye")))));
  }
  table.append(tbody);
  return el("div", { class: "card card-flush" }, el("div", { class: "table-wrap", style: "border:0" }, table));
}

/* ======================= GIÁO VIÊN: tạo / sửa ======================= */
export function renderHomeworkForm(ctx, id) {
  const wrap = el("div", { class: "stack-lg hw-form" });
  wrap.append(el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("homework") }, icon("back"), "Homework"));
  if (!isAdmin(ctx.user)) { wrap.append(el("div", { class: "notice notice-error" }, L("Chỉ giáo viên mới tạo được bài tập.", "Only teachers can create assignments."))); return wrap; }
  const body = loading();
  wrap.append(body);

  (async () => {
    const a = id ? await getAssignment(id) : null;
    const key = id ? await getKey(id) : [];
    const classes = (await listAllClasses()).filter((c) => !c.archived || c.id === a?.classId);
    const classField = classPicker(classes, a, ctx.data?.classId);
    const materials = [...(a?.materials || [])];
    const pending = [];
    const links = [...(a?.links || [])];
    const defDue = a?.dueAt || (() => { const d = new Date(Date.now() + 7 * 24 * HOUR); d.setHours(23, 59, 0, 0); return d; })();

    const title = el("input", { type: "text", id: "hw-title", value: a?.title || "", placeholder: L("Ví dụ: Reading — Cambridge 18 Test 1", "e.g. Reading — Cambridge 18 Test 1"), style: "width:100%" });
    const type = el("select", { id: "hw-type-sel", class: "pick" },
      Object.entries(TYPES).map(([k, t]) => el("option", { value: k, selected: (a?.type || "reading") === k ? "" : null }, t.label)));
    const due = el("input", { type: "datetime-local", id: "hw-due", value: toLocalInput(defDue) });
    const allowLate = el("input", { type: "checkbox", id: "hw-late", checked: a ? (a.allowLate ? "" : null) : "" });
    const published = el("input", { type: "checkbox", id: "hw-pub", checked: a ? (a.published ? "" : null) : "" });
    const instructions = el("textarea", { id: "hw-instr", style: "width:100%;min-height:110px",
      placeholder: L("Hướng dẫn cho học sinh. Với Writing, dán đề bài vào đây.", "Instructions for students. For Writing, paste the task prompt here.") });
    instructions.value = a?.instructions || "";
    const keyBox = el("textarea", { id: "hw-key", class: "mono", style: "width:100%;min-height:220px",
      placeholder: "1. TRUE\n2. B\n3. hartley / the hartley\n4. 8.30\n…" });
    keyBox.value = keyToText(key);
    const keyCount = el("span", { class: "chip" });
    const updCount = () => { keyCount.textContent = L(`${parseKey(keyBox.value).length} câu`, `${parseKey(keyBox.value).length} questions`); };
    keyBox.oninput = updCount; updCount();
    const keyField = el("div", { class: "stack-sm" },
      el("div", { class: "row" }, el("label", { class: "field-label mb-0", for: "hw-key", style: "flex:1" }, L("Đáp án", "Answer key")), keyCount),
      keyBox,
      el("div", { class: "tiny muted" }, L("Mỗi dòng một câu, theo thứ tự. Nhiều đáp án đúng thì ngăn bằng dấu /. Không phân biệt hoa thường. Học sinh chỉ thấy đáp án sau khi nộp.",
        "One answer per line, in order. Separate accepted alternatives with /. Not case-sensitive. Students only see the key after submitting.")));
    const speakingField = speakingFormSection(a);
    // Ngân hàng đề: sửa bài có sẵn hoặc mở từ nút "Giao làm bài tập" trong ngân hàng đề
    const bankInit = a?.bank || ctx.data?.bank || null;
    if (!a && ctx.data?.bank) type.value = "bank";
    const bankField = bankPicker(bankInit, (ref) => {
      if (!title.value.trim() || title.dataset.auto === "1") { title.value = ref.title; title.dataset.auto = "1"; }
    });
    title.addEventListener("input", () => { title.dataset.auto = "0"; });
    const syncType = () => {
      keyField.classList.toggle("hidden", !["reading", "listening"].includes(type.value));
      speakingField.classList.toggle("hidden", type.value !== "speaking");
      bankField.classList.toggle("hidden", type.value !== "bank");
    };
    type.onchange = syncType; syncType();

    // Tài liệu đề
    const matList = el("div", { class: "hw-attach" });
    const paintMats = () => {
      matList.innerHTML = "";
      materials.forEach((f, i) => matList.append(el("div", { class: "hw-attach-row" }, icon("file"), el("span", { class: "strong" }, f.name),
        el("span", { class: "tiny muted" }, fmtSize(f.size || 0)), el("div", { class: "spacer" }),
        el("button", { class: "icon-btn", title: L("Bỏ", "Remove"), onclick: () => { materials.splice(i, 1); paintMats(); } }, icon("x")))));
      pending.forEach((f, i) => matList.append(el("div", { class: "hw-attach-row" }, icon("upload"), el("span", { class: "strong" }, f.name),
        el("span", { class: "tiny muted" }, `${fmtSize(f.size)} · ${L("tải lên khi lưu", "uploads on save")}`), el("div", { class: "spacer" }),
        el("button", { class: "icon-btn", onclick: () => { pending.splice(i, 1); paintMats(); } }, icon("x")))));
      links.forEach((l, i) => matList.append(el("div", { class: "hw-attach-row" }, icon("link"), el("span", { class: "strong" }, l.label || l.url),
        el("span", { class: "tiny muted" }, l.url.slice(0, 40)), el("div", { class: "spacer" }),
        el("button", { class: "icon-btn", onclick: () => { links.splice(i, 1); paintMats(); } }, icon("x")))));
      if (!materials.length && !pending.length && !links.length) matList.append(el("div", { class: "muted small" }, L("Chưa có tài liệu.", "No materials yet.")));
    };
    paintMats();
    const picker = el("input", { type: "file", multiple: "", class: "hidden", accept: "application/pdf,image/*,audio/*,video/*,.doc,.docx" });
    picker.onchange = () => { pending.push(...picker.files); picker.value = ""; paintMats(); };
    const linkUrl = el("input", { type: "text", id: "hw-link", placeholder: "https://drive.google.com/…", style: "flex:2;min-width:200px" });
    const linkLabel = el("input", { type: "text", id: "hw-link-label", placeholder: L("Tên hiển thị", "Label"), style: "flex:1;min-width:120px" });
    const addLink = () => {
      const url = linkUrl.value.trim();
      if (!/^https?:\/\//i.test(url)) { toast(L("Link phải bắt đầu bằng http:// hoặc https://", "Links must start with http:// or https://"), "err"); return; }
      links.push({ url, label: linkLabel.value.trim() });
      linkUrl.value = ""; linkLabel.value = "";
      paintMats();
    };

    const progress = el("div", { class: "progress hidden" }, el("span", { style: "width:0%" }));
    const status = el("div", { class: "small muted", "aria-live": "polite" });
    const saveBtn = el("button", { class: "btn btn-primary btn-lg" }, icon("check"), id ? L("Lưu thay đổi", "Save changes") : L("Tạo bài tập", "Create assignment"));

    saveBtn.onclick = async () => {
      const t = type.value;
      const answers = ["reading", "listening"].includes(t) ? parseKey(keyBox.value) : null;
      if (!title.value.trim()) { toast(L("Hãy đặt tên bài tập.", "Give the assignment a title."), "err"); title.focus(); return; }
      const dueDate = new Date(due.value);
      if (Number.isNaN(dueDate.getTime())) { toast(L("Hạn nộp chưa hợp lệ.", "The deadline isn't valid."), "err"); return; }
      if (answers && !answers.length) { toast(L("Bài Reading/Listening cần có đáp án.", "Reading/Listening homework needs an answer key."), "err"); keyBox.focus(); return; }
      const classIds = classField.read();
      if (!classIds.length) { toast(L("Chọn ít nhất một lớp để giao bài.", "Pick at least one class."), "err"); return; }
      let speaking = null, bank = null;
      if (t === "bank") {
        bank = bankField.read();
        if (!bank) { toast(L("Hãy chọn một bài trong ngân hàng đề.", "Pick a test from the question bank."), "err"); return; }
      }
      if (t === "speaking") {
        try { speaking = speakingField.read(); } catch (err) { toast(err.message, "err"); return; }
      }
      saveBtn.disabled = true;
      try {
        // Cần id trước khi upload file → tạo bản ghi trước nếu là bài mới
        let aid = id;
        const data = { title: title.value.trim(), type: t, instructions: instructions.value.trim(), dueAt: dueDate,
          allowLate: allowLate.checked, published: published.checked, materials, links, speaking, bank, classId: classIds[0] };
        if (!aid) aid = await saveAssignment(null, { ...data, published: false }, answers, ctx.user);
        if (pending.length) {
          progress.classList.remove("hidden");
          const total = pending.reduce((s, f) => s + f.size, 0) || 1;
          let done = 0;
          while (pending.length) {
            const f = pending[0];
            status.textContent = L(`Đang tải lên ${f.name}…`, `Uploading ${f.name}…`);
            const meta = await uploadFile({ aid, kind: "materials", file: f,
              onProgress: (p) => { progress.firstChild.style.width = `${Math.round(((done + p * f.size) / total) * 100)}%`; } });
            done += f.size;
            materials.push(meta);
            pending.shift();
            paintMats();
          }
        }
        status.textContent = L("Đang lưu…", "Saving…");
        await saveAssignment(aid, { ...data, materials }, answers, ctx.user);
        // giao cho nhiều lớp: mỗi lớp một bản riêng (như Google Classroom), dùng chung file đề
        for (const cid of classIds.slice(1)) {
          status.textContent = L("Đang giao cho lớp khác…", "Posting to other classes…");
          await saveAssignment(null, { ...data, materials, classId: cid }, answers, ctx.user);
        }
        toast(id ? L("Đã lưu bài tập", "Assignment saved")
          : classIds.length > 1 ? L(`Đã giao bài cho ${classIds.length} lớp`, `Posted to ${classIds.length} classes`)
          : L("Đã tạo bài tập", "Assignment created"), "ok");
        ctx.go(ctx.data?.classId ? `class/${ctx.data.classId}` : "homework");
      } catch (err) {
        saveBtn.disabled = false;
        status.textContent = "";
        toast(uploadErrorText(err), "err", 7000);
      }
    };

    const delBtn = id ? el("button", { class: "btn btn-danger", onclick: async () => {
      const ok = await confirmDialog({ title: L("Xoá bài tập?", "Delete this assignment?"),
        body: L("Bài tập và đáp án sẽ bị xoá. Bài học sinh đã nộp vẫn còn trong hệ thống.", "The assignment and its key will be deleted. Work students already submitted is kept."),
        okText: L("Xoá", "Delete"), danger: true });
      if (!ok) return;
      await deleteAssignment(id);
      toast(L("Đã xoá", "Deleted"), "ok");
      ctx.go("homework");
    } }, L("Xoá bài tập", "Delete")) : null;

    body.replaceWith(el("div", { class: "card stack" },
      el("h1", { class: "mb-0" }, id ? L("Sửa bài tập", "Edit assignment") : L("Bài tập mới", "New assignment")),
      el("div", {}, el("label", { class: "field-label", for: "hw-title" }, L("Tên bài tập", "Title")), title),
      classField,
      el("div", { class: "grid grid-2" },
        el("div", {}, el("label", { class: "field-label", for: "hw-type-sel" }, L("Loại bài", "Type")), type),
        el("div", {}, el("label", { class: "field-label", for: "hw-due" }, L("Hạn nộp", "Deadline")), due)),
      el("div", { class: "row wrap", style: "gap:18px" },
        el("label", { class: "check" }, allowLate, L("Cho phép nộp muộn (đánh dấu “muộn”)", "Accept late work (marked “late”)")),
        el("label", { class: "check" }, published, L("Hiện cho học sinh", "Visible to students"))),
      el("div", {}, el("label", { class: "field-label", for: "hw-instr" }, L("Hướng dẫn / đề bài", "Instructions / prompt")), instructions),
      el("div", { class: "stack-sm" },
        el("div", { class: "row wrap", style: "gap:8px" },
          el("strong", { style: "flex:1" }, L("Tài liệu đề (PDF, ảnh, audio Listening)", "Test materials (PDF, images, Listening audio)")),
          el("button", { class: "btn btn-sm", onclick: () => picker.click() }, icon("upload"), L("Chọn file", "Choose files"))),
        matList, picker,
        el("div", { class: "row wrap", style: "gap:8px" }, linkUrl, linkLabel,
          el("button", { class: "btn btn-sm", onclick: addLink }, icon("link"), L("Thêm link", "Add link"))),
        el("div", { class: "tiny muted" }, L("File tối đa 50 MB. Audio rất dài hoặc video có thể dán link Google Drive / YouTube.", "Files up to 50 MB each. For very long audio or video, add a Google Drive / YouTube link."))),
      keyField, speakingField, bankField, progress, status,
      el("div", { class: "row wrap", style: "gap:10px" }, saveBtn, el("div", { class: "spacer" }), delBtn)));
  })().catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));

  return wrap;
}

/**
 * Chọn lớp cho bài tập. Bài mới: tick nhiều lớp (mỗi lớp một bản). Sửa bài: chuyển sang một lớp khác.
 * read() -> [classId…]
 */
function classPicker(classes, a, preset) {
  const box = el("div", { class: "stack-sm" }, el("span", { class: "field-label mb-0" }, L("Giao cho lớp", "Assign to")));
  if (!classes.length) {
    box.append(el("div", { class: "notice notice-warn small" },
      L("Chưa có lớp nào. Vào mục Lớp học để tạo lớp trước.", "No classes yet. Create one under Classes first.")));
    box.read = () => [];
    return box;
  }
  if (a) {
    const sel = el("select", { class: "pick", id: "hw-class" },
      a.classId ? null : el("option", { value: "" }, L("— Chưa có lớp —", "— No class —")),
      classes.map((c) => el("option", { value: c.id, selected: c.id === a.classId ? "" : null }, c.name)));
    box.append(sel);
    box.read = () => (sel.value ? [sel.value] : []);
    return box;
  }
  const only = classes.length === 1 ? classes[0].id : null;
  const checks = classes.map((c) => ({ id: c.id,
    input: el("input", { type: "checkbox", checked: c.id === preset || c.id === only ? "" : null }), name: c.name, section: c.section }));
  box.append(el("div", { class: "row wrap", style: "gap:8px 18px" },
    checks.map((x) => el("label", { class: "check" }, x.input, x.name, x.section ? el("span", { class: "tiny muted" }, ` · ${x.section}`) : null))));
  if (classes.length > 1) box.append(el("div", { class: "tiny muted" },
    L("Chọn nhiều lớp thì mỗi lớp nhận một bản riêng, chấm riêng.", "Each class you tick gets its own copy, marked separately.")));
  box.read = () => checks.filter((x) => x.input.checked).map((x) => x.id);
  return box;
}

/* ======================= GIÁO VIÊN: chấm bài ======================= */
export function renderHomeworkReview(ctx, id) {
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("homework") }, icon("back"), "Homework"));
  if (!isAdmin(ctx.user)) { wrap.append(el("div", { class: "notice notice-error" }, L("Chỉ giáo viên mới xem được trang này.", "Only teachers can see this page."))); return wrap; }
  const body = loading();
  wrap.append(body);

  (async () => {
    const a = await getAssignment(id);
    if (!a) throw new Error(L("Không tìm thấy bài tập.", "Assignment not found."));
    const [subs, students, key] = await Promise.all([listSubmissionsFor(id),
      (a.classId ? listMembers(a.classId) : listStudents()).catch(() => []),
      ["reading", "listening"].includes(a.type) ? getKey(id) : Promise.resolve([])]);
    const byUid = new Map(subs.map((s) => [s.uid, s]));
    const autoScore = (s) => {
      if (!key.length || !s.answers) return null;
      let c = 0;
      key.forEach((alts, i) => { if (isCorrect(s.answers[i + 1] ?? "", alts)) c++; });
      return c;
    };

    const rows = [
      ...subs.map((s) => ({ uid: s.uid, name: s.name, email: s.email, sub: s })),
      ...students.filter((st) => !byUid.has(st.uid)).map((st) => ({ uid: st.uid, name: st.name, email: st.email, sub: null })),
    ];
    const late = subs.filter((s) => s.submittedAt > a.dueAt).length;
    const scores = a.type === "bank" ? subs.map((s) => s.score?.raw).filter((x) => x != null) : subs.map(autoScore).filter((x) => x != null);
    const scoreTotal = a.type === "bank" ? (a.questionCount || subs.find((s) => s.score)?.score.total || 0) : key.length;
    const avg = scores.length ? (scores.reduce((p, c) => p + c, 0) / scores.length).toFixed(1) : null;

    const list = el("div", { class: "stack" });
    for (const r of rows) list.append(reviewRow(ctx, a, r, key, autoScore));

    body.replaceWith(el("div", { class: "stack-lg" },
      el("section", { class: "card hw-head", style: `--t:${TYPES[a.type]?.color}` },
        el("div", { class: "row wrap", style: "gap:8px" }, typeTag(a.type), a.published ? null : el("span", { class: "chip chip-warn" }, L("Bản nháp", "Draft"))),
        el("h1", { style: "margin:8px 0 4px" }, a.title),
        el("div", { class: "hw-due" }, icon("clock"), dueInfo(a).text),
        el("div", { class: "grid grid-4", style: "margin-top:14px" },
          stat(L("Đã nộp", "Submitted"), `${subs.length}${students.length ? ` / ${students.length}` : ""}`),
          stat(L("Nộp muộn", "Late"), String(late)),
          stat(L("Đã chấm", "Marked"), String(subs.filter((s) => s.gradedAt || s.teacherScore).length)),
          stat(avg != null ? L("Điểm TB", "Average") : L("Chưa nộp", "Not submitted"),
            avg != null ? `${avg}/${scoreTotal}` : String(Math.max(0, students.length - subs.length))))),
      list));
  })().catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));

  return wrap;
}

const stat = (k, v) => el("div", { class: "stat" }, el("div", { class: "k" }, k), el("div", { class: "v" }, v));

function reviewRow(ctx, a, r, key, autoScore) {
  const s = r.sub;
  const who = el("div", {}, el("div", { class: "strong" }, r.name || "—"), el("div", { class: "tiny muted" }, r.email || ""));
  if (!s) {
    return el("div", { class: "hw-review-row missing" }, who, el("div", { class: "spacer" }),
      el("span", { class: a.dueAt < Date.now() ? "chip chip-bad" : "chip" }, a.dueAt < Date.now() ? L("Không nộp", "Not submitted") : L("Chưa nộp", "Not yet")));
  }
  const isLate = s.submittedAt > a.dueAt;
  const auto = a.type === "bank" ? (s.score?.raw ?? null) : autoScore(s);
  const autoTotal = a.type === "bank" ? (s.score?.total ?? 0) : key.length;
  const details = el("div", { class: "hw-review-body hidden" });

  if (a.type === "reading" || a.type === "listening") {
    details.append(el("div", { class: "sheet-grid" }, key.map((alts, i) => {
      const given = s.answers?.[i + 1] ?? "";
      const ok = isCorrect(given, alts);
      return el("div", { class: "sheet-cell " + (ok ? "ok" : "bad") }, el("span", { class: "qnum" }, i + 1),
        el("span", { class: "strong" }, given || "—"), ok ? null : el("span", { class: "ans-key tiny" }, alts.join(" / ")));
    })));
  }
  if (s.text) {
    details.append(el("div", { class: "row", style: "justify-content:flex-end" }, el("span", { class: "chip" }, L(`${countWords(s.text)} từ`, `${countWords(s.text)} words`))),
      el("div", { class: "hw-essay" }, s.text));
  }
  if (a.type === "bank" && s.details) {
    details.append(el("div", { class: "sheet-grid" }, s.details.map((d) =>
      el("div", { class: "sheet-cell " + (d.ok ? "ok" : "bad") }, el("span", { class: "qnum" }, d.n),
        el("span", { class: "strong" }, d.given || "—"), d.ok ? null : el("span", { class: "ans-key tiny" }, d.key)))));
  }
  if (a.type === "speaking") {
    if (s.analysis) details.append(aiReport(s.analysis, { forTeacher: true }));
    else if (s.analysisError) details.append(el("div", { class: "notice notice-error small" },
      L("AI chưa phân tích được bài này — hãy nghe và chấm thủ công. ", "The AI couldn't analyse this one — listen and mark it yourself. "), el("span", { class: "tiny" }, `(${s.analysisError})`)));
    details.append(recordingsList(s, null, s.analysis));
  } else {
    const fl = fileList(s.files);
    if (fl) details.append(fl);
  }
  if (s.note) details.append(el("div", { class: "notice notice-info small" }, el("strong", {}, L("Lời nhắn: ", "Note: ")), s.note));

  const aiBand = s.analysis?.overall != null ? s.analysis.overall.toFixed(1) : null;
  const scoreIn = el("input", { type: "text", id: `score-${s.id}`,
    value: s.teacherScore || (auto != null ? `${auto}/${autoTotal}` : aiBand ? `Band ${aiBand}` : ""),
    placeholder: ["writing", "speaking"].includes(a.type) ? L("vd. Band 6.5", "e.g. Band 6.5") : L("vd. 8/10", "e.g. 8/10"), style: "width:150px" });
  const comment = el("textarea", { id: `comment-${s.id}`, placeholder: L("Nhận xét cho học sinh…", "Feedback for the student…"), style: "width:100%;min-height:80px" });
  comment.value = s.teacherComment || "";
  // Speaking: giáo viên chấm band từng tiêu chí, band tổng tự tính theo quy tắc IELTS
  let critBox = null, readCriteria = () => null;
  if (a.type === "speaking") {
    const bands = [];
    for (let b = 9; b >= 0; b -= 0.5) bands.push(b);
    const start = s.teacherCriteria || (s.analysis ? Object.fromEntries(CRITERIA.map((c) => [c.key, s.analysis.criteria?.[c.key]?.band ?? null])) : {});
    const sels = CRITERIA.map((c) => el("select", { class: "pick", id: `crit-${c.key}-${s.id}`, "aria-label": c.name },
      el("option", { value: "" }, "—"),
      bands.map((b) => el("option", { value: b, selected: start[c.key] === b ? "" : null }, b.toFixed(1)))));
    readCriteria = () => {
      const vals = sels.map((x) => (x.value === "" ? null : Number(x.value)));
      return vals.every((v) => v === null) ? null : Object.fromEntries(CRITERIA.map((c, i) => [c.key, vals[i]]));
    };
    const syncOverall = () => {
      const crit = readCriteria();
      const ov = crit ? overallBand(CRITERIA.map((c) => crit[c.key])) : null;
      if (ov != null) scoreIn.value = `Band ${ov.toFixed(1)}`;
    };
    sels.forEach((x) => { x.onchange = syncOverall; });
    critBox = el("div", { class: "crit-inputs" }, CRITERIA.map((c, i) =>
      el("label", { class: "crit-input", for: sels[i].id }, el("span", { class: "tiny strong" }, c.name), sels[i])));
  }
  const saveBtn = el("button", { class: "btn btn-teal btn-sm" }, icon("check"), L("Lưu điểm", "Save mark"));
  const markChip = el("span", { class: s.gradedAt || s.teacherScore ? "chip chip-gold" : "chip chip-warn" },
    s.teacherScore || (s.gradedAt ? L("Đã chấm", "Marked") : L("Chờ chấm", "To mark")));
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    try {
      const criteria = readCriteria();
      await gradeHomework(s.id, { score: scoreIn.value.trim(), comment: comment.value.trim(), graderEmail: ctx.user.email || "", criteria });
      s.teacherCriteria = criteria;
      s.teacherScore = scoreIn.value.trim(); s.gradedAt = new Date();
      markChip.className = "chip chip-gold"; markChip.textContent = s.teacherScore || L("Đã chấm", "Marked");
      toast(L("Đã lưu điểm", "Mark saved"), "ok");
    } catch (err) { toast(err.message, "err"); } finally { saveBtn.disabled = false; }
  };
  details.append(el("div", { class: "hw-grade" },
    critBox,
    el("label", { class: "field-label mb-0", for: scoreIn.id }, a.type === "speaking" ? L("Band tổng", "Overall band") : L("Điểm", "Mark")), scoreIn, comment, el("div", {}, saveBtn)));

  const toggle = el("button", { class: "btn btn-sm", onclick: () => {
    const open = details.classList.toggle("hidden") === false;
    toggle.textContent = open ? L("Thu gọn", "Hide") : L("Xem bài", "Open");
  } }, L("Xem bài", "Open"));

  return el("div", { class: "hw-review-row" + (isLate ? " late" : "") },
    el("div", { class: "row wrap", style: "gap:12px;width:100%" },
      who, el("div", { class: "spacer" }),
      el("span", { class: "small muted" }, fmtDateTime(s.submittedAt)),
      isLate ? el("span", { class: "chip chip-warn" }, L("muộn", "late")) : null,
      auto != null ? el("span", { class: "chip" }, `${auto}/${autoTotal}`) : null,
      aiBand ? el("span", { class: "chip chip-ai", title: L("Band AI ước lượng", "AI-estimated band") }, `AI ${aiBand}`) : null,
      a.type === "speaking" && s.analysisError ? el("span", { class: "chip chip-bad" }, L("AI lỗi", "AI failed")) : null,
      s.files?.length ? el("span", { class: "chip" }, icon(a.type === "speaking" ? "mic" : "file"), String(s.files.length)) : null,
      markChip, toggle),
    details);
}

/* ======================= Widget trang chủ ======================= */
export function homeworkWidget(ctx) {
  const box = el("div", { class: "hw-widget" });
  if (isAdmin(ctx.user)) return box; // giáo viên xem ở tab Homework
  if (!hasClass()) { box.append(joinPromptCard(ctx)); return box; }
  Promise.all([listAssignments({ admin: false, classIds: myClasses().map((c) => c.id) }), listMyHomework(ctx.user.uid)]).then(([list, mine]) => {
    const todo = list.filter((a) => ["todo", "late-ok"].includes(statusOf(a, mine.get(a.id)))).slice(0, 3);
    if (!todo.length) return;
    box.append(el("div", { class: "section-head" },
      el("h2", {}, L("Bài tập sắp đến hạn", "Homework due")),
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go("homework") }, L("Tất cả", "See all"), icon("arrow"))),
      el("div", { class: "hw-grid" }, todo.map((a) => hwCard(ctx, a, null))));
  }).catch(() => { /* chưa có bài tập hoặc chưa cấu hình */ });
  return box;
}

