// LISTENING — 4 section, đồng hồ 32 phút, mỗi section chỉ được phát một lần
import { el, icon, toast, Countdown, confirmDialog, setExamGuard, draft } from "../ui.js";
import { renderGroup, grade, rawToBand, progressDots, allQuestionNumbers, countQuestions } from "../engine.js";
import { TEST, BAND_LISTENING } from "../data/current.js";
import { DURATION } from "../config.js";
import { saveSubmission } from "../store.js";
import { L } from "../i18n.js";
import { createHighlighter, attachHtmlHighlighter } from "../highlight.js";

const SKILL = "listening";

export function renderListening(ctx) {
  const view = el("div");
  view.append(briefing(ctx, view));
  return view;
}

function briefing(ctx, view) {
  const totalQ = TEST.listening.sections.reduce((s, sec) => s + countQuestions(sec.groups), 0);
  return el(
    "div", { class: "card intro-card" },
    el("div", { class: "row", style: "gap:14px;margin-bottom:6px" },
      el("div", { class: "skill-ico listening" }, icon("listening")),
      el("div", {},
        el("h1", { style: "margin-bottom:2px" }, "Listening"),
        el("div", { class: "muted" },
          L(`${totalQ} câu · ${DURATION.listening} phút · 4 section`, `${totalQ} questions · ${DURATION.listening} minutes · 4 sections`)))
    ),
    el("div", {
      class: "notice notice-info", style: "margin:16px 0",
      html: L(
        "Mỗi section chỉ được phát <strong>một lần</strong>, đúng như thi thật. Bạn vừa nghe vừa trả lời; đồng hồ chạy liên tục cho cả bài.<br>" +
        "Nếu chưa gắn file audio thật, trình duyệt sẽ đọc transcript bằng giọng đọc tự động.",
        "Each section is played <strong>once</strong>, just like the real test. Answer while you listen; one timer runs for the whole paper.<br>" +
        "If no audio file is attached, your browser reads the transcript aloud with text-to-speech."
      ),
    }),
    el("ul", { class: "muted small", style: "margin:0 0 18px;padding-left:20px" },
      el("li", {}, L("Chuẩn bị tai nghe và kiểm tra âm lượng trước khi bắt đầu.", "Put on headphones and check the volume before you start.")),
      el("li", {}, L("Tải lại trang không dừng được đồng hồ — bài làm được lưu nháp tự động.", "Reloading the page does not pause the timer — your answers are saved as a draft.")),
      el("li", {}, L("Hết giờ hệ thống tự động nộp bài và ghi lại thời điểm nộp.", "When time runs out, your answers are submitted automatically and the time is recorded."))
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
  const wrap = el("div");
  const numbers = TEST.listening.sections.flatMap((s) => allQuestionNumbers(s.groups));
  const dots = progressDots(numbers, answers);

  let submitted = false;
  const timer = new Countdown({ seconds: DURATION.listening * 60, onEnd: () => doSubmit(true) }).start();
  const hl = createHighlighter();
  setExamGuard(true);

  const bar = el(
    "div", { class: "exam-bar" },
    el("strong", {}, "Listening"),
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
  const panels = el("div");
  const panelNodes = TEST.listening.sections.map((sec) => sectionPanel(sec, answers, onChange));
  panelNodes.forEach((p) => attachHtmlHighlighter(p, hl));

  TEST.listening.sections.forEach((sec, i) => {
    tabs.append(el("button", { class: "btn btn-sm", onclick: () => show(i) },
      `${sec.title} · ${L("câu", "Q")} ${sec.groups[0].questions[0].n}–${lastN(sec)}`));
  });
  function show(i) {
    [...tabs.children].forEach((b, j) => b.classList.toggle("btn-primary", i === j));
    panels.innerHTML = "";
    panels.append(panelNodes[i]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  show(0);

  async function doSubmit(auto) {
    if (submitted) return;
    if (!auto) {
      const blank = numbers.filter((n) => !String(answers[n] ?? "").trim()).length;
      const ok = await confirmDialog({
        title: L("Nộp bài Listening?", "Submit your Listening test?"),
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
    window.speechSynthesis?.cancel();

    const groups = TEST.listening.sections.flatMap((s) => s.groups);
    const res = grade(groups, answers);
    const band = rawToBand(res.correct, BAND_LISTENING);

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

  wrap.append(bar, tabs, panels);
  return wrap;
}

function lastN(sec) {
  const qs = sec.groups.flatMap((g) => g.questions);
  return qs[qs.length - 1].n;
}

function sectionPanel(sec, answers, onChange) {
  const panel = el("div", { class: "card" });
  panel.append(
    el("div", { class: "row", style: "margin-bottom:4px" },
      el("h2", { style: "margin:0" }, sec.title),
      el("span", { class: "badge badge-brand" }, `${L("câu", "Questions")} ${sec.groups[0].questions[0].n}–${lastN(sec)}`)),
    el("p", { class: "muted small" }, sec.context)
  );
  panel.append(audioBox(sec));
  for (const g of sec.groups) panel.append(renderGroup(g, answers, onChange));
  return panel;
}

/* ---------- Trình phát: file audio thật, hoặc giọng đọc của trình duyệt ---------- */
function audioBox(sec) {
  const box = el("div", { class: "audio-box", style: "margin:16px 0 20px" });
  const wave = el("div", { class: "wave" }, Array.from({ length: 7 }, () => el("span")));
  const status = el("span", { class: "small muted" }, L("Chưa phát", "Not played yet"));
  let played = false;

  if (sec.audioUrl) {
    const audio = el("audio", { src: sec.audioUrl, preload: "none" });
    const btn = el("button", { class: "btn btn-primary" }, L("▶  Phát audio (1 lần)", "▶  Play audio (once)"));
    btn.onclick = () => {
      if (played) return;
      played = true;
      btn.disabled = true;
      wave.classList.add("on");
      status.textContent = L("Đang phát…", "Playing…");
      audio.play();
      audio.onended = () => { wave.classList.remove("on"); status.textContent = L("Đã phát xong", "Finished"); };
    };
    box.append(btn, wave, status, audio);
  } else {
    const btn = el("button", { class: "btn btn-primary" }, L("▶  Phát bằng giọng đọc trình duyệt", "▶  Play with text-to-speech"));
    const stopBtn = el("button", { class: "btn btn-sm hidden" }, L("Dừng", "Stop"));
    btn.onclick = () => {
      if (played) return;
      if (!("speechSynthesis" in window)) {
        toast(L("Trình duyệt không hỗ trợ đọc tự động. Hãy gắn file audio trong js/data/test01.js.",
                "This browser has no text-to-speech. Add an audio file in js/data/test01.js."), "err", 6000);
        return;
      }
      played = true;
      btn.disabled = true;
      stopBtn.classList.remove("hidden");
      wave.classList.add("on");
      status.textContent = L("Đang phát…", "Playing…");
      speak(sec.transcript, () => {
        wave.classList.remove("on");
        stopBtn.classList.add("hidden");
        status.textContent = L("Đã phát xong", "Finished");
      });
    };
    stopBtn.onclick = () => {
      window.speechSynthesis.cancel();
      wave.classList.remove("on");
      stopBtn.classList.add("hidden");
      status.textContent = L("Đã dừng", "Stopped");
    };
    box.append(btn, stopBtn, wave, status, el("span", { class: "badge badge-amber" }, L("chế độ luyện tập", "practice mode")));
  }
  return box;
}

// Chrome cắt câu dài, nên tách transcript thành từng câu rồi xếp hàng đọc
function speak(text, onDone) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const voices = synth.getVoices();
  const en = voices.find((v) => /en-GB/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
  const chunks = String(text)
    .split(/\n+/)
    .flatMap((p) => p.match(/[^.!?]+[.!?]*/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);

  let i = 0;
  const next = () => {
    if (i >= chunks.length) { onDone?.(); return; }
    const u = new SpeechSynthesisUtterance(chunks[i++]);
    if (en) u.voice = en;
    u.lang = en?.lang || "en-GB";
    u.rate = 0.95;
    u.onend = next;
    u.onerror = next;
    synth.speak(u);
  };
  next();
}
