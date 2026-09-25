// LỚP HỌC — kiểu Google Classroom: danh sách lớp, trang lớp (Bài tập · Thành viên), vào lớp bằng mã
import { el, icon, toast, confirmDialog, fmtDateTime } from "../ui.js";
import { createCat } from "../cat.js";
import { isAdmin } from "../firebase.js";
import { L } from "../i18n.js";
import {
  myClasses, loadMyClasses, listAllClasses, getClass, createClass, updateClass, resetCode,
  listMembers, countMembers, removeMember, lookupCode, joinClass, normCode, orphanAssignments, adoptAssignments,
} from "./clstore.js";
import { listAssignments, listMyHomework, countSubmissions } from "../homework/hwstore.js";
import { studentLists, teacherTable } from "../homework/views.js";

// màu dải đầu thẻ lớp (chọn theo id để mỗi lớp giữ một màu)
const BANNERS = ["#4fb58c", "#7c8cf0", "#e0892a", "#d9669b", "#3fa7a0", "#a47ad8", "#e46f6a", "#4a9fd8"];
const colorOf = (id) => BANNERS[[...String(id)].reduce((s, ch) => s + ch.charCodeAt(0), 0) % BANNERS.length];
const inviteLink = (code) => `${location.origin}${location.pathname}#join/${code}`;
const loading = () => el("div", { class: "card muted" }, L("Đang tải…", "Loading…"));
const errBox = (err) => el("div", { class: "notice notice-error" }, err.message || String(err));

async function copy(text, what) {
  try { await navigator.clipboard.writeText(text); toast(L(`Đã chép ${what}`, `${what} copied`), "ok"); }
  catch { window.prompt(L("Chép thủ công:", "Copy this:"), text); }
}

/* ======================= Hộp nhập liệu ======================= */
/** fields: [{ id, label, value, placeholder, hint }] -> Promise<{id: value} | null> */
function formDialog({ title, intro = "", fields, okText }) {
  return new Promise((resolve) => {
    const back = el("div", { class: "modal-back" });
    const inputs = fields.map((f) => el("input", { type: "text", id: `dlg-${f.id}`, value: f.value || "", placeholder: f.placeholder || "",
      style: "width:100%", maxlength: f.max || 80, autocomplete: "off", class: f.mono ? "mono cl-code-input" : "" }));
    const close = (v) => { back.remove(); resolve(v); };
    const ok = () => close(Object.fromEntries(fields.map((f, i) => [f.id, inputs[i].value.trim()])));
    inputs.forEach((inp) => inp.addEventListener("keydown", (e) => { if (e.key === "Enter") ok(); if (e.key === "Escape") close(null); }));
    back.append(el("div", { class: "modal" },
      el("h3", {}, title),
      intro ? el("p", { class: "muted small" }, intro) : null,
      el("div", { class: "stack-sm" }, fields.map((f, i) => el("div", {},
        el("label", { class: "field-label", for: `dlg-${f.id}` }, f.label), inputs[i],
        f.hint ? el("div", { class: "tiny muted", style: "margin-top:4px" }, f.hint) : null))),
      el("div", { class: "modal-actions" },
        el("button", { class: "btn", onclick: () => close(null) }, L("Huỷ", "Cancel")),
        el("button", { class: "btn btn-primary", onclick: ok }, okText))));
    back.addEventListener("click", (e) => { if (e.target === back) close(null); });
    document.body.append(back);
    inputs[0]?.focus();
  });
}

/* ======================= Học sinh: vào lớp ======================= */
function joinError(err) {
  if (err.code === "bad-code") return L("Không có lớp nào dùng mã này. Kiểm tra lại với giáo viên.", "No class uses that code. Check it with your teacher.");
  if (err.code === "closed") return L("Lớp này đang khoá, không nhận thêm học sinh. Hỏi giáo viên nhé.", "This class isn't accepting new students. Ask your teacher.");
  return err.message;
}

/** Vào lớp bằng mã; xong thì mở trang lớp. Trả về true nếu vào được */
export async function tryJoin(ctx, code, { quiet = false } = {}) {
  try {
    const { cls, already } = await joinClass(code, ctx.user);
    toast(already ? L(`Bạn đã ở trong lớp ${cls.name}`, `You're already in ${cls.name}`) : L(`Đã vào lớp ${cls.name}`, `Joined ${cls.name}`), "ok", 4000);
    ctx.go(`class/${cls.id}`);
    return true;
  } catch (err) {
    if (!quiet) toast(joinError(err), "err", 6000);
    return false;
  }
}

export async function joinDialog(ctx, preset = "") {
  for (;;) {
    const v = await formDialog({
      title: L("Tham gia lớp", "Join class"),
      intro: L("Nhập mã lớp giáo viên gửi cho bạn (6 ký tự, không phân biệt hoa thường).", "Enter the class code your teacher gave you (6 characters, any case)."),
      fields: [{ id: "code", label: L("Mã lớp", "Class code"), value: preset, placeholder: "ABC234", max: 12, mono: true }],
      okText: L("Tham gia", "Join"),
    });
    if (!v) return;
    if (normCode(v.code).length < 5) { toast(L("Mã lớp gồm 6 ký tự.", "Class codes have 6 characters."), "err"); preset = v.code; continue; }
    if (await tryJoin(ctx, v.code)) return;
    preset = v.code;
  }
}

/** Trang Homework khi chưa vào lớp nào */
export function noClassView(ctx) {
  const cat = createCat({ size: 150, mood: "think", bubbleSide: "left", say: L("Bạn chưa vào lớp nào", "You're not in a class yet") });
  return el("div", { class: "stack-lg" },
    el("section", { class: "games-hero" },
      el("div", { style: "flex:1;min-width:240px" },
        el("div", { class: "eyebrow" }, "Homework"),
        el("h1", {}, L("Vào lớp để nhận bài tập", "Join a class to get homework")),
        el("p", { class: "lead" }, L("Bài tập về nhà do giáo viên giao theo lớp. Nhập mã lớp giáo viên gửi để thấy bài tập. Trong lúc chờ, bạn vẫn dùng được Từ vựng, Ngân hàng đề, Thi thử, Idioms và Puns.",
          "Homework is set per class. Enter the class code from your teacher to see it. Meanwhile, Vocabulary, the Practice bank, Tests, Idioms and Puns are all open to you.")),
        el("button", { class: "btn btn-primary btn-lg", onclick: () => joinDialog(ctx) }, icon("users"), L("Nhập mã lớp", "Enter class code"))),
      el("div", { class: "games-hero-cat" }, cat)));
}

/** Thẻ nhỏ ở trang chủ mời học sinh vào lớp */
export function joinPromptCard(ctx) {
  return el("div", { class: "card cl-prompt row wrap" },
    el("span", { class: "cl-prompt-ic" }, icon("users")),
    el("div", { style: "flex:1;min-width:200px" },
      el("strong", {}, L("Bạn chưa ở trong lớp nào", "You're not in a class yet")),
      el("div", { class: "small muted" }, L("Có mã lớp của giáo viên? Nhập vào để nhận bài tập về nhà.", "Got a class code from your teacher? Enter it to receive homework."))),
    el("button", { class: "btn btn-primary", onclick: () => joinDialog(ctx) }, L("Nhập mã lớp", "Enter class code")));
}

/** #join/<MÃ> — mở từ link mời */
export function renderJoin(ctx, code) {
  const wrap = el("div", { class: "stack-lg", style: "max-width:560px;margin:0 auto" });
  const body = loading();
  wrap.append(body);
  (async () => {
    if (isAdmin(ctx.user)) { body.replaceWith(el("div", { class: "notice notice-info" }, L("Bạn là giáo viên — link này dành cho học sinh.", "You're a teacher — this link is for students."))); return; }
    const hit = await lookupCode(code);
    if (!hit) { body.replaceWith(el("div", { class: "notice notice-error" }, joinError({ code: "bad-code" }))); return; }
    const already = myClasses().find((c) => c.id === hit.classId);
    if (already) { ctx.go(`class/${already.id}`); return; }
    body.replaceWith(el("div", { class: "card stack center" },
      el("div", { class: "cl-banner", style: `--cl:${colorOf(hit.classId)}` }, el("h2", {}, hit.name),
        hit.teacherName ? el("div", {}, hit.teacherName) : null),
      el("p", { class: "muted" }, L("Bạn được mời vào lớp này. Vào lớp để nhận bài tập giáo viên giao.", "You've been invited to this class. Join to receive its homework.")),
      el("button", { class: "btn btn-primary btn-lg", onclick: (e) => { e.target.disabled = true; tryJoin(ctx, code).then((ok) => { e.target.disabled = ok; }); } },
        icon("users"), L("Tham gia lớp", "Join class"))));
  })().catch((err) => body.replaceWith(errBox(err)));
  return wrap;
}

/* ======================= Danh sách lớp ======================= */
function classCard(ctx, c, teacher, size) {
  return el("button", { class: "cl-card" + (c.archived ? " archived" : ""), style: `--cl:${colorOf(c.id)}`, onclick: () => ctx.go(`class/${c.id}`) },
    el("div", { class: "cl-card-top" },
      el("h3", {}, c.name),
      c.section ? el("div", { class: "cl-sec" }, c.section) : null,
      !teacher && c.teacherName ? el("div", { class: "cl-sec" }, c.teacherName) : null),
    el("div", { class: "cl-card-body" },
      teacher ? el("div", { class: "row wrap", style: "gap:6px" },
        el("span", { class: "chip" }, icon("users"), L(`${size || 0} học sinh`, `${size || 0} student${size === 1 ? "" : "s"}`)),
        c.archived ? el("span", { class: "chip" }, L("Đã lưu trữ", "Archived"))
        : el("span", { class: "chip mono" }, c.code),
        !c.archived && !c.joinOpen ? el("span", { class: "chip chip-warn" }, L("Đang khoá", "Closed")) : null)
      : el("span", { class: "small muted" }, L("Mở lớp", "Open class"), " ", icon("arrow"))));
}

export function renderClasses(ctx) {
  const teacher = isAdmin(ctx.user);
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("section", { class: "games-hero" },
    el("div", { style: "flex:1;min-width:240px" },
      el("div", { class: "eyebrow" }, teacher ? L("Giáo viên", "Teacher") : L("Lớp học", "Classes")),
      el("h1", {}, teacher ? L("Lớp học của bạn", "Your classes") : L("Lớp của tôi", "My classes")),
      el("p", { class: "lead" }, teacher
        ? L("Tạo lớp, gửi mã lớp (hoặc link mời) cho học sinh. Học sinh chỉ thấy bài tập của lớp mình.",
          "Create a class and share its code (or invite link). Students only see homework for their own classes.")
        : L("Lớp giáo viên đã cho bạn vào. Có mã lớp mới thì bấm Tham gia lớp.", "Classes you're enrolled in. Got a new code? Tap Join class.")),
      teacher
        ? el("button", { class: "btn btn-primary btn-lg", onclick: () => newClass(ctx) }, icon("users"), L("Tạo lớp", "Create class"))
        : el("button", { class: "btn btn-primary btn-lg", onclick: () => joinDialog(ctx) }, icon("users"), L("Tham gia lớp", "Join class"))),
    el("div", { class: "games-hero-cat" }, createCat({ size: 120, mood: "happy", bubbleSide: "left" }))));
  const body = loading();
  wrap.append(body);

  (async () => {
    if (!teacher) {
      const list = await loadMyClasses(ctx.user);
      body.replaceWith(list.length
        ? el("div", { class: "cl-grid" }, list.map((c) => classCard(ctx, c, false)))
        : el("div", { class: "card muted" }, L("Bạn chưa ở trong lớp nào. Bấm “Tham gia lớp” và nhập mã giáo viên gửi.", "You're not in any class yet. Tap “Join class” and enter the code from your teacher.")));
      return;
    }
    const [list, sizes, orphans] = await Promise.all([listAllClasses(), countMembers(), orphanAssignments().catch(() => [])]);
    const active = list.filter((c) => !c.archived), archived = list.filter((c) => c.archived);
    body.replaceWith(el("div", { class: "stack-lg" },
      orphans.length ? migrateBanner(ctx, orphans, active) : null,
      active.length ? el("div", { class: "cl-grid" }, active.map((c) => classCard(ctx, c, true, sizes.get(c.id))))
        : el("div", { class: "card muted" }, L("Chưa có lớp nào. Bấm “Tạo lớp” để bắt đầu.", "No classes yet. Tap “Create class” to start.")),
      archived.length ? el("details", { class: "cl-archived" },
        el("summary", {}, L(`Lớp đã lưu trữ (${archived.length})`, `Archived classes (${archived.length})`)),
        el("div", { class: "cl-grid", style: "margin-top:12px" }, archived.map((c) => classCard(ctx, c, true, sizes.get(c.id))))) : null));
  })().catch((err) => body.replaceWith(errBox(err)));
  return wrap;
}

async function newClass(ctx) {
  const v = await formDialog({
    title: L("Tạo lớp", "Create class"),
    fields: [
      { id: "name", label: L("Tên lớp (bắt buộc)", "Class name (required)"), placeholder: L("Ví dụ: IELTS 6.5 — Tối T3/T5", "e.g. IELTS 6.5 — Tue/Thu evening") },
      { id: "section", label: L("Phần / khoá (tuỳ chọn)", "Section (optional)"), placeholder: L("Ví dụ: Khoá 09/2026", "e.g. Sept 2026 intake") },
    ],
    okText: L("Tạo", "Create"),
  });
  if (!v) return;
  if (!v.name) { toast(L("Lớp cần có tên.", "The class needs a name."), "err"); return; }
  try {
    const id = await createClass(v, ctx.user);
    toast(L("Đã tạo lớp — gửi mã lớp cho học sinh nhé", "Class created — share the code with your students"), "ok", 4500);
    ctx.go(`class/${id}`);
  } catch (err) { toast(err.message, "err", 6000); }
}

/** Bài tập tạo trước khi có tính năng lớp: gom vào một lớp */
function migrateBanner(ctx, ids, classes) {
  const NEW = "__new__";
  const sel = el("select", { class: "pick" },
    el("option", { value: NEW }, L("+ Tạo lớp mới “Lớp hiện tại”", "+ New class “Current class”")),
    classes.map((c) => el("option", { value: c.id }, c.name)));
  const btn = el("button", { class: "btn btn-primary btn-sm" }, L("Chuyển vào", "Move"));
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      const cid = sel.value === NEW ? await createClass({ name: L("Lớp hiện tại", "Current class"), section: "" }, ctx.user) : sel.value;
      await adoptAssignments(ids, cid);
      toast(L(`Đã chuyển ${ids.length} bài tập vào lớp. Gửi mã lớp cho học sinh cũ để các em vào lại.`,
        `Moved ${ids.length} assignments. Share the class code so existing students can rejoin.`), "ok", 6000);
      ctx.go(`class/${cid}`);
    } catch (err) { btn.disabled = false; toast(err.message, "err", 6000); }
  };
  return el("div", { class: "notice notice-warn stack-sm" },
    el("div", {}, L(`Có ${ids.length} bài tập cũ chưa thuộc lớp nào — học sinh hiện không thấy các bài này. Chọn lớp để chuyển vào (bài nộp và điểm giữ nguyên):`,
      `${ids.length} older assignments don't belong to a class, so students can't see them. Pick a class to move them into (submissions and marks are kept):`)),
    el("div", { class: "row wrap", style: "gap:8px" }, sel, btn));
}

/* ======================= Trang một lớp ======================= */
export function renderClass(ctx, id, tab = "work") {
  const teacher = isAdmin(ctx.user);
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("classes") }, icon("back"), L("Lớp học", "Classes")));
  const body = loading();
  wrap.append(body);

  (async () => {
    const c = await getClass(id).catch(() => null);
    if (!c) { body.replaceWith(el("div", { class: "notice notice-error" }, L("Không mở được lớp này (lớp không tồn tại hoặc bạn không ở trong lớp).", "Can't open this class (it doesn't exist or you're not in it)."))); return; }
    const tabs = el("div", { class: "cl-tabs", role: "tablist" },
      [["work", L("Bài tập", "Classwork")], ["people", L("Thành viên", "People")]].map(([k, t]) =>
        el("button", { class: tab === k ? "on" : "", role: "tab", "aria-selected": String(tab === k), onclick: () => ctx.go(k === "work" ? `class/${id}` : `class/${id}/people`) }, t)));
    const content = loading();
    body.replaceWith(el("div", { class: "stack-lg" }, classHeader(ctx, c, teacher), tabs, content));
    const view = tab === "people" ? await peopleTab(ctx, c, teacher) : await workTab(ctx, c, teacher);
    content.replaceWith(view);
  })().catch((err) => body.replaceWith(errBox(err)));
  return wrap;
}

function classHeader(ctx, c, teacher) {
  const head = el("section", { class: "cl-banner cl-banner-lg", style: `--cl:${colorOf(c.id)}` },
    el("h1", {}, c.name),
    c.section ? el("div", { class: "cl-sec" }, c.section) : null,
    !teacher && c.teacherName ? el("div", { class: "cl-sec" }, L("Giáo viên: ", "Teacher: "), c.teacherName) : null,
    c.archived ? el("span", { class: "chip", style: "margin-top:8px" }, L("Đã lưu trữ", "Archived")) : null);
  if (!teacher) return head;

  const act = (ic, text, fn, cls = "btn btn-sm") => el("button", { class: cls, onclick: fn }, icon(ic), text);
  const reload = () => ctx.go(location.hash.replace("#", "") || `class/${c.id}`);
  const codeBox = c.archived ? null : el("div", { class: "card cl-code-card" },
    el("div", { class: "field-label mb-0" }, L("Mã lớp", "Class code")),
    el("div", { class: "cl-code mono" + (c.joinOpen ? "" : " off") }, c.code),
    c.joinOpen ? null : el("div", { class: "chip chip-warn" }, L("Đang khoá — học sinh mới không vào được", "Closed — new students can't join")),
    el("div", { class: "row wrap", style: "gap:6px;justify-content:center" },
      act("file", L("Chép mã", "Copy code"), () => copy(c.code, L("mã lớp", "Class code"))),
      act("link", L("Chép link mời", "Copy invite link"), () => copy(inviteLink(c.code), L("link mời", "Invite link")))));

  const tools = el("div", { class: "row wrap", style: "gap:6px" },
    act("writing", L("Đổi tên", "Rename"), async () => {
      const v = await formDialog({ title: L("Sửa thông tin lớp", "Edit class"), okText: L("Lưu", "Save"), fields: [
        { id: "name", label: L("Tên lớp", "Class name"), value: c.name }, { id: "section", label: L("Phần / khoá", "Section"), value: c.section }] });
      if (!v || !v.name) return;
      await updateClass(c, { name: v.name, section: v.section });
      toast(L("Đã lưu", "Saved"), "ok"); reload();
    }),
    c.archived ? null : act("refresh", L("Đặt lại mã", "Reset code"), async () => {
      const ok = await confirmDialog({ title: L("Đặt lại mã lớp?", "Reset the class code?"),
        body: L("Mã cũ và link mời cũ sẽ hết dùng được. Học sinh đã vào lớp vẫn ở lại.", "The old code and invite link stop working. Students already in the class stay."),
        okText: L("Đặt lại", "Reset") });
      if (!ok) return;
      await resetCode(c); toast(L("Đã đổi mã lớp", "Class code changed"), "ok"); reload();
    }),
    c.archived ? null : act(c.joinOpen ? "x" : "check", c.joinOpen ? L("Khoá, không nhận thêm", "Stop new joins") : L("Mở lại cho vào lớp", "Allow new joins"), async () => {
      await updateClass(c, { joinOpen: !c.joinOpen }); reload();
    }),
    act(c.archived ? "refresh" : "download", c.archived ? L("Khôi phục lớp", "Restore class") : L("Lưu trữ lớp", "Archive class"), async () => {
      if (!c.archived) {
        const ok = await confirmDialog({ title: L("Lưu trữ lớp này?", "Archive this class?"),
          body: L("Lớp chuyển xuống mục Đã lưu trữ và không nhận thêm học sinh. Bài tập, bài nộp và điểm vẫn giữ nguyên, học sinh vẫn xem lại được. Có thể khôi phục bất cứ lúc nào.",
            "The class moves to Archived and stops accepting students. Homework, submissions and marks are kept, and students can still view them. You can restore it anytime."),
          okText: L("Lưu trữ", "Archive") });
        if (!ok) return;
      }
      await updateClass(c, { archived: !c.archived }); reload();
    }, "btn btn-sm btn-ghost"));
  return el("div", { class: "cl-head-grid" }, el("div", { class: "stack" }, head, tools), codeBox);
}

async function workTab(ctx, c, teacher) {
  if (teacher) {
    const [list, counts, members] = await Promise.all([listAssignments({ admin: true, classId: c.id }), countSubmissions(), listMembers(c.id)]);
    return el("div", { class: "stack" },
      c.archived ? null : el("div", {}, el("button", { class: "btn btn-primary", onclick: () => ctx.go("homework/new", { classId: c.id }) },
        icon("upload"), L("Tạo bài tập cho lớp", "New assignment for this class"))),
      list.length ? teacherTable(ctx, list, counts, () => members.length)
        : el("div", { class: "card muted" }, L("Lớp này chưa có bài tập.", "No homework in this class yet.")));
  }
  const [list, mine] = await Promise.all([listAssignments({ admin: false, classIds: [c.id] }), listMyHomework(ctx.user.uid)]);
  return list.length ? studentLists(ctx, list, mine)
    : el("div", { class: "card muted" }, L("Giáo viên chưa giao bài tập nào cho lớp này.", "Your teacher hasn't set any homework for this class yet."));
}

async function peopleTab(ctx, c, teacher) {
  const teacherRow = el("div", { class: "stack-sm" },
    el("h2", { class: "cl-people-h" }, L("Giáo viên", "Teacher")),
    el("div", { class: "cl-person" }, el("div", { class: "avatar avatar-letter" }, (c.teacherName || "T").slice(0, 1).toUpperCase()),
      el("span", { class: "strong" }, c.teacherName || L("Giáo viên", "Teacher"))));

  if (!teacher) {
    return el("div", { class: "card stack" }, teacherRow,
      el("div", { class: "row wrap", style: "gap:10px;margin-top:10px" },
        el("span", { class: "small muted", style: "flex:1" }, L("Rời lớp thì bạn không thấy bài tập của lớp nữa. Bài đã nộp vẫn được giữ.", "If you leave, you won't see this class's homework any more. Work you've submitted is kept.")),
        el("button", { class: "btn btn-sm btn-ghost", onclick: async () => {
          const ok = await confirmDialog({ title: L(`Rời lớp ${c.name}?`, `Leave ${c.name}?`), body: L("Muốn vào lại bạn cần mã lớp.", "You'll need the class code to rejoin."), okText: L("Rời lớp", "Leave"), danger: true });
          if (!ok) return;
          await removeMember(c.id, ctx.user.uid);
          await loadMyClasses(ctx.user);
          toast(L("Đã rời lớp", "You left the class"), "ok");
          ctx.go("classes");
        } }, L("Rời lớp", "Leave class"))));
  }

  const members = await listMembers(c.id);
  const list = el("div", { class: "stack-sm" });
  if (!members.length) list.append(el("p", { class: "muted small" }, L("Chưa có học sinh. Gửi mã lớp hoặc link mời để học sinh tự vào.", "No students yet. Share the class code or invite link so students can join.")));
  for (const m of members) {
    list.append(el("div", { class: "cl-person" },
      m.photoURL ? el("img", { class: "avatar", src: m.photoURL, alt: "", referrerpolicy: "no-referrer" })
        : el("div", { class: "avatar avatar-letter" }, (m.name || "?").slice(0, 1).toUpperCase()),
      el("div", { style: "flex:1;min-width:0" }, el("div", { class: "strong" }, m.name || "—"), el("div", { class: "tiny muted" }, m.email || "")),
      m.joinedAt ? el("span", { class: "tiny muted nowrap" }, L("Vào ", "Joined "), fmtDateTime(m.joinedAt).replace(/\s.*$/, "")) : null,
      el("button", { class: "icon-btn", title: L("Xoá khỏi lớp", "Remove from class"), onclick: async () => {
        const ok = await confirmDialog({ title: L(`Xoá ${m.name || "học sinh"} khỏi lớp?`, `Remove ${m.name || "this student"}?`),
          body: L("Học sinh sẽ không thấy bài tập của lớp nữa. Bài đã nộp vẫn giữ. Học sinh có thể vào lại bằng mã lớp — muốn chặn hẳn thì đặt lại mã.",
            "They'll lose access to this class's homework. Their submissions are kept. They could rejoin with the code — reset it to stop that."),
          okText: L("Xoá", "Remove"), danger: true });
        if (!ok) return;
        await removeMember(c.id, m.uid);
        toast(L("Đã xoá khỏi lớp", "Removed"), "ok");
        ctx.go(`class/${c.id}/people`);
      } }, icon("x"))));
  }
  return el("div", { class: "card stack" }, teacherRow,
    el("h2", { class: "cl-people-h" }, L(`Học sinh (${members.length})`, `Students (${members.length})`)), list);
}

