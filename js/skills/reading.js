// READING — 3 passage, đồng hồ 60 phút, bố cục 2 cột (bài đọc | câu hỏi)
import { el, icon, toast, Countdown, confirmDialog, setExamGuard, draft } from "../ui.js";
import { renderGroup, grade, rawToBand, progressDots, allQuestionNumbers, countQuestions } from "../engine.js";
import { TEST, BAND_READING } from "../data/current.js";
import { DURATION } from "../config.js";
import { saveSubmission } from "../store.js";
import { L } from "../i18n.js";
import { createHighlighter, attachHtmlHighlighter } from "../highlight.js";

const SKILL = "reading";

export function renderReading(ctx) {
  const view = el("div");
  view.append(briefing(ctx, view));
  return view;
}

function briefing(ctx, view) {
  const totalQ = TEST.reading.passages.reduce((s, p) => s + countQuestions(p.groups), 0);
  return el(
    "div", { class: "card intro-card" },
    el("div", { class: "row", style: "gap:14px;margin-bottom:6px" },
      el("div", { class: "skill-ico reading" }, icon("reading")),
      el("div", {},
        el("h1", { style: "margin-bottom:2px" }, "Reading"),
        el("div", { class: "muted" },
          L(`${totalQ} câu · ${DURATION.reading} phút · 3 passage`, `${totalQ} questions · ${DURATION.reading} minutes · 3 passages`)))
    ),
    el("div", {
      class: "notice notice-info", style: "margin:16px 0",
      html: L("Không có thời gian riêng để chuyển đáp án — hãy phân bổ khoảng <strong>20 phút</strong> cho mỗi passage.",
              "There is no extra time to transfer answers — spend about <strong>20 minutes</strong> on each passage."),
    }),
    el("ul", { class: "muted small", style: "margin:0 0 18px;padding-left:20px" },
      el("li", {}, L("Bài đọc nằm bên trái, câu hỏi bên phải; hai cột cuộn độc lập.", "The passage is on the left and questions on the right; each column scrolls on its own.")),
      el("li", {}, L("Sai chính tả bị tính là sai, giống thi thật.", "Spelling mistakes are marked wrong, as in the real test.")),
      el("li", {}, L("Hết giờ hệ thống tự nộp và ghi lại thời điểm nộp.", "When time runs out, your answers are submitted automatically and the time is recorded."))
    ),
    el("button", {
      class: "btn btn-primary btn-lg",
      onclick: () => { view.innerHTML = ""; view.append(examUI(ctx)); },
    }, L("Bắt đầu làm bài", "Start the test"))
  );
}

function examUI(ctx) {
  const answers = {};
  const saved = draft.load(ctx.user.uid, SKILL);
  if (saved?.data) Object.assign(answers, saved.data);

  const startedAt = new Date();
  const numbers = TEST.reading.passages.flatMap((p) => allQuestionNumbers(p.groups));
  const dots = progressDots(numbers, answers);
  let submitted = false;

  const timer = new Countdown({ seconds: DURATION.reading * 60, onEnd: () => doSubmit(true) }).start();
  const hl = createHighlighter();
  setExamGuard(true);

  const bar = el(
    "div", { class: "exam-bar" },
    el("strong", {}, "Reading"),
    timer.node,
    hl.toolbar,
    el("div", { class: "spacer" }),
    dots,
    el("button", { class: "btn btn-primary", onclick: () => doSubmit(false) }, L("Nộp bài", "Submit"))
  );

  const onChange = () => {
    dots.update();
    draft.save(ctx.user.uid, SKILL, answers);
  };

  const tabs = el("div", { class: "tabs" });
  const holder = el("div");
  const panels = TEST.reading.passages.map((p) => passagePanel(p, answers, onChange));
  panels.forEach((p) => attachHtmlHighlighter(p, hl));

  TEST.reading.passages.forEach((p, i) => {
    tabs.append(el("button", { class: "btn btn-sm", onclick: () => show(i) },
      `${p.title} · ${L("câu", "Q")} ${p.groups[0].questions[0].n}–${lastN(p)}`));
  });
  function show(i) {
    [...tabs.children].forEach((b, j) => b.classList.toggle("btn-primary", i === j));
    holder.innerHTML = "";
    holder.append(panels[i]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  show(0);

  async function doSubmit(auto) {
    if (submitted) return;
    if (!auto) {
      const blank = numbers.filter((n) => !String(answers[n] ?? "").trim()).length;
      const ok = await confirmDialog({
        title: L("Nộp bài Reading?", "Submit your Reading test?"),
        body: blank
          ? L(`Bạn còn <strong>${blank}</strong> câu chưa trả lời. Sau khi nộp không sửa lại được.`,
              `You have <strong>${blank}</strong> unanswered questions. You can't change your answers after submitting.`)
          : L("Bạn đã trả lời hết các câu. Sau khi nộp không sửa lại được.", "You've answered every question. You can't change your answers after submitting."),
        okText: L("Nộp bài", "Submit"),
      });
      if (!ok) return;
    }
    submitted = true;
    timer.stop();
    hl.dispose();
    setExamGuard(false);

    const groups = TEST.reading.passages.flatMap((p) => p.groups);
    const res = grade(groups, answers);
    const band = rawToBand(res.correct, BAND_READING);

    try {
      const sub = await saveSubmission(ctx.user, {
        testId: TEST.id, skill: SKILL,
        startedAt: startedAt.toISOString(),
        durationSec: timer.elapsedSeconds,
        autoSubmitted: auto,
        raw: res.correct, total: res.total, band,
        details: res.details,
        graded: true,
      });
      draft.clear(ctx.user.uid, SKILL);
      toast(auto ? L("Hết giờ — bài đã được nộp tự động", "Time's up — your test was submitted") : L("Đã nộp bài", "Submitted"), "ok");
      ctx.go("result", { submission: sub });
    } catch (err) {
      submitted = false;
      console.error(err);
      toast(L("Không lưu được bài nộp: ", "Couldn't save your submission: ") + err.message, "err", 6000);
    }
  }

  const wrap = el("div");
  wrap.append(bar, tabs, holder);
  return wrap;
}

function lastN(p) {
  const qs = p.groups.flatMap((g) => g.questions);
  return qs[qs.length - 1].n;
}

function passagePanel(p, answers, onChange) {
  const left = el(
    "div", { class: "pane" },
    el("div", { class: "pane-head" },
      el("strong", {}, p.title),
      el("span", { class: "badge" }, `${L("câu", "Questions")} ${p.groups[0].questions[0].n}–${lastN(p)}`)),
    el("div", { class: "pane-body" },
      el("div", { class: "passage" },
        el("h3", {}, p.heading),
        el("p", { class: "muted small" }, p.intro),
        p.paragraphs.map((para) =>
          el("div", { class: "para" },
            el("div", { class: "pmark" }, para.mark || ""),
            el("div", {}, para.text))
        )))
  );

  const right = el(
    "div", { class: "pane" },
    el("div", { class: "pane-head" }, el("strong", {}, L("Câu hỏi", "Questions"))),
    el("div", { class: "pane-body" }, p.groups.map((g) => renderGroup(g, answers, onChange)))
  );

  return el("div", { class: "split" }, left, right);
}
