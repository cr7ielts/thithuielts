// SPEAKING — Part 1/2/3, ghi âm từng câu, tự chuyển khi hết giờ nói
import { el, icon, toast, confirmDialog, setExamGuard, fmtClock } from "../ui.js";
import { TEST } from "../data/current.js";
import { saveSubmission, uploadAudio } from "../store.js";
import { ENABLE_AUDIO_UPLOAD } from "../config.js";
import { L } from "../i18n.js";

const SKILL = "speaking";

/* Dựng danh sách lượt nói phẳng từ 3 part */
function buildTurns() {
  const turns = [];
  for (const part of TEST.speaking.parts) {
    if (part.cue) {
      turns.push({
        partId: part.id, partTitle: part.title,
        kind: "cue", cue: part.cue,
        prompt: part.cue.topic,
        prepSeconds: part.prepSeconds, speakSeconds: part.speakSeconds,
      });
      if (part.followUp) {
        turns.push({ partId: part.id, partTitle: part.title, kind: "q", prompt: part.followUp, prepSeconds: 0, speakSeconds: 30 });
      }
    }
    for (const q of part.questions) {
      turns.push({ partId: part.id, partTitle: part.title, kind: "q", prompt: q, prepSeconds: part.prepSeconds, speakSeconds: part.speakSeconds });
    }
  }
  return turns;
}

export function renderSpeaking(ctx) {
  const view = el("div");
  view.append(briefing(ctx, view));
  return view;
}

function briefing(ctx, view) {
  const turns = buildTurns();
  const est = Math.round(turns.reduce((s, t) => s + t.prepSeconds + t.speakSeconds, 0) / 60);
  return el(
    "div", { class: "card intro-card" },
    el("div", { class: "row", style: "gap:14px;margin-bottom:6px" },
      el("div", { class: "skill-ico speaking" }, icon("speaking")),
      el("div", {},
        el("h1", { style: "margin-bottom:2px" }, "Speaking"),
        el("div", { class: "muted" },
          L(`${turns.length} lượt nói · khoảng ${est} phút · 3 part`, `${turns.length} questions · about ${est} minutes · 3 parts`)))
    ),
    el("div", {
      class: "notice notice-warn", style: "margin:16px 0",
      html: L(
        "Bài thi cần <strong>quyền truy cập micro</strong>. Trình duyệt sẽ hỏi khi bạn bấm bắt đầu — hãy chọn “Cho phép”. Nếu từ chối, bạn vẫn làm được bài nhưng hệ thống chỉ ghi nhận thời gian nói, không có file ghi âm.",
        "This test needs <strong>microphone access</strong>. Your browser will ask when you start — choose “Allow”. If you block it, you can still take the test, but only your speaking time is recorded, not your voice."
      ),
    }),
    el("ul", { class: "muted small", style: "margin:0 0 18px;padding-left:20px" },
      el("li", {}, L("Part 2 có 1 phút chuẩn bị, hệ thống tự chuyển sang phần nói khi hết giờ.", "Part 2 gives you 1 minute to prepare; recording starts automatically when it ends.")),
      el("li", {}, L("Mỗi lượt nói tự dừng khi hết thời gian; bạn có thể dừng sớm.", "Each answer stops when its time is up, or you can stop early.")),
      el("li", {}, ENABLE_AUDIO_UPLOAD
        ? L("File ghi âm được tải lên để giáo viên nghe và chấm.", "Your recordings are uploaded so your teacher can listen and give a band.")
        : L("File ghi âm chỉ lưu trên máy bạn (đã tắt tải lên trong config).", "Recordings stay on your device (uploading is turned off in config)."))
    ),
    el("button", {
      class: "btn btn-primary btn-lg",
      onclick: () => { view.innerHTML = ""; view.append(examUI(ctx)); },
    }, L("Bắt đầu làm bài", "Start the test"))
  );
}

function examUI(ctx) {
  const turns = buildTurns();
  const results = turns.map(() => null); // { seconds, blob }
  const startedAt = new Date();
  let idx = 0, stream = null, recorder = null, chunks = [], tickIv = null, submitted = false;

  setExamGuard(true);

  const elapsedNode = el("span", {}, "00:00");
  const t0 = Date.now();
  const elapsedIv = setInterval(() => { elapsedNode.textContent = fmtClock((Date.now() - t0) / 1000); }, 500);

  const progressBadge = el("span", { class: "badge badge-brand" }, "");
  const bar = el(
    "div", { class: "exam-bar" },
    el("strong", {}, "Speaking"),
    el("div", { class: "timer" }, el("span", { class: "lbl" }, L("Đã dùng", "Elapsed")), elapsedNode),
    el("div", { class: "spacer" }),
    progressBadge
  );

  const stage = el("div", { class: "card" });
  const wrap = el("div");
  wrap.append(bar, stage);

  (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast(L("Không truy cập được micro — bài vẫn tiếp tục, chỉ ghi nhận thời gian nói.",
              "No microphone access — the test continues, recording speaking time only."), "err", 6000);
    }
    showTurn();
  })();

  /* ---------------- một lượt nói ---------------- */
  function showTurn() {
    const t = turns[idx];
    progressBadge.textContent = `${L("Lượt", "Question")} ${idx + 1}/${turns.length} · ${t.partTitle.split("—")[0].trim()}`;
    stage.innerHTML = "";

    const phase = el("div", { class: "badge" }, L("Chuẩn bị", "Prepare"));
    const clock = el("div", { class: "timer" },
      el("span", { class: "lbl" }, L("Thời gian", "Time")),
      el("span", {}, fmtClock(t.prepSeconds || t.speakSeconds)));
    const clockVal = clock.lastChild;

    const head = el("div", { class: "row", style: "margin-bottom:14px" },
      el("h2", { style: "margin:0" }, t.partTitle), el("div", { class: "spacer" }), phase, clock);

    const promptNode = t.kind === "cue"
      ? el("div", { class: "cue-card" },
          el("strong", {}, t.cue.topic),
          el("div", { class: "small muted", style: "margin-top:8px" }, "You should say:"),
          el("ul", {}, t.cue.bullets.map((b) => el("li", {}, b))))
      : el("div", { class: "turn-q", style: "font-size:1.15rem" }, t.prompt);

    const noteArea = t.kind === "cue"
      ? el("textarea", { id: "cue-notes", placeholder: L("Ghi chú nhanh trong 1 phút chuẩn bị…", "Jot down notes during your minute…"), style: "width:100%;min-height:110px;margin-top:14px" })
      : null;

    const recRow = el("div", { class: "row", style: "margin-top:18px" });
    const startBtn = el("button", { class: "btn btn-primary" }, L("🎙️  Bắt đầu nói", "🎙️  Start speaking"));
    const stopBtn = el("button", { class: "btn hidden" }, L("⏹  Dừng và tiếp tục", "⏹  Stop and continue"));
    const skipBtn = el("button", { class: "btn btn-ghost" }, L("Bỏ qua câu này", "Skip this question"));
    const recDot = el("span", { class: "rec-dot hidden" });
    recRow.append(startBtn, stopBtn, recDot, el("div", { class: "spacer" }), skipBtn);

    stage.append(...[head, promptNode, noteArea, recRow,
      el("div", { class: "tiny dim", style: "margin-top:12px" },
        L(`Thời lượng nói tối đa: ${t.speakSeconds} giây.`, `Maximum speaking time: ${t.speakSeconds} seconds.`))].filter(Boolean));

    let left, spokenSeconds = 0;

    function runClock(seconds, onEnd) {
      left = seconds;
      clockVal.textContent = fmtClock(left);
      clearInterval(tickIv);
      tickIv = setInterval(() => {
        left -= 1;
        clockVal.textContent = fmtClock(Math.max(0, left));
        clock.classList.toggle("danger", left <= 10);
        if (left <= 0) { clearInterval(tickIv); onEnd(); }
      }, 1000);
    }

    function beginSpeaking() {
      phase.textContent = L("Đang nói", "Speaking");
      phase.className = "badge badge-red";
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      recDot.classList.remove("hidden");
      const started = Date.now();

      if (stream) {
        chunks = [];
        try {
          recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            results[idx] = { seconds: spokenSeconds, blob };
            nextTurn();
          };
          recorder.start();
        } catch (err) {
          console.warn(err);
          recorder = null;
        }
      }

      runClock(t.speakSeconds, () => finish(started));
      stopBtn.onclick = () => finish(started);
    }

    function finish(started) {
      clearInterval(tickIv);
      spokenSeconds = Math.round((Date.now() - started) / 1000);
      stopBtn.disabled = true;
      recDot.classList.add("hidden");
      if (recorder && recorder.state !== "inactive") {
        recorder.stop(); // nextTurn() được gọi trong onstop
      } else {
        results[idx] = { seconds: spokenSeconds, blob: null };
        nextTurn();
      }
    }

    startBtn.onclick = beginSpeaking;
    skipBtn.onclick = () => {
      clearInterval(tickIv);
      results[idx] = { seconds: 0, blob: null, skipped: true };
      nextTurn();
    };

    // Part 2: tự động đếm ngược 1 phút chuẩn bị rồi vào phần nói
    if (t.prepSeconds > 0) {
      phase.textContent = L("Chuẩn bị", "Prepare");
      phase.className = "badge badge-amber";
      startBtn.textContent = L("Bỏ qua chuẩn bị, nói luôn", "Skip preparation and speak now");
      runClock(t.prepSeconds, beginSpeaking);
    } else {
      phase.textContent = L("Sẵn sàng", "Ready");
      clockVal.textContent = fmtClock(t.speakSeconds);
    }
  }

  function nextTurn() {
    idx += 1;
    if (idx >= turns.length) finishExam();
    else showTurn();
  }

  /* ---------------- kết thúc & nộp ---------------- */
  async function finishExam() {
    if (submitted) return;
    submitted = true;
    clearInterval(tickIv);
    clearInterval(elapsedIv);
    setExamGuard(false);
    stream?.getTracks().forEach((tr) => tr.stop());

    const progress = el("div", { class: "muted" }, L("Đang xử lý bài nói…", "Processing your answers…"));
    stage.innerHTML = "";
    stage.append(el("h2", {}, L("Đang nộp bài", "Submitting")), progress);

    const payloadTurns = [];
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i], r = results[i];
      let audioUrl = null;
      if (r?.blob && ENABLE_AUDIO_UPLOAD) {
        progress.textContent = L(`Đang tải file ghi âm ${i + 1}/${turns.length}…`, `Uploading recording ${i + 1}/${turns.length}…`);
        audioUrl = await uploadAudio(ctx.user.uid, r.blob, `${TEST.id}/${Date.now()}-turn${String(i + 1).padStart(2, "0")}.webm`);
      }
      payloadTurns.push({
        part: t.partTitle, prompt: t.prompt,
        seconds: r?.seconds || 0, skipped: !!r?.skipped,
        hasAudio: !!r?.blob, audioUrl,
      });
    }

    const spokenTotal = payloadTurns.reduce((s, t) => s + t.seconds, 0);
    try {
      const sub = await saveSubmission(ctx.user, {
        testId: TEST.id, skill: SKILL,
        startedAt: startedAt.toISOString(),
        durationSec: Math.round((Date.now() - t0) / 1000),
        spokenSeconds: spokenTotal,
        autoSubmitted: false,
        turns: payloadTurns,
        graded: false, teacherBand: null, teacherComment: "",
      });
      toast(L("Đã nộp bài Speaking", "Speaking test submitted"), "ok");
      ctx.go("result", { submission: sub });
    } catch (err) {
      console.error(err);
      toast(L("Không lưu được bài nộp: ", "Couldn't save your submission: ") + err.message, "err", 6000);
      stage.append(el("div", { class: "notice notice-error", style: "margin-top:14px" }, err.message));
    }
  }

  // Cho phép thoát sớm
  bar.append(el("button", {
    class: "btn btn-danger btn-sm", style: "margin-left:10px",
    onclick: async () => {
      const ok = await confirmDialog({
        title: L("Kết thúc sớm?", "Finish early?"),
        body: L("Các lượt chưa nói sẽ được ghi nhận là bỏ trống.", "Questions you haven't answered will be recorded as blank."),
        okText: L("Kết thúc và nộp", "Finish and submit"), danger: true,
      });
      if (ok) finishExam();
    },
  }, L("Kết thúc", "Finish")));

  return wrap;
}
