// WRITING — Task 1 + Task 2, đồng hồ chung 60 phút, đếm từ trực tiếp
import { el, icon, toast, Countdown, confirmDialog, setExamGuard, draft, barChartSVG } from "../ui.js";
import { countWords } from "../engine.js";
import { TEST } from "../data/current.js";
import { DURATION } from "../config.js";
import { saveSubmission } from "../store.js";
import { L } from "../i18n.js";

const SKILL = "writing";

export function renderWriting(ctx) {
  const view = el("div");
  view.append(briefing(ctx, view));
  return view;
}

function briefing(ctx, view) {
  return el(
    "div", { class: "card intro-card" },
    el("div", { class: "row", style: "gap:14px;margin-bottom:6px" },
      el("div", { class: "skill-ico writing" }, icon("writing")),
      el("div", {},
        el("h1", { style: "margin-bottom:2px" }, "Writing"),
        el("div", { class: "muted" }, L(`2 task · ${DURATION.writing} phút`, `2 tasks · ${DURATION.writing} minutes`)))
    ),
    el("div", {
      class: "notice notice-info", style: "margin:16px 0",
      html: L(
        "Đồng hồ chạy chung cho cả hai task. Khuyến nghị: <strong>20 phút</strong> cho Task 1 (tối thiểu 150 từ) và <strong>40 phút</strong> cho Task 2 (tối thiểu 250 từ). Task 2 chiếm tỉ trọng điểm gấp đôi Task 1.",
        "One timer runs for both tasks. Spend about <strong>20 minutes</strong> on Task 1 (at least 150 words) and <strong>40 minutes</strong> on Task 2 (at least 250 words). Task 2 is worth twice as much as Task 1."
      ),
    }),
    el("ul", { class: "muted small", style: "margin:0 0 18px;padding-left:20px" },
      el("li", {}, L("Bài viết được lưu nháp tự động vào trình duyệt trong lúc làm.", "Your writing is saved as a draft in this browser while you work.")),
      el("li", {}, L("Writing không chấm tự động — giáo viên sẽ chấm và nhập band sau.", "Writing is not marked automatically — your teacher will give you a band later.")),
      el("li", {}, L("Hệ thống ghi lại thời điểm nộp và tổng thời gian làm bài.", "The submission time and total time spent are recorded."))
    ),
    el("button", {
      class: "btn btn-primary btn-lg",
      onclick: () => { view.innerHTML = ""; view.append(examUI(ctx)); },
    }, L("Bắt đầu làm bài", "Start the test"))
  );
}

function examUI(ctx) {
  const texts = {};
  const saved = draft.load(ctx.user.uid, SKILL);
  if (saved?.data) Object.assign(texts, saved.data);

  const startedAt = new Date();
  let submitted = false;

  const timer = new Countdown({ seconds: DURATION.writing * 60, onEnd: () => doSubmit(true) }).start();
  setExamGuard(true);

  const wordsLabel = (n) => L(`${n} từ`, `${n} words`);
  const totalWords = el("span", { class: "badge" }, wordsLabel(0));
  const bar = el(
    "div", { class: "exam-bar" },
    el("strong", {}, "Writing"),
    timer.node,
    el("div", { class: "spacer" }),
    totalWords,
    el("button", { class: "btn btn-primary", onclick: () => doSubmit(false) }, L("Nộp bài", "Submit"))
  );

  const refresh = () => {
    const n = TEST.writing.tasks.reduce((s, t) => s + countWords(texts[t.id]), 0);
    totalWords.textContent = wordsLabel(n);
    draft.save(ctx.user.uid, SKILL, texts);
  };

  const tabs = el("div", { class: "tabs" });
  const holder = el("div");
  const panels = TEST.writing.tasks.map((t) => taskPanel(t, texts, refresh));

  TEST.writing.tasks.forEach((t, i) => {
    tabs.append(el("button", { class: "btn btn-sm", onclick: () => show(i) },
      `${t.title} · ${t.minutes} ${L("phút", "min")}`));
  });
  function show(i) {
    [...tabs.children].forEach((b, j) => b.classList.toggle("btn-primary", i === j));
    holder.innerHTML = "";
    holder.append(panels[i]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  show(0);
  refresh();

  async function doSubmit(auto) {
    if (submitted) return;
    const tasks = TEST.writing.tasks.map((t) => ({
      id: t.id, title: t.title,
      text: texts[t.id] || "",
      words: countWords(texts[t.id]),
      minWords: t.minWords,
    }));
    if (!auto) {
      const short = tasks.filter((t) => t.words < t.minWords);
      const list = short.map((t) => `${t.title} (${t.words}/${t.minWords})`).join(", ");
      const ok = await confirmDialog({
        title: L("Nộp bài Writing?", "Submit your Writing test?"),
        body: short.length
          ? L(`Chưa đủ số từ tối thiểu: ${list}. Bài thiếu từ sẽ bị trừ điểm. Vẫn nộp?`,
              `Below the minimum word count: ${list}. Short answers lose marks. Submit anyway?`)
          : L("Sau khi nộp bạn không sửa lại được.", "You can't edit your answers after submitting."),
        okText: L("Nộp bài", "Submit"),
      });
      if (!ok) return;
    }
    submitted = true;
    timer.stop();
    setExamGuard(false);

    try {
      const sub = await saveSubmission(ctx.user, {
        testId: TEST.id, skill: SKILL,
        startedAt: startedAt.toISOString(),
        durationSec: timer.elapsedSeconds,
        autoSubmitted: auto,
        tasks,
        graded: false, teacherBand: null, teacherComment: "",
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

function taskPanel(task, texts, refresh) {
  const counter = el("span", { class: "badge" }, "0");
  const ta = el("textarea", {
    id: `essay-${task.id}`,
    class: "essay",
    placeholder: L("Viết bài của bạn ở đây…", "Write your answer here…"),
    spellcheck: "false",
    oninput: (e) => { texts[task.id] = e.target.value; update(); refresh(); },
  });
  ta.value = texts[task.id] || "";

  function update() {
    const n = countWords(ta.value);
    counter.textContent = L(`${n} / ${task.minWords} từ`, `${n} / ${task.minWords} words`);
    counter.className = "badge " + (n >= task.minWords ? "badge-green" : "badge-amber");
  }
  update();

  const promptCard = el(
    "div", { class: "card" },
    el("div", { class: "row", style: "margin-bottom:10px" },
      el("h2", { style: "margin:0" }, task.title),
      el("span", { class: "badge badge-brand" }, L(`khuyến nghị ${task.minutes} phút`, `about ${task.minutes} minutes`))),
    el("div", { html: task.prompt })
  );
  if (task.chart) {
    promptCard.append(
      el("div", { style: "margin-top:14px" },
        el("div", { html: barChartSVG(task.chart) }),
        el("div", { class: "tiny dim", style: "margin-top:4px" }, task.chart.caption))
    );
  }

  return el(
    "div", { class: "stack" },
    promptCard,
    el("div", { class: "card" },
      el("div", { class: "row", style: "margin-bottom:10px" },
        el("strong", {}, L("Bài làm của bạn", "Your answer")), el("div", { class: "spacer" }), counter),
      ta)
  );
}
