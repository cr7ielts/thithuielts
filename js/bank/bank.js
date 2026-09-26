// NGÂN HÀNG ĐỀ — luyện từng passage Reading / từng đề Listening từ tài liệu của giáo viên.
// Đề (PDF, audio) nằm trên Firebase Storage tại bank/…; giáo viên tải lên một lần ở trang Import.
// Đáp án nằm trong js/data/bank-*.js (sinh tự động từ thư mục tài liệu).
import { el, icon, toast, Countdown, confirmDialog, setExamGuard, draft, fmtDateTime } from "../ui.js";
import { isCorrect } from "../engine.js";
import { initFirebase, isConfigured, isAdmin } from "../firebase.js";
import { saveSubmission, listMySubmissions } from "../store.js";
import { createCat } from "../cat.js";
import { getAssignment, getMySubmission, submitHomework } from "../homework/hwstore.js";
import { createHighlighter, pdfHighlightStore, attachHtmlHighlighter } from "../highlight.js";
import { loadInteractive, examView } from "./exam.js";
import { L } from "../i18n.js";

const ROMANS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"];
const KIND_LABEL = {
  tfng: "True / False / Not Given", ynng: "Yes / No / Not Given", heading: L("Chọn heading", "Matching headings"),
  letter: L("Chọn chữ cái", "Choose a letter"), multi: L("Chọn nhiều đáp án", "Choose more than one"),
  gap: L("Điền từ", "Completion"), other: L("Trả lời", "Answer"),
};
const MINUTES = { reading: 20, listening: 40, section: 15 };
const KINDS = ["reading", "listening", "section"];
const SKILL = { reading: "reading", listening: "listening", section: "listening" };
const TAB_LABEL = { reading: "Reading", listening: L("Listening · cả đề", "Listening · full tests"), section: L("Listening · từng section", "Listening · sections") };

/* ---------------- Dữ liệu ---------------- */
let _banks = null;
async function loadBanks() {
  if (_banks) return _banks;
  const [r, l] = await Promise.all([
    import("../data/bank-reading.js").then((m) => m.READING_BANK).catch(() => []),
    import("../data/bank-listening.js").catch(() => ({})),
  ]);
  _banks = { reading: r, listening: l.LISTENING_BANK || [], section: l.LISTENING_SECTIONS || [] };
  return _banks;
}

/** Danh sách file của một bài: [{ src, path, type, label }] */
export function filesOf(kind, item) {
  if (item.files) return item.files;
  return [{ src: item.src, path: `bank/${kind}/${item.id}.pdf`, type: "pdf", label: "PDF" }];
}

async function fileUrl(path) {
  if (!isConfigured) return path; // chế độ thử: đọc file tĩnh cùng thư mục web
  const { storage, stMod } = await initFirebase();
  return stMod.getDownloadURL(stMod.ref(storage, path));
}

const questionCount = (item) => item.groups.reduce((s, g) => s + g.to - g.from + 1, 0);
const testId = (kind, item) => `bank:${kind}:${item.id}`;
const partLabel = (kind, item) => (kind === "reading" ? `Passage ${item.part}` : kind === "section" ? `Section ${item.section}` : item.set || "Listening");
const sourceLabel = (item) => `${item.set} · ${item.testTitle}`;

/* ======================= Danh sách ======================= */
export function renderBank(ctx, kind = "reading") {
  if (!KINDS.includes(kind)) kind = "reading";
  const wrap = el("div", { class: "stack-lg" });
  const cat = createCat({ size: 120, mood: "think", bubbleSide: "left", say: L("Chọn một bài, i-melts bấm giờ cho!", "Pick one — i-melts will keep time!") });
  wrap.append(el("section", { class: "games-hero" },
    el("div", { style: "flex:1;min-width:240px" },
      el("div", { class: "eyebrow" }, L("Ngân hàng đề", "Question bank")),
      el("h1", {}, L("Luyện đề theo từng bài", "Practise one test at a time")),
      el("p", { class: "lead mb-0" }, L("Làm từng passage Reading (20 phút), cả đề Listening hoặc từng section Listening theo chủ đề — chấm điểm ngay và xem lại đáp án.",
        "Do one Reading passage (20 minutes), a full Listening test, or a single Listening section by topic — get your score straight away and review the answers.")),
      isAdmin(ctx.user) ? el("div", { style: "margin-top:14px" },
        el("button", { class: "btn", onclick: () => ctx.go("bank/import") }, icon("upload"), L("Tải file đề lên (giáo viên)", "Upload test files (teacher)"))) : null),
    el("div", { class: "games-hero-cat" }, cat)));
  const body = el("div", { class: "card muted" }, L("Đang tải…", "Loading…"));
  wrap.append(body);

  Promise.all([loadBanks(), listMySubmissions(ctx.user.uid).catch(() => [])]).then(([banks, subs]) => {
    const best = new Map();
    for (const s of subs) {
      if (!String(s.testId || "").startsWith("bank:")) continue;
      const prev = best.get(s.testId);
      if (!prev || s.raw > prev.raw) best.set(s.testId, s);
    }
    body.replaceWith(bankList(ctx, banks, kind, best));
  }).catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));
  return wrap;
}

function bankList(ctx, banks, kind, best) {
  const box = el("div", { class: "stack" });
  const tabs = el("div", { class: "tabs" },
    KINDS.map((k) => el("button", { class: "btn btn-sm" + (k === kind ? " btn-primary" : ""), onclick: () => ctx.go(`bank/${k}`) },
      icon(SKILL[k]), `${TAB_LABEL[k]} (${banks[k].length})`)));
  // Section: xếp theo số section rồi theo tiêu đề (A–Z)
  const items = kind === "section"
    ? [...banks.section].sort((a, b) => a.section - b.section || a.title.localeCompare(b.title))
    : banks[kind];
  const parts = [...new Set(items.map((i) => partLabel(kind, i)))];
  let part = "all", q = "";
  const search = el("input", { type: "search", id: "bank-search", placeholder: L("Tìm theo tên bài…", "Search by title…"), style: "flex:1;min-width:200px",
    oninput: () => { q = search.value.trim().toLowerCase(); paint(); } });
  const chips = el("div", { class: "row wrap", style: "gap:6px" });
  const grid = el("div", { class: "bank-grid" });
  const count = el("span", { class: "chip" });
  const paint = () => {
    [...chips.children].forEach((c) => c.classList.toggle("on", c.dataset.part === part));
    grid.innerHTML = "";
    const hay = (i) => `${i.title} ${kind === "section" ? sourceLabel(i) + " " + (i.alsoIn || []).join(" ") : ""}`.toLowerCase();
    const list = items.filter((i) => (part === "all" || partLabel(kind, i) === part) && (!q || hay(i).includes(q)));
    count.textContent = L(`${list.length} bài`, `${list.length} tests`);
    let lastHead = null;
    list.forEach((i) => {
      // tab section, xem "Tất cả": chia nhóm theo Section 1–4
      if (kind === "section" && part === "all" && i.section !== lastHead) {
        lastHead = i.section;
        grid.append(el("div", { class: "bank-head" }, `Section ${i.section}`, el("span", { class: "tiny muted" }, SECTION_HINT[i.section])));
      }
      grid.append(bankCard(ctx, kind, i, best.get(testId(kind, i))));
    });
    if (!list.length) grid.append(el("p", { class: "muted" }, items.length ? L("Không có bài nào khớp.", "Nothing matches.") : L("Chưa có đề nào.", "No tests yet.")));
  };
  ["all", ...parts].forEach((p) => chips.append(el("button", { class: "chip-btn", dataset: { part: p }, onclick: () => { part = p; paint(); } },
    p === "all" ? L("Tất cả", "All") : p)));
  box.append(tabs, el("div", { class: "row wrap", style: "gap:10px" }, search, count), chips, grid);
  paint();
  return box;
}

function bankCard(ctx, kind, item, done) {
  const n = questionCount(item);
  return el("button", { class: "bank-card", onclick: () => ctx.go(`bank/${kind}/${item.id}`) },
    el("div", { class: "row", style: "justify-content:space-between;gap:8px" },
      el("span", { class: `skill-tag ${kind}` }, partLabel(kind, item)),
      done ? el("span", { class: "chip chip-ok" }, icon("check"), `${done.raw}/${done.total}`) : el("span", { class: "tiny muted" }, L(`${n} câu`, `${n} Qs`))),
    el("div", { class: "bank-title" }, item.title),
    kind === "section" ? el("div", { class: "tiny muted" }, sourceLabel(item),
      item.alsoIn?.length ? L(` · có trong ${item.alsoIn.length} đề khác`, ` · also in ${item.alsoIn.length} other test(s)`) : "") : null);
}

const SECTION_HINT = {
  1: L("hội thoại đời sống — điền form, đặt chỗ", "everyday conversation — forms, bookings"),
  2: L("độc thoại đời sống — giới thiệu địa điểm, sự kiện", "everyday monologue — places, events"),
  3: L("thảo luận học thuật — sinh viên, giảng viên", "academic discussion — students, tutors"),
  4: L("bài giảng học thuật", "academic lecture"),
};

/* ======================= Làm bài ======================= */
/** hwId: đang làm bài tập về nhà (bài tập loại "Ngân hàng đề") — nộp xong ghi vào Homework */
export function renderBankPractice(ctx, kind, id, hwId = null) {
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(hwId
    ? el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go(`homework/${hwId}`) }, icon("back"), "Homework")
    : el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go(`bank/${kind}`) }, icon("back"), L("Ngân hàng đề", "Question bank")));
  const body = el("div", { class: "card muted" }, L("Đang tải…", "Loading…"));
  wrap.append(body);
  (async () => {
    const banks = await loadBanks();
    const item = (banks[kind] || []).find((i) => i.id === id);
    if (!item) throw new Error(L("Không tìm thấy bài này.", "Test not found."));
    const files = filesOf(kind, item);
    let urls;
    try {
      urls = await Promise.all(files.map((f) => fileUrl(f.path)));
    } catch (err) {
      console.error(err);
      body.replaceWith(el("div", { class: "notice notice-error" },
        L("File đề chưa được tải lên. ", "The test files haven't been uploaded yet. "),
        isAdmin(ctx.user) ? el("a", { href: "#bank/import" }, L("Mở trang tải file", "Open the upload page"))
          : L("Hãy báo giáo viên.", "Please tell your teacher.")));
      return;
    }
    // Bài tập về nhà: lấy bài tập + xem học sinh đã nộp chưa (đã nộp thì lần này chỉ là luyện tập)
    let hw = null;
    if (hwId) {
      const a = await getAssignment(hwId);
      if (a && a.type === "bank" && a.bank?.kind === kind && a.bank?.id === id) {
        const done = isAdmin(ctx.user) ? null : await getMySubmission(hwId, ctx.user.uid);
        const late = a.dueAt < new Date() && !a.allowLate;
        hw = { a, done, late };
      }
    }
    const inter = await loadInteractive(item.id);   // có nội dung đề -> làm như thi trên máy, không cần PDF
    const intro = briefing(ctx, kind, item, () => intro.replaceWith(practiceUI(ctx, kind, item, files, urls, hw, inter)), hw, inter);
    body.replaceWith(intro);
  })().catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));
  return wrap;
}

function briefing(ctx, kind, item, start, hw = null, inter = null) {
  const n = questionCount(item);
  const due = hw ? fmtDateTime(hw.a.dueAt).replace(/:\d\d$/, "") : "";
  const hwNote = !hw ? null
    : hw.done ? el("div", { class: "notice notice-info small", style: "margin-top:12px" },
        L("Bạn đã nộp bài tập này — lần làm này chỉ để luyện tập, không thay điểm đã nộp.", "You've already submitted this homework — this attempt is practice only and won't replace your mark."))
    : hw.late ? el("div", { class: "notice notice-error small", style: "margin-top:12px" },
        L("Đã hết hạn nộp — lần làm này chỉ để luyện tập.", "The deadline has passed — this attempt is practice only."))
    : el("div", { class: "notice notice-info small", style: "margin-top:12px" },
        el("strong", {}, L("Bài tập về nhà: ", "Homework: ")), hw.a.title, " · ",
        L(`hạn ${due}. Nộp xong giáo viên thấy ngay; chỉ nộp một lần.`, `due ${due}. Your teacher sees it as soon as you submit; one attempt only.`));
  return el("div", { class: "card intro-card" },
    el("div", { class: "row", style: "gap:14px;margin-bottom:6px" },
      el("div", { class: `skill-ico ${SKILL[kind]}` }, icon(SKILL[kind])),
      el("div", {},
        el("div", { class: "eyebrow" }, kind === "section" ? `Section ${item.section} · ${sourceLabel(item)}` : partLabel(kind, item)),
        el("h1", { style: "margin-bottom:2px" }, item.title),
        el("div", { class: "muted" }, L(`${n} câu · ${MINUTES[kind]} phút`, `${n} questions · ${MINUTES[kind]} minutes`)))),
    el("ul", { class: "muted small", style: "margin:14px 0 18px;padding-left:20px" },
      el("li", {}, inter
        ? L("Làm trực tiếp trên web như thi trên máy: chọn/gõ đáp án ngay dưới mỗi câu, có thanh số câu và nút đánh dấu để xem lại.",
            "Answer on screen like the computer-delivered test: type or click under each question, with a question bar and flags for review.")
        : kind === "reading"
          ? L("Đề (PDF) ở bên trái, phiếu trả lời ở bên phải.", "The test paper (PDF) is on the left and the answer sheet on the right.")
          : L("Bật audio và làm theo đề PDF; mỗi phần nghe một lần như thi thật.", "Play the audio and follow the PDF; listen to each part once, as in the real test.")),
      el("li", {}, L("Sai chính tả bị tính là sai. Hết giờ tự nộp.", "Spelling mistakes count as wrong. Your answers are submitted when time runs out.")),
      el("li", {}, L("Nộp xong xem ngay đáp án và câu sai.", "After submitting you'll see the answers and your mistakes."))),
    hwNote,
    el("div", { class: "row wrap", style: "gap:10px;margin-top:14px" },
      el("button", { class: "btn btn-primary btn-lg", onclick: start }, L("Bắt đầu", "Start")),
      // giáo viên: giao bài này làm bài tập về nhà
      isAdmin(ctx.user) && !hw ? el("button", { class: "btn btn-lg", onclick: () => ctx.go("homework/new", { bank: { kind, id: item.id } }) },
        icon("homework"), L("Giao làm bài tập", "Set as homework")) : null));
}

function practiceUI(ctx, kind, item, files, urls, hw = null, inter = null) {
  const draftKey = `bank-${kind}-${item.id}`;
  const answers = {};
  const saved = draft.load(ctx.user.uid, draftKey);
  if (saved?.data) Object.assign(answers, saved.data);
  const startedAt = new Date();
  let submitted = false;
  const timer = new Countdown({ seconds: MINUTES[kind] * 60, onEnd: () => doSubmit(true) }).start();
  setExamGuard(true);
  const save = () => draft.save(ctx.user.uid, draftKey, answers);

  // Đề: PDF + audio
  const hl = createHighlighter();
  const hlStore = pdfHighlightStore(`ielts:hl:${ctx.user.uid}:${kind}:${item.id}`, hl);
  const pdfIdx = files.findIndex((f) => f.type === "pdf");
  const paper = el("div", { class: "bank-paper" });
  const audios = files.map((f, i) => (f.type === "audio" ? { f, url: urls[i] } : null)).filter(Boolean);
  if (audios.length) {
    paper.append(el("div", { class: "bank-audio" }, audios.map(({ f, url }) =>
      el("div", { class: "bank-audio-row" }, el("span", { class: "tiny strong" }, f.label || "Audio"),
        el("audio", { controls: "", preload: "none", src: url, controlslist: "nodownload" })))));
  }
  if (pdfIdx >= 0 && !inter) {   // bài tương tác thì không cần PDF nữa
    const pages = files[pdfIdx].pages || null;
    // file có kèm trang đáp án / nhiều đề -> chỉ hiện đúng các trang của đề, không cho mở cả file
    if (!pages && !files[pdfIdx].keyInside) paper.append(el("div", { class: "row", style: "justify-content:flex-end" },
      el("a", { class: "btn btn-sm", href: urls[pdfIdx], target: "_blank", rel: "noopener" }, L("Mở PDF trong tab mới", "Open PDF in a new tab"), icon("arrow"))));
    paper.append(pdfViewer(urls[pdfIdx], item.title, pages, hlStore, !!files[pdfIdx].keyInside));
  }

  // Phiếu trả lời — bản tương tác (như thi trên máy) hoặc phiếu cạnh PDF
  let sheet, exam = null;
  if (inter) {
    exam = examView(inter, item, answers, save);
    if (inter.passage) paper.append(exam.paper);   // Listening không có bài đọc -> câu hỏi chiếm cả bề ngang
    sheet = el("div", { class: "bank-sheet cdi" }, exam.sheet);
  } else {
    sheet = el("div", { class: "bank-sheet" });
    for (const g of item.groups) sheet.append(groupInputs(g, answers, save));
  }
  const submitBtn = el("button", { class: "btn btn-primary btn-lg", onclick: () => doSubmit(false) }, icon("check"), L("Nộp bài", "Submit"));
  sheet.append(el("div", { class: "row", style: "margin-top:12px" }, submitBtn));

  const barTitle = kind === "listening" ? `${item.set} · ${item.title}` : kind === "section" ? `Section ${item.section} · ${item.title}` : item.title;
  attachHtmlHighlighter(sheet, hl);
  if (exam) attachHtmlHighlighter(exam.paper, hl);   // tô màu ngay trên bài đọc tương tác
  const bar = el("div", { class: "exam-bar" }, el("strong", {}, barTitle), timer.node, hl.toolbar, el("div", { class: "spacer" }),
    el("button", { class: "btn btn-primary", onclick: () => doSubmit(false) }, L("Nộp bài", "Submit")));

  async function doSubmit(auto) {
    if (submitted) return;
    const res = gradeItem(item, answers);
    if (!auto) {
      const blank = res.details.filter((d) => !d.given).length;
      const marked = exam ? exam.flagged() : [];
      const ok = await confirmDialog({
        title: L("Nộp bài?", "Submit?"),
        body: (blank ? L(`Còn <strong>${blank}</strong> câu bỏ trống. `, `<strong>${blank}</strong> answers are blank. `) : L("Bạn đã trả lời hết các câu. ", "You've answered every question. "))
          + (marked.length ? L(`Còn <strong>${marked.length}</strong> câu đang đánh dấu xem lại (câu ${marked.join(", ")}).`,
                               `<strong>${marked.length}</strong> questions are flagged for review (${marked.join(", ")}).`) : ""),
        okText: L("Nộp bài", "Submit"),
      });
      if (!ok) return;
    }
    submitted = true;
    timer.stop();
    hl.dispose();
    setExamGuard(false);
    try {
      const sub = await saveSubmission(ctx.user, {
        testId: testId(kind, item), skill: SKILL[kind], practice: true,
        testTitle: kind === "section" ? `Section ${item.section} · ${item.title} (${sourceLabel(item)})` : `${partLabel(kind, item)} · ${item.title}`,
        startedAt: startedAt.toISOString(), durationSec: timer.elapsedSeconds, autoSubmitted: auto,
        raw: res.correct, total: res.total, band: bandFor(kind, res.correct, res.total),
        details: res.details, graded: true,
      });
      draft.clear(ctx.user.uid, draftKey);
      // bài tập về nhà: ghi bài nộp vào Homework (lượt đầu tiên, còn hạn)
      if (hw && !hw.done && !hw.late && !isAdmin(ctx.user)) {
        try {
          await submitHomework(hw.a, ctx.user, {
            answers, score: { raw: res.correct, total: res.total }, details: res.details,
            practiceId: sub.id || "", durationSec: timer.elapsedSeconds, autoSubmitted: auto,
          });
          toast(L("Đã nộp bài tập — giáo viên đã nhận được", "Homework submitted — your teacher has it"), "ok", 4000);
        } catch (err) {
          console.error(err);
          toast(L("Bài làm đã lưu vào Lịch sử nhưng chưa nộp được bài tập: ", "Saved to your history, but the homework couldn't be submitted: ") + err.message, "err", 8000);
        }
      } else toast(auto ? L("Hết giờ — bài đã được nộp", "Time's up — submitted") : L("Đã nộp bài", "Submitted"), "ok");
      ctx.go("result", { submission: sub });
    } catch (err) {
      submitted = false;
      toast(L("Không lưu được bài nộp: ", "Couldn't save your submission: ") + err.message, "err", 6000);
    }
  }

  const oneCol = inter && !inter.passage;
  const split = el("div", { class: oneCol ? "stack cdi-one" : "bank-split" + (inter ? " cdi-split" : "") }, paper, sheet);
  return el("div", { class: "stack" }, bar, split, exam ? exam.nav : null);
}

/* ----- Trình xem PDF (PDF.js — chạy được cả trên điện thoại) ----- */
// hai CDN: mạng của học sinh có thể chặn cái thứ nhất
const PDFJS_CDNS = [
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build",
  "https://unpkg.com/pdfjs-dist@4.10.38/build",
];
let _pdfjs = null;
async function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = (async () => {
    let last;
    for (const base of PDFJS_CDNS) {
      try {
        const m = await import(`${base}/pdf.min.mjs`);
        m.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;
        return m;
      } catch (err) { last = err; console.warn("pdf.js CDN", base, err); }
    }
    _pdfjs = null;   // cho phép thử lại lần sau
    throw new Error(`pdf.js: ${last?.message || last}`);
  })();
  return _pdfjs;
}

/** hlStore: pdfHighlightStore(...) để tô màu trên PDF (tuỳ chọn); keyInside: file có trang đáp án -> không cho mở cả file */
function pdfViewer(url, title, pages = null, hlStore = null, keyInside = false) {
  const box = el("div", { class: "bank-pdf" }, el("div", { class: "muted small", style: "padding:16px" }, L("Đang mở đề…", "Opening the test paper…")));
  let tries = 0;
  const open = async () => {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ url }).promise;
    box.innerHTML = "";
    const [p0, p1] = pages ? [Math.max(1, pages[0]), Math.min(doc.numPages, pages[1])] : [1, doc.numPages];
    const holders = [];
    for (let i = p0; i <= p1; i++) {
      const holder = el("div", { class: "pdf-page", dataset: { page: i } });
      box.append(holder);
      holders.push(holder);
    }
    const drawn = new Set();
    const draw = async (holder) => {
      const i = Number(holder.dataset.page);
      if (drawn.has(i)) return;
      drawn.add(i);
      const page = await doc.getPage(i);
      const width = Math.max(300, box.clientWidth - 16);
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: scale * dpr });
      const canvas = el("canvas", { width: Math.floor(vp.width), height: Math.floor(vp.height), "aria-label": `${title} — page ${i}` });
      const cssVp = page.getViewport({ scale });
      canvas.style.width = `${cssVp.width}px`;
      canvas.style.height = `${cssVp.height}px`;
      // trang = canvas (hình) + lớp chữ trong suốt (để bôi đen) + lớp highlight
      const inner = el("div", { class: "pdf-inner", style: `width:${cssVp.width}px;height:${cssVp.height}px;--scale-factor:${scale};--total-scale-factor:${scale}` }, canvas);
      holder.style.minHeight = "";
      holder.append(inner);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
      try {
        const textDiv = el("div", { class: "textLayer" });
        inner.append(textDiv);
        await new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: textDiv, viewport: cssVp }).render();
      } catch (err) { console.warn("text layer", err); }
      hlStore?.attach(inner, i);
    };
    // chiều cao tạm để thanh cuộn đúng trước khi vẽ
    const first = await doc.getPage(p0);
    const ratio = first.getViewport({ scale: 1 }).height / first.getViewport({ scale: 1 }).width;
    holders.forEach((p) => { p.style.minHeight = `${Math.round((box.clientWidth - 16) * ratio)}px`; });
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && draw(e.target)), { root: box, rootMargin: "600px 0px" });
    holders.forEach((p) => io.observe(p));
  };
  open().catch((err) => {
    console.error("PDF", err);
    if (++tries < 2) { setTimeout(() => open().catch(showError), 1200); return; }   // lỗi mạng chốc lát -> tự thử lại một lần
    showError(err);
  });

  async function showError(err) {
    box.innerHTML = "";
    const retry = el("button", { class: "btn btn-sm btn-primary", onclick: () => { tries = 0; box.innerHTML = ""; box.append(el("div", { class: "muted small", style: "padding:16px" }, L("Đang mở lại…", "Trying again…"))); open().catch(showError); } },
      icon("refresh"), L("Thử lại", "Try again"));
    const note = el("div", { class: "notice notice-error", style: "margin:12px" },
      el("div", {}, L("Không mở được đề.", "Couldn't open the test paper.")),
      el("div", { class: "tiny", style: "margin-top:6px;word-break:break-word" }, `${err?.name || "Error"}: ${err?.message || err}`),
      el("div", { class: "row wrap", style: "gap:8px;margin-top:10px" }, retry,
        // file không chứa trang đáp án -> vẫn mở được PDF để làm bài
        keyInside ? null : el("a", { class: "btn btn-sm", href: pageUrl(), target: "_blank", rel: "noopener" },
          L("Mở PDF trong tab mới", "Open PDF in a new tab"), icon("arrow"))));
    box.append(note);
    // "Failed to fetch": phân biệt bị chặn CORS (máy chủ vẫn trả lời) với lỗi mạng
    if (/failed to fetch|networkerror|load failed/i.test(String(err?.message))) {
      let reachable = false;
      try { await fetch(url, { mode: "no-cors", cache: "no-store" }); reachable = true; } catch { /* không tới được */ }
      note.append(el("div", { class: "tiny", style: "margin-top:8px" }, reachable
        ? L("Máy chủ vẫn trả lời, nhưng chặn không cho web đọc nội dung file (CORS). Giáo viên cần bật CORS cho Firebase Storage — xem README mục “Ngân hàng đề”.",
            "The server answers but blocks the page from reading the file (CORS). The teacher needs to turn on CORS for Firebase Storage — see the README.")
        : L("Không kết nối được tới máy chủ file. Kiểm tra mạng rồi bấm Thử lại.", "Couldn't reach the file server. Check your connection and press Try again.")));
      // vẫn hiện được đề bằng khung nhúng (không tô màu được)
      if (reachable && !keyInside) {
        box.append(el("div", { class: "tiny muted", style: "margin:0 12px 6px" },
          L("Đang hiện đề ở chế độ dự phòng — làm bài bình thường, chỉ không tô màu được.", "Showing the paper in fallback mode — you can still do the test, but highlighting is off.")),
          el("iframe", { src: pageUrl(), title, style: "width:100%;flex:1;min-height:60vh;border:0" }));
      }
    } else {
      note.append(el("div", { class: "tiny muted", style: "margin-top:8px" }, L("Vẫn lỗi thì báo giáo viên kèm dòng chữ đỏ ở trên.", "If it keeps failing, send your teacher the red line above.")));
    }
  }

  function pageUrl() { return pages ? `${url}#page=${pages[0]}` : url; }
  return box;
}

/* ----- Ô trả lời theo dạng câu hỏi ----- */
function groupInputs(g, answers, onChange) {
  const box = el("div", { class: "qgroup" },
    el("div", { class: "qgroup-title" }, `${L("Câu", "Questions")} ${g.from}${g.to > g.from ? `–${g.to}` : ""} · ${KIND_LABEL[g.kind] || ""}`));
  if (g.kind === "multi") {
    const key = `g${g.from}`;
    const pick = g.to - g.from + 1;
    const chosen = new Set(answers[key] || []);
    const letters = letterRange(g.letters || "AH");
    const info = el("div", { class: "tiny muted" });
    const upd = () => { info.textContent = L(`Chọn ${pick} đáp án (${chosen.size}/${pick})`, `Choose ${pick} answers (${chosen.size}/${pick})`); };
    const row = el("div", { class: "seg wrap" }, letters.map((c) => {
      const b = el("button", { type: "button", class: "seg-btn" + (chosen.has(c) ? " on" : ""), onclick: () => {
        if (chosen.has(c)) chosen.delete(c);
        else if (chosen.size < pick) chosen.add(c);
        else { toast(L(`Chỉ chọn ${pick} đáp án`, `Choose only ${pick}`), "err"); return; }
        b.classList.toggle("on", chosen.has(c));
        answers[key] = [...chosen].sort(); upd(); onChange();
      } }, c);
      return b;
    }));
    upd();
    box.append(row, info);
    return box;
  }
  for (let n = g.from; n <= g.to; n++) {
    const line = el("div", { class: "bank-q" }, el("span", { class: "qnum" }, n));
    if (g.kind === "tfng" || g.kind === "ynng") {
      const opts = g.kind === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];
      const seg = el("div", { class: "seg" });
      opts.forEach((o) => seg.append(el("button", { type: "button", class: "seg-btn" + (answers[n] === o ? " on" : ""), onclick: (e) => {
        answers[n] = answers[n] === o ? "" : o;
        [...seg.children].forEach((b) => b.classList.toggle("on", b.textContent === answers[n]));
        onChange();
      } }, o)));
      line.append(seg);
    } else if (g.kind === "heading" || g.kind === "letter") {
      const opts = g.kind === "heading" ? ROMANS.slice(0, g.max || 10) : letterRange(g.letters || "AH");
      const sel = el("select", { class: "pick", id: `bq-${n}`, onchange: () => { answers[n] = sel.value; onChange(); } },
        el("option", { value: "" }, "—"), opts.map((o) => el("option", { value: o, selected: answers[n] === o ? "" : null }, o)));
      line.append(sel);
    } else {
      const inp = el("input", { type: "text", id: `bq-${n}`, value: answers[n] || "", autocomplete: "off", spellcheck: "false",
        oninput: () => { answers[n] = inp.value; onChange(); } });
      line.append(inp);
    }
    box.append(line);
  }
  return box;
}

function letterRange(ab) {
  const a = ab.charCodeAt(0), b = ab.charCodeAt(1);
  return Array.from({ length: Math.max(1, b - a + 1) }, (_, i) => String.fromCharCode(a + i));
}

/* ----- Chấm điểm ----- */
export function gradeItem(item, answers) {
  const details = [];
  for (const g of item.groups) {
    const label = KIND_LABEL[g.kind] || "";
    if (g.kind === "multi") {
      const accepted = new Set(String(item.key[g.from]?.[0] || "").split(","));
      const chosen = answers[`g${g.from}`] || [];
      for (let i = 0; i <= g.to - g.from; i++) {
        const given = chosen[i] || "";
        details.push({ n: g.from + i, question: label, given, key: [...accepted].join(", "), ok: !!given && accepted.has(given) });
      }
      continue;
    }
    for (let n = g.from; n <= g.to; n++) {
      const key = item.key[n] || [];
      const given = String(answers[n] ?? "").trim();
      details.push({ n, question: label, given, key: key.join(" / "), ok: isCorrect(given, key) });
    }
  }
  return { correct: details.filter((d) => d.ok).length, total: details.length, details };
}

// Listening đủ 40 câu thì quy đổi band theo thang chuẩn
const LISTENING_BANDS = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 0]];
function bandFor(kind, raw, total) {
  if (kind !== "listening" || total !== 40) return null;
  return LISTENING_BANDS.find(([min]) => raw >= min)[1];
}

/* ======================= Giáo viên: tải file lên ======================= */
export function renderBankImport(ctx) {
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("bank") }, icon("back"), L("Ngân hàng đề", "Question bank")));
  if (!isAdmin(ctx.user)) { wrap.append(el("div", { class: "notice notice-error" }, L("Chỉ giáo viên mới dùng được trang này.", "Only teachers can use this page."))); return wrap; }
  wrap.append(el("div", { class: "card stack" },
    el("h1", { class: "mb-0" }, L("Tải file đề lên", "Upload test files")),
    el("p", { class: "muted mb-0" }, L(
      "Chọn đúng thư mục tài liệu trên máy; web tự tìm các file PDF/audio có trong ngân hàng đề và tải lên Firebase Storage. File đã có trên web sẽ được bỏ qua, nên có thể chạy lại bao nhiêu lần cũng được.",
      "Pick the materials folder on this computer. The page finds the PDF/audio files listed in the bank and uploads them to Firebase Storage. Files already online are skipped, so you can run it again at any time.")),
    isConfigured ? null : el("div", { class: "notice notice-error" }, L("Chế độ thử: chưa kết nối Firebase nên không tải lên được.", "Demo mode: Firebase isn't connected, so nothing can be uploaded."))));
  const body = el("div", { class: "stack-lg" });
  wrap.append(body);
  loadBanks().then((banks) => {
    body.append(importCard("reading", banks.reading, L('Thư mục "5. READING IN PASSAGES"', 'The "5. READING IN PASSAGES" folder')));
    if (banks.listening.length) body.append(importCard("listening", banks.listening, L('Thư mục "2. LISTENING"', 'The "2. LISTENING" folder')));
  });
  return wrap;
}

function importCard(kind, items, folderHint) {
  const entries = items.flatMap((i) => filesOf(kind, i));
  const status = el("div", { class: "small" }, L(`${entries.length} file cần có.`, `${entries.length} files expected.`));
  const missingBox = el("details", { class: "hidden" });
  const progress = el("div", { class: "progress hidden" }, el("span", { style: "width:0%" }));
  const log = el("div", { class: "tiny muted", "aria-live": "polite" });
  const uploadBtn = el("button", { class: "btn btn-primary", disabled: "" }, icon("upload"), L("Tải lên", "Upload"));
  const picker = el("input", { type: "file", class: "hidden", webkitdirectory: "", multiple: "" });
  let matched = [];
  const nfc = (s) => s.normalize("NFC").replace(/\\/g, "/").toLowerCase();

  picker.onchange = () => {
    const byPath = [...picker.files].map((f) => ({ f, p: nfc(f.webkitRelativePath || f.name) }));
    matched = [];
    const missing = [];
    for (const e of entries) {
      const want = "/" + nfc(e.src);
      const hit = byPath.find((x) => ("/" + x.p).endsWith(want));
      if (hit) matched.push({ ...e, file: hit.f }); else missing.push(e.src);
    }
    status.textContent = L(`Tìm thấy ${matched.length}/${entries.length} file.`, `Found ${matched.length}/${entries.length} files.`);
    missingBox.innerHTML = "";
    missingBox.classList.toggle("hidden", !missing.length);
    if (missing.length) missingBox.append(el("summary", {}, L(`${missing.length} file không tìm thấy`, `${missing.length} files not found`)),
      el("ul", { class: "tiny" }, missing.slice(0, 200).map((m) => el("li", {}, m))));
    uploadBtn.disabled = !matched.length || !isConfigured;
  };

  uploadBtn.onclick = async () => {
    uploadBtn.disabled = true;
    progress.classList.remove("hidden");
    const { storage, stMod } = await initFirebase();
    const total = matched.reduce((s, m) => s + m.file.size, 0) || 1;
    let doneBytes = 0, uploaded = 0, skipped = 0, failed = 0;
    const bar = progress.firstChild;
    const queue = [...matched];
    const worker = async () => {
      while (queue.length) {
        const m = queue.shift();
        const ref = stMod.ref(storage, m.path);
        try {
          const meta = await stMod.getMetadata(ref).catch(() => null);
          if (meta && Number(meta.size) === m.file.size) { skipped++; doneBytes += m.file.size; continue; }
          let last = 0;
          const task = stMod.uploadBytesResumable(ref, m.file, { contentType: m.type === "pdf" ? "application/pdf" : (m.file.type || "audio/mpeg") });
          await new Promise((res, rej) => task.on("state_changed", (s) => {
            doneBytes += s.bytesTransferred - last; last = s.bytesTransferred;
            bar.style.width = `${Math.round((doneBytes / total) * 100)}%`;
          }, rej, res));
          uploaded++;
        } catch (err) {
          failed++; console.error(m.path, err);
        }
        log.textContent = L(`Đã tải ${uploaded} · bỏ qua ${skipped} (đã có) · lỗi ${failed} · còn ${queue.length}`,
          `Uploaded ${uploaded} · skipped ${skipped} (already online) · failed ${failed} · ${queue.length} left`);
        bar.style.width = `${Math.round((doneBytes / total) * 100)}%`;
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    toast(failed ? L(`Xong, ${failed} file lỗi — bấm Tải lên lần nữa để thử lại`, `Done — ${failed} failed; press Upload again to retry`)
      : L("Đã tải xong!", "All uploaded!"), failed ? "err" : "ok", 6000);
    uploadBtn.disabled = false;
  };

  const checkBtn = el("button", { class: "btn", disabled: isConfigured ? null : "" }, icon("search"), L("Kiểm tra file trên web", "Check files online"));
  const checkOut = el("div", { class: "small" });
  checkBtn.onclick = async () => {
    checkBtn.disabled = true;
    checkOut.innerHTML = "";
    checkOut.append(el("span", { class: "muted" }, L("Đang kiểm tra…", "Checking…")));
    const { storage, stMod } = await initFirebase();
    const missing = [], empty = [];
    let done = 0;
    const queue = [...entries];
    const worker = async () => {
      while (queue.length) {
        const e = queue.shift();
        try {
          const meta = await stMod.getMetadata(stMod.ref(storage, e.path));
          if (!Number(meta.size)) empty.push(e);
        } catch { missing.push(e); }
        done++;
        if (done % 25 === 0) checkOut.firstChild.textContent = L(`Đang kiểm tra… ${done}/${entries.length}`, `Checking… ${done}/${entries.length}`);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    checkOut.innerHTML = "";
    const bad = [...missing, ...empty];
    checkOut.append(el("div", { class: bad.length ? "notice notice-error small" : "notice notice-info small" },
      bad.length
        ? L(`Thiếu hoặc lỗi ${bad.length}/${entries.length} file. Chọn lại thư mục và bấm Tải lên để bù.`,
            `${bad.length} of ${entries.length} files are missing or empty. Choose the folder again and press Upload.`)
        : L(`Đủ ${entries.length} file trên web.`, `All ${entries.length} files are online.`)));
    if (bad.length) checkOut.append(el("details", {}, el("summary", {}, L("Xem danh sách", "Show the list")),
      el("ul", { class: "tiny" }, bad.slice(0, 200).map((e) => el("li", {}, e.src)))));
    checkBtn.disabled = false;
  };

  return el("div", { class: "card stack" },
    el("h2", { class: "mb-0" }, kind === "reading" ? "Reading" : "Listening"),
    el("div", { class: "muted small" }, L("Chọn: ", "Choose: "), el("strong", {}, folderHint)),
    el("div", { class: "row wrap", style: "gap:10px" },
      el("button", { class: "btn", onclick: () => picker.click() }, icon("file"), L("Chọn thư mục…", "Choose folder…")), uploadBtn, checkBtn),
    picker, status, missingBox, progress, log, checkOut);
}

/* ======================= Giáo viên: chọn bài trong ngân hàng đề để giao bài tập ======================= */
export function bankItemTitle(kind, item) {
  return kind === "reading" ? `Reading · Passage ${item.part} · ${item.title}`
    : kind === "listening" ? `Listening · ${item.set} · ${item.title}`
    : `Listening · Section ${item.section} · ${item.title} (${sourceLabel(item)})`;
}

/** Tìm bài theo {kind, id}: { item, title, count } hoặc null */
export async function findBankItem(ref) {
  if (!ref?.kind || !ref?.id) return null;
  const banks = await loadBanks();
  const item = (banks[ref.kind] || []).find((i) => i.id === ref.id);
  return item ? { item, title: bankItemTitle(ref.kind, item), count: questionCount(item) } : null;
}

/** Ô chọn bài: node.read() -> { kind, id, title, count } | null ; onPick(ref) khi chọn */
export function bankPicker(initial, onPick) {
  const kindSel = el("select", { class: "pick", id: "hw-bank-kind" }, KINDS.map((k) => el("option", { value: k }, TAB_LABEL[k])));
  const search = el("input", { type: "search", id: "hw-bank-search", placeholder: L("Tìm theo tên bài…", "Search by title…"), style: "flex:1;min-width:180px" });
  const list = el("select", { class: "pick", id: "hw-bank-item", size: 8, style: "width:100%;height:auto" });
  const chosen = el("div", { class: "small" });
  let banks = null, picked = null;
  const label = (k, i) => (k === "reading" ? `P${i.part} · ${i.title}` : k === "listening" ? `${i.set} · ${i.title}` : `S${i.section} · ${i.title} — ${sourceLabel(i)}`);
  const paint = () => {
    if (!banks) return;
    const k = kindSel.value, q = search.value.trim().toLowerCase();
    let items = banks[k];
    if (k === "section") items = [...items].sort((a, b) => a.section - b.section || a.title.localeCompare(b.title));
    list.innerHTML = "";
    items.filter((i) => !q || label(k, i).toLowerCase().includes(q)).slice(0, 400)
      .forEach((i) => list.append(el("option", { value: i.id, selected: picked && picked.kind === k && picked.id === i.id ? "" : null }, label(k, i))));
  };
  const showChosen = () => {
    chosen.innerHTML = "";
    if (!picked) { chosen.append(el("span", { class: "muted" }, L("Chưa chọn bài.", "Nothing selected yet."))); return; }
    chosen.append(icon("check"), " ", el("strong", {}, picked.title), el("span", { class: "muted" }, L(` · ${picked.count} câu`, ` · ${picked.count} questions`)));
  };
  list.onchange = () => {
    const item = banks[kindSel.value].find((i) => i.id === list.value);
    if (!item) return;
    picked = { kind: kindSel.value, id: item.id, title: bankItemTitle(kindSel.value, item), count: questionCount(item) };
    showChosen(); onPick?.(picked);
  };
  kindSel.onchange = paint;
  search.oninput = paint;
  loadBanks().then((b) => {
    banks = b;
    if (initial?.kind && b[initial.kind]) {
      kindSel.value = initial.kind;
      const item = b[initial.kind].find((i) => i.id === initial.id);
      if (item) { picked = { kind: initial.kind, id: item.id, title: bankItemTitle(initial.kind, item), count: questionCount(item) }; onPick?.(picked); }
    }
    paint(); showChosen();
  });
  const node = el("div", { class: "stack-sm hw-bank hidden" },
    el("label", { class: "field-label mb-0" }, L("Chọn bài trong ngân hàng đề", "Pick a test from the question bank")),
    el("div", { class: "row wrap", style: "gap:10px" }, kindSel, search),
    list, chosen,
    el("div", { class: "tiny muted" }, L("Học sinh làm ngay trên web (đề PDF + audio), máy chấm tự động theo đáp án của ngân hàng đề. Mỗi học sinh nộp một lần.",
      "Students do it on the web (PDF + audio) and it's marked automatically with the bank's answer key. One attempt per student.")));
  node.read = () => picked;
  return node;
}
