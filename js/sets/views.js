// Học phần: thư viện, chi tiết, soạn học phần
import { el, icon, toast, confirmDialog, speakText } from "../ui.js";
import { L } from "../i18n.js";
import { isAdmin } from "../firebase.js";
import { meaning } from "../data/vocab.js";
import { listMySets, listTeacherSets, saveSet, deleteSet, MAX_CARDS } from "./store.js";
import { resolveSet, DECKS, starredIds, toggleStar } from "./cards.js";
import { MODES, renderStudy } from "./modes.js";

const SERIES = [
  ["ielts", L("IELTS theo chủ đề", "IELTS topics")],
  ["evu", "Vocabulary in Use"],
  ["ows", "Oxford Word Skills"],
];

const setUrl = (ref) => `${location.origin}${location.pathname}#set/${ref}`;
const loading = () => el("div", { class: "muted small" }, L("Đang tải…", "Loading…"));
const notFound = (ctx) => el("div", { class: "notice notice-warn" }, L("Không tìm thấy học phần này, hoặc bạn không có quyền xem.", "Set not found, or you don't have access."),
  " ", el("a", { href: "#sets", onclick: (e) => { e.preventDefault(); ctx.go("sets"); } }, L("Về thư viện", "Back to library")));

function setCard(ctx, ref, title, sub, count, color) {
  return el("a", { class: "set-card", href: `#set/${ref}`, style: color ? `--deck:${color}` : null,
    onclick: (e) => { e.preventDefault(); ctx.go(`set/${ref}`); } },
    el("div", { class: "set-card-title" }, title),
    el("div", { class: "muted small" }, sub || ""),
    el("div", { class: "chip" }, L(`${count} thẻ`, `${count} cards`)));
}

/* ======================= THƯ VIỆN ======================= */
export function renderSetsHub(ctx) {
  const wrap = el("div", { class: "stack-lg" });
  const teacher = isAdmin(ctx.user);
  wrap.append(el("section", { class: "vocab-hero" },
    el("div", { class: "vocab-hero-text" },
      el("div", { class: "eyebrow" }, L("Học phần", "Study sets")),
      el("h1", {}, L("Học từ theo cách của bạn", "Study words your way")),
      el("p", { class: "lead" }, L("Tạo học phần riêng hoặc chọn bộ từ có sẵn, rồi học bằng thẻ ghi nhớ, Learn, Write, Spell, Test, Match hoặc chơi live cùng cả lớp.",
        "Make your own set or pick a ready-made deck, then study with flashcards, Learn, Write, Spell, Test, Match, or play live with the class.")),
      el("div", { class: "row wrap", style: "gap:10px" },
        el("button", { class: "btn btn-primary btn-lg", onclick: () => ctx.go("sets/new") }, icon("plus"), L("Tạo học phần", "Create a set")),
        el("button", { class: "btn btn-lg", onclick: () => ctx.go("live") }, icon("qr"), L("Vào phòng live", "Join a live game")),
        teacher ? el("button", { class: "btn btn-lg", onclick: () => ctx.go("live/new") }, icon("game"), L("Tạo phòng live", "Host a live game")) : null))));

  const mine = el("div", { class: "set-grid" }, loading());
  const theirs = el("div", { class: "set-grid" }, loading());
  wrap.append(
    el("section", {}, el("h2", {}, L("Học phần của tôi", "My sets")), mine),
    el("section", {}, el("h2", {}, L("Giáo viên chia sẻ", "Shared by teachers")), theirs));

  listMySets(ctx.user).then((list) => {
    mine.innerHTML = "";
    if (!list.length) mine.append(el("p", { class: "muted" }, L("Chưa có học phần nào. Bấm “Tạo học phần” để bắt đầu.", "No sets yet. Tap “Create a set” to begin.")));
    list.forEach((s) => mine.append(setCard(ctx, `my:${s.id}`, s.title, s.shared ? L("Chia sẻ bằng link", "Shared by link") : L("Riêng tư", "Private"), s.count ?? s.cards.length)));
  }).catch(() => { mine.innerHTML = ""; mine.append(el("p", { class: "muted" }, L("Không tải được học phần.", "Could not load your sets."))); });

  listTeacherSets(ctx.user).then((list) => {
    theirs.innerHTML = "";
    if (!list.length) theirs.append(el("p", { class: "muted" }, L("Giáo viên chưa chia sẻ học phần nào.", "No teacher sets yet.")));
    list.forEach((s) => theirs.append(setCard(ctx, `my:${s.id}`, s.title, s.ownerName, s.count ?? s.cards.length)));
  }).catch(() => { theirs.innerHTML = ""; });

  // Bộ từ có sẵn + sổ từ
  const deckBox = el("div", { class: "set-grid" });
  let series = "ielts";
  const tabs = el("div", { class: "deck-tabs" });
  const paint = () => {
    [...tabs.children].forEach((b) => b.classList.toggle("on", b.dataset.s === series));
    deckBox.innerHTML = "";
    DECKS.filter((d) => d.series === series).forEach((d) => deckBox.append(setCard(ctx, `deck:${d.id}`, d.title, d.units || d.sub, d.words.length, d.color)));
  };
  SERIES.forEach(([id, label]) => tabs.append(el("button", { type: "button", class: "deck-tab", dataset: { s: id }, onclick: () => { series = id; paint(); } }, label)));
  paint();
  wrap.append(el("section", {},
    el("h2", {}, L("Bộ từ có sẵn", "Ready-made decks")),
    el("div", { class: "set-grid", style: "margin-bottom:12px" },
      setCard(ctx, "saved", L("Sổ từ của tôi", "My word bank"), "", "·"),
      setCard(ctx, "learning", L("Từ đang học", "Words in progress"), "", "·")),
    tabs, deckBox));
  return wrap;
}

/* ======================= CHI TIẾT ======================= */
export function renderSetDetail(ctx, ref) {
  const root = el("div", { class: "stack-lg" }, loading());
  resolveSet(ctx.user, ref).then((r) => {
    root.innerHTML = "";
    if (!r) { root.append(notFound(ctx)); return; }
    const teacher = isAdmin(ctx.user);
    const stars = () => starredIds(ref);

    const head = el("section", { class: "card" },
      el("div", { class: "row wrap", style: "gap:12px;align-items:flex-start" },
        el("div", { style: "flex:1 1 280px" },
          el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go("sets") }, icon("back"), L("Thư viện", "Library")),
          el("h1", { style: "margin:6px 0" }, r.title),
          el("div", { class: "muted" }, [r.sub, L(`${r.cards.length} thẻ`, `${r.cards.length} cards`)].filter(Boolean).join(" · ")),
          r.set?.desc ? el("p", {}, r.set.desc) : null),
        el("div", { class: "row wrap", style: "gap:8px" },
          r.editable ? el("button", { class: "btn btn-sm", onclick: () => ctx.go(`sets/edit/${r.set.id}`) }, icon("edit"), L("Sửa", "Edit")) : null,
          r.set && !r.editable ? el("button", { class: "btn btn-sm", onclick: () => copySet(ctx, r) }, icon("copy"), L("Lưu bản sao", "Save a copy")) : null,
          r.set ? el("button", { class: "btn btn-sm", onclick: () => navigator.clipboard?.writeText(setUrl(ref)).then(() => toast(L("Đã chép link học phần.", "Set link copied."), "ok")) }, icon("link"), L("Chép link", "Copy link")) : null,
          r.editable ? el("button", { class: "btn btn-sm btn-danger", onclick: async () => {
            if (await confirmDialog({ title: L("Xoá học phần?", "Delete this set?"), body: L("Không khôi phục được.", "This can't be undone."), danger: true, okText: L("Xoá", "Delete") })) {
              await deleteSet(ctx.user, r.set.id); toast(L("Đã xoá.", "Deleted."), "ok"); ctx.go("sets");
            } } }, icon("trash"), L("Xoá", "Delete")) : null)));
    if (r.set && r.editable && !r.set.shared) head.append(el("p", { class: "muted small mb-0" }, L("Học phần đang riêng tư. Muốn gửi link cho bạn bè, bấm Sửa và bật “Chia sẻ bằng link”.", "This set is private. To send the link to friends, tap Edit and turn on “Share by link”.")));

    const modes = el("div", { class: "mode-grid" }, MODES.map((m) =>
      el("button", { class: "mode-card", disabled: r.cards.length < 2 ? "" : null, onclick: () => ctx.go(`study/${m.id}/${ref}`) },
        el("span", { class: "game-ico" }, icon(m.icon)), el("b", {}, m.name), el("span", { class: "muted small" }, m.desc))));
    if (teacher && r.cards.length >= 4) modes.append(el("button", { class: "mode-card live", onclick: () => ctx.go(`live/new/${ref}`) },
      el("span", { class: "game-ico" }, icon("game")), el("b", {}, L("Chơi live", "Live game")), el("span", { class: "muted small" }, L("Cả lớp vào bằng mã hoặc QR, thi cá nhân hoặc theo nhóm", "Class joins by code or QR, solo or in teams"))));

    const list = el("div", { class: "card-list" });
    const paint = () => {
      list.innerHTML = "";
      r.cards.forEach((c) => {
        const on = stars().has(c.id);
        const st = el("button", { class: "icon-btn" + (on ? " on" : ""), title: L("Gắn sao", "Star"), onclick: () => { toggleStar(ref, c.id); paint(); } }, icon("star"));
        list.append(el("div", { class: "card-row" },
          el("div", { class: "card-term" }, el("b", {}, c.word), c.ipa ? el("span", { class: "ipa" }, " " + c.ipa) : null),
          el("div", { class: "card-def" }, meaning(c)),
          el("button", { class: "icon-btn", title: L("Đọc", "Listen"), onclick: () => speakText(c.word) }, icon("volume")), st));
      });
    };
    paint();
    root.append(head, modes, el("section", {}, el("h2", {}, L("Danh sách thẻ", "Cards")), list));
  }).catch((err) => { console.warn(err); root.innerHTML = ""; root.append(notFound(ctx)); });
  return root;
}

async function copySet(ctx, r) {
  const id = await saveSet(ctx.user, { title: r.title, desc: r.set.desc, cards: r.set.cards, shared: false });
  toast(L("Đã lưu bản sao vào học phần của bạn.", "A copy was saved to your sets."), "ok");
  ctx.go(`set/my:${id}`);
}

/* ======================= SOẠN HỌC PHẦN ======================= */
/** Đọc văn bản dán vào: mỗi dòng "từ <tab> nghĩa"; không có tab thì thử " - ", " – ", " — ", ":" , ";" , "," */
export function parseImport(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let parts = null;
    if (line.includes("\t")) parts = line.split("\t");
    else {
      for (const sep of [" - ", " – ", " — ", " : ", ";", ":", ","]) {
        const i = line.indexOf(sep);
        if (i > 0) { parts = [line.slice(0, i), line.slice(i + sep.length)]; break; }
      }
    }
    if (parts && parts[0].trim() && parts.slice(1).join(" ").trim()) out.push({ t: parts[0].trim(), d: parts.slice(1).join(" ").trim() });
  }
  return out;
}

export function renderSetEditor(ctx, id) {
  const root = el("div", { class: "stack-lg" }, loading());
  const teacher = isAdmin(ctx.user);
  const open = (existing) => {
    root.innerHTML = "";
    const st = existing
      ? { id: existing.id, title: existing.title, desc: existing.desc || "", shared: !!existing.shared, createdAt: existing.createdAt, cards: existing.cards.map((c) => ({ ...c })) }
      : { id: null, title: "", desc: "", shared: false, cards: [{ t: "", d: "" }, { t: "", d: "" }, { t: "", d: "" }] };

    const title = el("input", { type: "text", maxlength: 120, value: st.title, placeholder: L("Tên học phần, ví dụ: Unit 5 – Environment", "Set title, e.g. Unit 5 – Environment"), oninput: () => (st.title = title.value) });
    const desc = el("input", { type: "text", maxlength: 300, value: st.desc, placeholder: L("Mô tả (không bắt buộc)", "Description (optional)"), oninput: () => (st.desc = desc.value) });
    const rows = el("div", { class: "edit-rows" });
    const count = el("span", { class: "chip" });

    const paintRows = () => {
      rows.innerHTML = "";
      st.cards.forEach((c, i) => {
        const t = el("input", { type: "text", value: c.t, placeholder: L("Thuật ngữ / từ", "Term"), oninput: () => { c.t = t.value; recount(); } });
        const d = el("input", { type: "text", value: c.d, placeholder: L("Định nghĩa / nghĩa", "Definition"), oninput: () => { c.d = d.value; recount(); } });
        rows.append(el("div", { class: "edit-row" }, el("span", { class: "edit-n" }, i + 1), t, d,
          el("button", { class: "icon-btn", title: L("Xoá thẻ", "Remove"), tabindex: "-1", onclick: () => { st.cards.splice(i, 1); if (!st.cards.length) st.cards.push({ t: "", d: "" }); paintRows(); } }, icon("trash"))));
      });
      recount();
    };
    const recount = () => { count.textContent = L(`${st.cards.filter((c) => c.t.trim() && c.d.trim()).length} thẻ hợp lệ`, `${st.cards.filter((c) => c.t.trim() && c.d.trim()).length} valid cards`); };
    const addRows = (list) => {
      const empty = st.cards.filter((c) => !c.t.trim() && !c.d.trim()).length === st.cards.length;
      st.cards = (empty ? [] : st.cards.filter((c) => c.t.trim() || c.d.trim())).concat(list).slice(0, MAX_CARDS);
      paintRows();
    };

    const paste = el("textarea", { rows: 6, placeholder: L("Dán danh sách vào đây. Mỗi dòng một thẻ: từ, rồi nghĩa — cách nhau bằng Tab (copy từ Excel/Quizlet), dấu “ - ”, dấu hai chấm hoặc dấu phẩy.", "Paste your list. One card per line: term then definition, separated by Tab (copied from Excel/Quizlet), “ - ”, a colon or a comma.") });
    const importBox = el("div", { class: "card hidden" }, el("h3", {}, L("Nhập nhanh", "Quick import")), paste,
      el("div", { class: "row", style: "gap:8px;margin-top:8px" },
        el("button", { class: "btn btn-primary btn-sm", onclick: () => {
          const got = parseImport(paste.value);
          if (!got.length) { toast(L("Không đọc được dòng nào. Mỗi dòng cần có từ và nghĩa.", "No lines could be read. Each line needs a term and a definition."), "error"); return; }
          addRows(got); paste.value = ""; importBox.classList.add("hidden"); toast(L(`Đã thêm ${got.length} thẻ.`, `Added ${got.length} cards.`), "ok");
        } }, L("Thêm vào học phần", "Add to set")),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => importBox.classList.add("hidden") }, L("Đóng", "Close"))));

    const deckSel = el("select", {}, el("option", { value: "" }, L("Lấy từ bộ có sẵn…", "Add from a ready-made deck…")),
      DECKS.map((d) => el("option", { value: d.id }, `${d.title} (${d.words.length})`)));
    deckSel.onchange = () => {
      const d = DECKS.find((x) => x.id === deckSel.value);
      if (d) { addRows(d.words.map((w) => ({ t: w.word, d: meaning(w) }))); toast(L(`Đã thêm ${d.words.length} từ.`, `Added ${d.words.length} words.`), "ok"); }
      deckSel.value = "";
    };

    const share = el("input", { type: "checkbox", onchange: () => (st.shared = share.checked) });
    share.checked = st.shared;

    const saveBtn = el("button", { class: "btn btn-primary btn-lg", onclick: async () => {
      if (!st.title.trim()) { toast(L("Hãy đặt tên cho học phần.", "Give the set a title."), "error"); title.focus(); return; }
      const valid = st.cards.filter((c) => c.t.trim() && c.d.trim());
      if (valid.length < 2) { toast(L("Cần ít nhất 2 thẻ có đủ từ và nghĩa.", "You need at least 2 cards with both a term and a definition."), "error"); return; }
      saveBtn.disabled = true;
      try {
        const newId = await saveSet(ctx.user, st, { teacher });
        toast(L("Đã lưu học phần.", "Set saved."), "ok");
        ctx.go(`set/my:${newId}`);
      } catch (err) {
        console.warn(err); saveBtn.disabled = false;
        toast(L("Không lưu được. Kiểm tra kết nối rồi thử lại.", "Couldn't save. Check your connection and retry."), "error");
      }
    } }, icon("check"), L("Lưu học phần", "Save set"));

    root.append(
      el("div", { class: "row" }, el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go(st.id ? `set/my:${st.id}` : "sets") }, icon("back"), L("Quay lại", "Back")),
        el("h1", { style: "margin:0" }, st.id ? L("Sửa học phần", "Edit set") : L("Tạo học phần", "Create a set"))),
      el("div", { class: "card stack" }, title, desc,
        el("label", { class: "check" }, share, teacher ? L("Chia sẻ cho cả web (hiện ở mục “Giáo viên chia sẻ”) và cho ai có link", "Share with everyone (shown under “Shared by teachers”) and anyone with the link")
          : L("Chia sẻ bằng link (người có link đăng nhập là xem và học được)", "Share by link (anyone signed in with the link can study it)"))),
      el("div", { class: "row wrap", style: "gap:8px" }, count, el("div", { class: "spacer" }), deckSel,
        el("button", { class: "btn btn-sm", onclick: () => importBox.classList.toggle("hidden") }, icon("upload"), L("Nhập nhanh", "Quick import"))),
      importBox, rows,
      el("div", { class: "row wrap", style: "gap:10px" },
        el("button", { class: "btn", onclick: () => { st.cards.push({ t: "", d: "" }); paintRows(); rows.lastChild.querySelector("input").focus(); } }, icon("plus"), L("Thêm thẻ", "Add card")),
        saveBtn));
    paintRows();
  };
  if (!id) open(null);
  else resolveSet(ctx.user, `my:${id}`).then((r) => {
    if (!r || !r.editable) { root.innerHTML = ""; root.append(notFound(ctx)); return; }
    open(r.set);
  }).catch(() => { root.innerHTML = ""; root.append(notFound(ctx)); });
  return root;
}

/* ======================= HỌC (tải học phần rồi vào chế độ học) ======================= */
export function renderStudyRoute(ctx, modeId, ref) {
  const root = el("div", {}, loading());
  resolveSet(ctx.user, ref).then((r) => {
    root.innerHTML = "";
    root.append(r ? renderStudy(ctx, modeId, r) : notFound(ctx));
  }).catch(() => { root.innerHTML = ""; root.append(notFound(ctx)); });
  return root;
}
