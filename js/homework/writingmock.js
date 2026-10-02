// WRITING FULL TEST (homework loại "writingmock") — Task 1 (đề + hình biểu đồ) và Task 2 trong một bài, một đồng hồ chung.
//  Bài tập: a.writing = { minutes, task1: { prompt, image: {url,path,name,…} | null, minWords }, task2: { prompt, minWords } }
//  Bài nộp: tasks = [{ id: "task1"|"task2", title, text, words, minWords }], text = cả hai bài (để đếm từ / xem nhanh)
//  Giáo viên chấm band từng task; band tổng = (Task 1 + 2 × Task 2) / 3, làm tròn 0,5 (Task 2 tính gấp đôi như IELTS).
import { el, icon, toast, confirmDialog, fmtDateTime, draft, Countdown } from "../ui.js";
import { countWords } from "../engine.js";
import { L } from "../i18n.js";
import { submitHomework, saveDraft, getDraft, draftExpired } from "./hwstore.js";

const DEF_T1 = "You should spend about 20 minutes on this task.\n\n" +
  "The chart below shows … Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\n" +
  "Write at least 150 words.";
const DEF_T2 = "You should spend about 40 minutes on this task.\n\nWrite about the following topic:\n\n" +
  "…\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.";

export const writingOf = (a) => ({
  minutes: a?.writing?.minutes || 60,
  task1: { prompt: "", image: null, minWords: 150, ...(a?.writing?.task1 || {}) },
  task2: { prompt: "", minWords: 250, ...(a?.writing?.task2 || {}) },
});

/** band tổng theo trọng số IELTS (Task 2 gấp đôi), làm tròn 0,5 */
export function writingOverall(t1, t2) {
  if (t1 == null || t2 == null) return null;
  return Math.round(((t1 + 2 * t2) / 3) * 2) / 2;
}

/* ======================= Form giáo viên ======================= */
export function writingMockFormSection(a) {
  const w = writingOf(a);
  let image = w.task1.image;      // ảnh đã tải lên
  let pendingImage = null;        // File chọn mới, tải lên khi lưu
  const t1 = el("textarea", { id: "wm-t1", style: "width:100%;min-height:150px" });
  t1.value = w.task1.prompt || DEF_T1;
  const t2 = el("textarea", { id: "wm-t2", style: "width:100%;min-height:170px" });
  t2.value = w.task2.prompt || DEF_T2;
  const minutes = el("select", { id: "wm-min", class: "pick" },
    [40, 50, 60, 70, 80].map((m) => el("option", { value: m, selected: m === w.minutes ? "" : null }, L(`${m} phút`, `${m} min`))));
  const preview = el("div", { class: "wm-img-preview" });
  const picker = el("input", { type: "file", class: "hidden", accept: "image/*" });
  const paint = () => {
    const src = pendingImage ? URL.createObjectURL(pendingImage) : image?.url;
    preview.replaceChildren(src
      ? el("div", { class: "stack-sm" }, el("img", { src, alt: "Task 1" }),
          el("div", { class: "row", style: "gap:8px" }, el("span", { class: "tiny muted", style: "flex:1" },
            pendingImage ? L(`${pendingImage.name} · tải lên khi lưu`, `${pendingImage.name} · uploads on save`) : image?.name || ""),
            el("button", { type: "button", class: "btn btn-sm", onclick: () => { pendingImage = null; image = null; paint(); } }, icon("x"), L("Bỏ ảnh", "Remove"))))
      : el("div", { class: "muted small" }, L("Chưa có hình. Task 1 Academic thường có biểu đồ / bảng / bản đồ / quy trình.", "No image yet. Academic Task 1 usually has a chart, table, map or process.")));
  };
  picker.onchange = () => {
    const f = picker.files[0];
    picker.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast(L("Hãy chọn file ảnh (PNG, JPG…).", "Choose an image file (PNG, JPG…)."), "err"); return; }
    pendingImage = f; paint();
  };
  paint();

  const node = el("div", { class: "stack sp-form hidden" },
    el("div", { class: "row wrap", style: "gap:10px;align-items:center" },
      el("strong", { style: "flex:1" }, L("Writing full test — Task 1 + Task 2, một đồng hồ chung", "Writing full test — Task 1 + Task 2, one timer")),
      el("span", { class: "tiny muted" }, L("Tổng thời gian", "Total time")), minutes),
    el("div", { class: "sp-part stack-sm" },
      el("div", { class: "row wrap" }, el("strong", { style: "flex:1" }, "Task 1"), el("span", { class: "tiny muted" }, L("tối thiểu 150 từ", "at least 150 words"))),
      t1,
      el("div", { class: "row wrap", style: "gap:8px" }, el("span", { class: "small strong", style: "flex:1" }, L("Hình Task 1", "Task 1 image")),
        el("button", { type: "button", class: "btn btn-sm", onclick: () => picker.click() }, icon("upload"), L("Chọn ảnh", "Choose image"))),
      preview, picker),
    el("div", { class: "sp-part stack-sm" },
      el("div", { class: "row wrap" }, el("strong", { style: "flex:1" }, "Task 2"), el("span", { class: "tiny muted" }, L("tối thiểu 250 từ", "at least 250 words"))),
      t2),
    el("div", { class: "tiny muted" }, L("Sửa phần “…” trong đề mẫu thành đề thật. Học sinh làm hai task trong cùng một đồng hồ, hết giờ tự nộp.",
      "Replace the “…” in the template with the real prompt. Students do both tasks on one timer; work is submitted when time runs out.")));

  /** đọc form; uploadImage(file) -> meta (gọi khi lưu, sau khi đã có id bài tập) */
  node.read = () => {
    if (!t1.value.trim() || !t2.value.trim()) throw new Error(L("Hãy nhập đề cho cả Task 1 và Task 2.", "Enter prompts for both Task 1 and Task 2."));
    if (/…/.test(t1.value) || /…/.test(t2.value)) throw new Error(L("Đề còn chỗ “…” chưa sửa.", "A prompt still has a “…” placeholder."));
    return {
      minutes: Number(minutes.value),
      task1: { prompt: t1.value.trim(), image, minWords: 150 },
      task2: { prompt: t2.value.trim(), minWords: 250 },
    };
  };
  node.pendingImage = () => pendingImage;
  return node;
}

/* ======================= Học sinh làm bài ======================= */
const promptBox = (task, label, minWords) => el("div", { class: "card wm-prompt" },
  el("div", { class: "row", style: "margin-bottom:8px" }, el("h2", { style: "margin:0;flex:1" }, label),
    el("span", { class: "badge badge-brand" }, L(`tối thiểu ${minWords} từ`, `at least ${minWords} words`))),
  el("div", { style: "white-space:pre-wrap" }, task.prompt),
  task.image?.url ? el("a", { href: task.image.url, target: "_blank", rel: "noopener", class: "wm-img" }, el("img", { src: task.image.url, alt: "Task 1" })) : null);

const joinText = (tasks) => tasks.map((t) => `${String(t.title || t.id).toUpperCase()}\n${t.text || ""}`).join("\n\n");

/**
 * Học sinh mở lại trang khi đã hết giờ mà chưa nộp: nộp luôn bản nháp đã lưu trên máy chủ.
 * → "submitted" | "expired" (hết giờ nhưng không nộp được, vd. đã quá hạn — giáo viên sẽ thu) | null
 */
export async function submitExpiredDraft(ctx, a) {
  const d = await getDraft(a.id, ctx.user.uid).catch(() => null);
  if (!d || !draftExpired(d)) return null;
  try {
    await submitHomework(a, ctx.user, { tasks: d.tasks || [], text: joinText(d.tasks || []), integrity: d.integrity || null,
      startedAt: d.startedAtServer?.toISOString(), durationSec: d.minutes * 60, autoSubmitted: true });
    return "submitted";
  } catch (err) {
    console.warn(err);
    return "expired";
  }
}

export function writingMockWorkArea(ctx, a, sub, teacher, proctor = null, saved = null) {
  const w = writingOf(a);
  const card = el("div", { class: "stack" });
  // đã nộp (hoặc giáo viên xem trước): đề + bài làm, chỉ đọc
  if (sub || teacher || !proctor) {
    if (sub) card.append(el("div", { class: "notice notice-info small" }, `${L("Đã nộp lúc", "Submitted")} ${fmtDateTime(sub.submittedAt)}. ` +
      (sub.autoSubmitted ? L("Hệ thống tự nộp khi hết giờ.", "Submitted automatically when time ran out.") : "")));
    for (const [k, label] of [["task1", "Task 1"], ["task2", "Task 2"]]) {
      card.append(promptBox(w[k], label, w[k].minWords));
      const t = sub?.tasks?.find((x) => x.id === k);
      if (sub) card.append(el("div", { class: "card" },
        el("div", { class: "row", style: "margin-bottom:8px" }, el("strong", { style: "flex:1" }, L(`Bài làm ${label}`, `Your ${label}`)),
          el("span", { class: "badge " + ((t?.words || 0) >= w[k].minWords ? "badge-green" : "badge-amber") }, L(`${t?.words || 0} từ`, `${t?.words || 0} words`))),
        el("div", { class: "hw-essay" }, t?.text || L("(bỏ trống)", "(blank)"))));
    }
    return card;
  }

  const dkey = `hw-${a.id}`;
  // bài làm: bản trên máy này, không có thì bản nháp trên máy chủ (đổi máy giữa chừng)
  const fromServer = Object.fromEntries((saved?.tasks || []).map((t) => [t.id, t.text || ""]));
  const texts = { task1: "", task2: "", ...fromServer, ...(draft.load(ctx.user.uid, dkey)?.data || {}) };
  // đồng hồ tính từ lúc bấm Bắt đầu lần đầu: giờ máy chủ nếu đã có bản nháp, không thì giờ của bộ giám sát
  const elapsed = saved?.startedAtServer ? (Date.now() - saved.startedAtServer.getTime()) / 1000 : proctor.report().elapsedSec || 0;
  let submitted = false;
  const timer = new Countdown({ seconds: Math.max(1, w.minutes * 60 - elapsed), onEnd: () => doSubmit(true) }).start();
  // lưu nháp lên máy chủ: ngay khi bắt đầu, rồi 20 giây một lần nếu có thay đổi — hết giờ mà học sinh đã rời trang
  // thì bài vẫn được thu từ bản nháp này
  const taskList = () => ["task1", "task2"].map((k) => ({ id: k, title: k === "task1" ? "Task 1" : "Task 2", text: texts[k].trim(), words: countWords(texts[k]), minWords: w[k].minWords }));
  let dirty = false, first = !saved;
  const push = async () => {
    if (submitted || (!dirty && !first)) return;
    const wasFirst = first;
    dirty = false; first = false;
    try { await saveDraft(a, ctx.user, { tasks: taskList(), minutes: w.minutes, integrity: proctor.report(), first: wasFirst }); }
    catch (err) { console.warn("lưu nháp", err); dirty = true; first = wasFirst; }
  };
  // 30 giây một lần, chỉ khi có thay đổi (mỗi học sinh tối đa ~120 lần ghi cho bài 60 phút)
  const tick = () => {
    if (!card.isConnected) {            // đã sang trang khác: lưu lần cuối rồi dừng hẳn
      push(); clearInterval(saveIv);
      document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", push);
      timer.stop();
      return;
    }
    push();
  };
  push();
  let saveIv = setInterval(tick, 30000);
  const onHide = () => { if (document.hidden) push(); };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", push);
  const total = el("span", { class: "badge" });
  const counters = {};
  const refresh = () => {
    total.textContent = L(`Task 1: ${countWords(texts.task1)} từ · Task 2: ${countWords(texts.task2)} từ`,
      `Task 1: ${countWords(texts.task1)} · Task 2: ${countWords(texts.task2)} words`);
    for (const k of ["task1", "task2"]) {
      const n = countWords(texts[k]);
      dirty = true;
      counters[k].textContent = L(`${n} / ${w[k].minWords} từ`, `${n} / ${w[k].minWords} words`);
      counters[k].className = "badge " + (n >= w[k].minWords ? "badge-green" : "badge-amber");
    }
    draft.save(ctx.user.uid, dkey, texts);
  };
  const panels = {};
  for (const [k, label] of [["task1", "Task 1"], ["task2", "Task 2"]]) {
    counters[k] = el("span", { class: "badge" });
    const ta = el("textarea", { id: `wm-${k}`, class: "essay", spellcheck: "false", placeholder: L("Viết bài của bạn ở đây…", "Write your answer here…"),
      oninput: (e) => { texts[k] = e.target.value; refresh(); } });
    ta.value = texts[k];
    proctor.guardText(ta);
    panels[k] = el("div", { class: "wm-split" }, promptBox(w[k], label, w[k].minWords),
      el("div", { class: "card" }, el("div", { class: "row", style: "margin-bottom:8px" }, el("strong", { style: "flex:1" }, L("Bài làm", "Your answer")), counters[k]), ta));
  }
  const holder = el("div");
  const tabs = el("div", { class: "row", style: "gap:8px" });
  const show = (k) => {
    holder.replaceChildren(panels[k]);
    [...tabs.children].forEach((b) => b.classList.toggle("btn-primary", b.dataset.k === k));
  };
  for (const [k, label] of [["task1", "Task 1"], ["task2", "Task 2"]]) tabs.append(el("button", { type: "button", class: "btn btn-sm", dataset: { k }, onclick: () => show(k) }, label));
  const submitBtn = el("button", { class: "btn btn-primary", onclick: () => doSubmit(false) }, icon("check"), L("Nộp bài", "Submit"));
  const bar = el("div", { class: "exam-bar" }, el("strong", {}, "Writing"), timer.node, el("div", { class: "spacer" }), total, submitBtn);
  refresh(); show("task1");

  let closing = false;   // đang nộp: chặn nộp hai lần (vd. hết giờ đúng lúc đang ở hộp xác nhận)
  async function doSubmit(auto) {
    if (submitted || closing) return;
    const short = ["task1", "task2"].filter((k) => countWords(texts[k]) < w[k].minWords);
    if (!auto) {
      const ok = await confirmDialog({
        title: L("Nộp bài Writing?", "Submit your Writing test?"),
        body: (short.length ? L(`Chưa đủ số từ tối thiểu: ${short.map((k) => k === "task1" ? "Task 1" : "Task 2").join(", ")}. `,
          `Below the minimum word count: ${short.map((k) => k === "task1" ? "Task 1" : "Task 2").join(", ")}. `) : "") +
          L("Bài chỉ nộp được một lần.", "You can submit only once."),
        okText: L("Nộp bài", "Submit"),
      });
      if (!ok || closing || submitted) return;
    }
    closing = true; submitBtn.disabled = true;
    dirty = true; await push();                      // lưu bản cuối lên máy chủ trước
    submitted = true; clearInterval(saveIv); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", push);
    const tasks = taskList();
    const rep = proctor.report();
    try {
      await submitHomework(a, ctx.user, {
        tasks, text: joinText(tasks),
        integrity: rep, startedAt: rep.startedAt, durationSec: rep.elapsedSec, autoSubmitted: auto,
      });
      timer.stop();
      proctor.stop();
      draft.clear(ctx.user.uid, dkey);
      toast(auto ? L("Hết giờ — bài đã được nộp", "Time's up — submitted") : L("Đã nộp bài!", "Submitted!"), "ok");
      ctx.go(`homework/${a.id}`, { t: Date.now() });
    } catch (err) {
      if (auto || timer.remaining <= 0) {
        timer.stop();
        // hết giờ mà nộp lỗi (mạng, quá hạn…): bản nháp đã lưu trên máy chủ, giáo viên sẽ thu
        proctor.stop(true);
        card.replaceChildren(el("div", { class: "notice notice-info" }, L("Đã hết giờ. Bài làm đã được lưu — giáo viên sẽ thu bài từ bản lưu này.",
          "Time is up. Your work has been saved — your teacher will collect it from this copy.")));
        return;
      }
      submitted = false; closing = false; submitBtn.disabled = false;
      saveIv = setInterval(tick, 30000);                 // nộp lỗi: tiếp tục lưu nháp
      document.addEventListener("visibilitychange", onHide);
      toast(L("Không nộp được: ", "Couldn't submit: ") + err.message, "err", 7000);
    }
  }
  card.append(bar, tabs, holder);
  return card;
}

/* ======================= Giáo viên chấm ======================= */
/** hai bài làm (đề thu gọn) cho trang Chấm bài */
export function writingMockReview(a, s) {
  const w = writingOf(a);
  return el("div", { class: "stack" }, ["task1", "task2"].map((k) => {
    const t = s.tasks?.find((x) => x.id === k);
    return el("div", { class: "stack-sm" },
      el("div", { class: "row wrap", style: "gap:8px" }, el("strong", { style: "flex:1" }, k === "task1" ? "Task 1" : "Task 2"),
        el("span", { class: "chip " + ((t?.words || 0) >= w[k].minWords ? "chip-ok" : "chip-warn") }, L(`${t?.words || 0} từ`, `${t?.words || 0} words`))),
      el("details", {}, el("summary", { class: "tiny muted" }, L("Xem đề", "Show prompt")),
        el("div", { class: "small", style: "white-space:pre-wrap" }, w[k].prompt),
        w[k].image?.url ? el("img", { src: w[k].image.url, alt: "Task 1", class: "wm-thumb" }) : null),
      el("div", { class: "hw-essay" }, t?.text || "—"));
  }));
}

/** ô chọn band Task 1 / Task 2; onChange(overall) để điền band tổng */
export function writingBandInputs(s, onChange) {
  const bands = [];
  for (let b = 9; b >= 0; b -= 0.5) bands.push(b);
  const start = s.teacherCriteria || {};
  const sels = ["t1", "t2"].map((k) => el("select", { class: "pick", id: `wb-${k}-${s.id}`, "aria-label": k },
    el("option", { value: "" }, "—"), bands.map((b) => el("option", { value: b, selected: start[k] === b ? "" : null }, b.toFixed(1)))));
  const read = () => {
    const [a, b] = sels.map((x) => (x.value === "" ? null : Number(x.value)));
    return a == null && b == null ? null : { t1: a, t2: b };
  };
  sels.forEach((x) => { x.onchange = () => { const c = read(); onChange(c ? writingOverall(c.t1, c.t2) : null); }; });
  const box = el("div", { class: "crit-inputs" },
    el("label", { class: "crit-input", for: sels[0].id }, el("span", { class: "tiny strong" }, "Task 1"), sels[0]),
    el("label", { class: "crit-input", for: sels[1].id }, el("span", { class: "tiny strong" }, L("Task 2 (×2)", "Task 2 (×2)")), sels[1]));
  return { box, read };
}
