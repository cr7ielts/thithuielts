// SPEAKING HOMEWORK — giáo viên soạn đề theo Part 1/2/3 hoặc tự do; học sinh ghi âm từng câu;
// AI (Gemini) phân tích 4 tiêu chí; giáo viên xem báo cáo và chốt điểm.
import { el, icon, toast, confirmDialog, fmtDateTime, fmtClock } from "../ui.js";
import { L } from "../i18n.js";
import { uploadFile, submitHomework } from "./hwstore.js";
import { analyzeSpeaking, aiAvailable, CRITERIA } from "./speaking-ai.js";

const DEFAULTS = { mode: "parts", part1: [], part2: null, part3: [], p1Secs: 45, p2Prep: 60, p2Secs: 120, p3Secs: 60, freePrompt: "", freeSecs: 120, showAi: false };
const lines = (t) => String(t || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

/* ======================= Danh sách lượt nói ======================= */
export function speakingTurns(a) {
  const s = { ...DEFAULTS, ...(a.speaking || {}) };
  if (s.mode === "free") {
    return [{ part: L("Tự do", "Free talk"), prompt: s.freePrompt || a.title, maxSeconds: s.freeSecs, prepSeconds: 0 }];
  }
  const turns = [];
  s.part1.forEach((q) => turns.push({ part: "Part 1", prompt: q, maxSeconds: s.p1Secs, prepSeconds: 0 }));
  if (s.part2?.topic) turns.push({ part: "Part 2", prompt: s.part2.topic, cue: s.part2, maxSeconds: s.p2Secs, prepSeconds: s.p2Prep });
  s.part3.forEach((q) => turns.push({ part: "Part 3", prompt: q, maxSeconds: s.p3Secs, prepSeconds: 0 }));
  return turns;
}

/* ======================= Form giáo viên ======================= */
export function speakingFormSection(a) {
  const s = { ...DEFAULTS, ...(a?.speaking || {}) };
  const radio = (v, label) => el("label", { class: "check" },
    el("input", { type: "radio", name: "sp-mode", value: v, checked: s.mode === v ? "" : null, onchange: sync }), label);
  const secsSel = (id, val, opts) => el("select", { id, class: "pick" },
    opts.map((o) => el("option", { value: o, selected: Number(val) === o ? "" : null }, o >= 60 && o % 60 === 0 ? `${o / 60} min` : `${o} s`)));

  const p1 = el("textarea", { id: "sp-p1", style: "width:100%;min-height:110px", placeholder: "Do you work or are you a student?\nWhat do you like most about your hometown?" });
  p1.value = s.part1.join("\n");
  const p2topic = el("input", { type: "text", id: "sp-p2-topic", style: "width:100%", value: s.part2?.topic || "", placeholder: "Describe a book you enjoyed reading." });
  const p2bullets = el("textarea", { id: "sp-p2-bullets", style: "width:100%;min-height:90px", placeholder: "what the book was\nwhen you read it\nwhat it was about\nand explain why you enjoyed it." });
  p2bullets.value = (s.part2?.bullets || []).join("\n");
  const p3 = el("textarea", { id: "sp-p3", style: "width:100%;min-height:110px", placeholder: "Why do some people prefer e-books?\nShould schools make reading compulsory?" });
  p3.value = s.part3.join("\n");
  const freePrompt = el("textarea", { id: "sp-free", style: "width:100%;min-height:100px", placeholder: L("Ví dụ: Kể về kỳ nghỉ gần nhất của bạn trong 2 phút.", "e.g. Talk about your last holiday for 2 minutes.") });
  freePrompt.value = s.freePrompt || "";
  const p1Secs = secsSel("sp-p1-secs", s.p1Secs, [30, 45, 60]);
  const p2Secs = secsSel("sp-p2-secs", s.p2Secs, [60, 120, 180]);
  const p2Prep = secsSel("sp-p2-prep", s.p2Prep, [0, 60]);
  const p3Secs = secsSel("sp-p3-secs", s.p3Secs, [45, 60, 90]);
  const freeSecs = secsSel("sp-free-secs", s.freeSecs, [60, 120, 180, 300]);
  const showAi = el("input", { type: "checkbox", id: "sp-show-ai", checked: s.showAi ? "" : null });

  const partsBox = el("div", { class: "stack" },
    el("div", { class: "sp-part" },
      el("div", { class: "row wrap" }, el("strong", { style: "flex:1" }, "Part 1 — " + L("mỗi dòng một câu hỏi", "one question per line")),
        el("span", { class: "tiny muted" }, L("Mỗi câu tối đa", "Max per answer")), p1Secs),
      p1),
    el("div", { class: "sp-part" },
      el("div", { class: "row wrap" }, el("strong", { style: "flex:1" }, "Part 2 — cue card"),
        el("span", { class: "tiny muted" }, L("Chuẩn bị", "Prep")), p2Prep,
        el("span", { class: "tiny muted" }, L("Nói", "Talk")), p2Secs),
      p2topic,
      el("div", { class: "tiny muted" }, L("Gợi ý “You should say” — mỗi dòng một ý:", "“You should say” prompts — one per line:")),
      p2bullets),
    el("div", { class: "sp-part" },
      el("div", { class: "row wrap" }, el("strong", { style: "flex:1" }, "Part 3 — " + L("mỗi dòng một câu hỏi", "one question per line")),
        el("span", { class: "tiny muted" }, L("Mỗi câu tối đa", "Max per answer")), p3Secs),
      p3),
    el("div", { class: "tiny muted" }, L("Bỏ trống part nào thì part đó không có trong bài.", "Leave a part empty to leave it out.")));

  const freeBox = el("div", { class: "sp-part stack-sm" },
    el("div", { class: "row wrap" }, el("strong", { style: "flex:1" }, L("Đề nói tự do", "Free-talk prompt")),
      el("span", { class: "tiny muted" }, L("Thời gian nói tối đa", "Max speaking time")), freeSecs),
    freePrompt);

  function sync() {
    const mode = node.querySelector('input[name="sp-mode"]:checked')?.value || "parts";
    partsBox.classList.toggle("hidden", mode !== "parts");
    freeBox.classList.toggle("hidden", mode !== "free");
  }

  const node = el("div", { class: "stack sp-form hidden" },
    el("div", { class: "row wrap", style: "gap:18px" },
      el("strong", {}, L("Dạng bài Speaking:", "Speaking format:")),
      radio("parts", L("Theo Part 1 / 2 / 3", "IELTS Parts 1 / 2 / 3")),
      radio("free", L("Tự do (một đề)", "Free talk (one prompt)"))),
    partsBox, freeBox,
    aiAvailable() ? el("label", { class: "check" }, showAi, L("Cho học sinh xem nhận xét AI ngay sau khi nộp", "Show the AI feedback to students right after they submit")) : null,
    el("div", { class: "notice notice-info tiny" },
      aiAvailable()
        ? L("Khi học sinh nộp, AI (Gemini) nghe từng câu, chép lời, sửa lỗi và ước lượng band 4 tiêu chí. Bạn xem báo cáo ở trang Review và chốt điểm cuối cùng.",
            "When a student submits, AI (Gemini) listens to each answer, transcribes it, corrects mistakes and estimates the four criteria. You review the report and set the final band.")
        : L("Học sinh ghi âm từng câu trên web. Bạn nghe lại ở trang Review và chấm band theo 4 tiêu chí.",
            "Students record each answer in the browser. You listen on the Review page and mark the four criteria.")));
  setTimeout(sync, 0);

  node.read = () => {
    const mode = node.querySelector('input[name="sp-mode"]:checked')?.value || "parts";
    const bullets = lines(p2bullets.value);
    const sp = {
      mode,
      part1: lines(p1.value),
      part2: p2topic.value.trim() ? { topic: p2topic.value.trim(), bullets } : null,
      part3: lines(p3.value),
      p1Secs: Number(p1Secs.value), p2Prep: Number(p2Prep.value), p2Secs: Number(p2Secs.value), p3Secs: Number(p3Secs.value),
      freePrompt: freePrompt.value.trim(), freeSecs: Number(freeSecs.value),
      showAi: aiAvailable() && showAi.checked,
    };
    const count = speakingTurns({ speaking: sp, title: "" }).length;
    if (mode === "parts" && !count) throw new Error(L("Hãy nhập ít nhất một câu hỏi cho Part 1, 2 hoặc 3.", "Add at least one question for Part 1, 2 or 3."));
    if (mode === "free" && !sp.freePrompt) throw new Error(L("Hãy nhập đề nói tự do.", "Enter the free-talk prompt."));
    return sp;
  };
  return node;
}

/* ======================= Ghi âm một câu ======================= */
function pickMime() {
  // Gemini nhận webm/mp4 (không nhận ogg)
  const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return opts.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
}

let activeRecorder = null; // chỉ một câu được ghi âm tại một thời điểm

function turnRecorder(turn, index, state, onChange) {
  const box = el("div", { class: "sp-turn" + (state[index] ? " done" : "") });
  const clock = el("span", { class: "rec-clock" }, fmtClock(turn.maxSeconds));
  const status = el("span", { class: "chip" });
  const player = el("div", { class: "sp-player" });
  const recordBtn = el("button", { class: "btn btn-primary btn-sm" });
  const notes = turn.cue ? el("textarea", { class: "sp-notes hidden", placeholder: L("Ghi chú nhanh trong lúc chuẩn bị…", "Quick notes while you prepare…") }) : null;
  let rec = null, stream = null, chunks = [], t0 = 0, iv = null, prepIv = null;

  const paint = () => {
    const r = state[index];
    box.classList.toggle("done", !!r);
    player.innerHTML = "";
    if (r) {
      status.className = "chip chip-ok";
      status.textContent = `${L("Đã ghi", "Recorded")} · ${fmtClock(r.seconds)}`;
      player.append(el("audio", { controls: "", src: r.url }));
      recordBtn.innerHTML = ""; recordBtn.append(icon("refresh"), L("Ghi lại", "Re-record"));
      recordBtn.className = "btn btn-sm";
    } else {
      status.className = "chip";
      status.textContent = L("Chưa ghi", "Not recorded");
      recordBtn.innerHTML = ""; recordBtn.append(icon("mic"), turn.prepSeconds ? L("Bắt đầu chuẩn bị", "Start preparing") : L("Ghi âm", "Record"));
      recordBtn.className = "btn btn-primary btn-sm";
    }
    clock.textContent = fmtClock(turn.maxSeconds);
  };

  async function startRecording() {
    clearInterval(prepIv);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      toast(L("Không dùng được micro. Hãy cho phép micro trong trình duyệt rồi thử lại.", "Can't use the microphone. Allow it in your browser and try again."), "err", 6000);
      activeRecorder = null; paint(); return;
    }
    chunks = [];
    const mime = pickMime();
    rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(iv);
      stream.getTracks().forEach((t) => t.stop());
      const seconds = Math.max(1, Math.round((Date.now() - t0) / 1000));
      const blob = new Blob(chunks, { type: (rec.mimeType || mime || "audio/webm") });
      if (state[index]?.url) URL.revokeObjectURL(state[index].url);
      state[index] = { blob, seconds, url: URL.createObjectURL(blob) };
      activeRecorder = null;
      box.classList.remove("recording");
      notes?.classList.add("hidden");
      paint(); onChange();
    };
    rec.start(1000);
    t0 = Date.now();
    box.classList.add("recording");
    status.className = "chip chip-bad"; status.textContent = L("Đang ghi âm…", "Recording…");
    recordBtn.innerHTML = ""; recordBtn.append(icon("x"), L("Dừng", "Stop"));
    recordBtn.className = "btn btn-danger btn-sm";
    iv = setInterval(() => {
      const left = turn.maxSeconds - (Date.now() - t0) / 1000;
      clock.textContent = fmtClock(Math.max(0, left));
      if (left <= 0 && rec.state === "recording") rec.stop();
    }, 250);
  }

  function startPrep() {
    let left = turn.prepSeconds;
    box.classList.add("preparing");
    notes?.classList.remove("hidden");
    status.className = "chip chip-warn"; status.textContent = L("Đang chuẩn bị", "Preparing");
    recordBtn.innerHTML = ""; recordBtn.append(icon("mic"), L("Nói luôn", "Start speaking now"));
    recordBtn.className = "btn btn-primary btn-sm";
    clock.textContent = fmtClock(left);
    prepIv = setInterval(() => {
      left -= 1;
      clock.textContent = fmtClock(Math.max(0, left));
      if (left <= 0) { clearInterval(prepIv); box.classList.remove("preparing"); startRecording(); }
    }, 1000);
  }

  recordBtn.onclick = () => {
    if (rec && rec.state === "recording") { rec.stop(); return; }
    if (box.classList.contains("preparing")) { box.classList.remove("preparing"); startRecording(); return; }
    if (activeRecorder && activeRecorder !== box) { toast(L("Hãy dừng câu đang ghi trước.", "Stop the current recording first."), "err"); return; }
    activeRecorder = box;
    if (turn.prepSeconds && !state[index]) startPrep(); else startRecording();
  };

  box.append(
    el("div", { class: "row wrap", style: "gap:8px" },
      el("span", { class: "sp-part-tag" }, turn.part), el("span", { class: "tiny muted" }, `#${index + 1}`),
      el("div", { class: "spacer" }), status),
    turn.cue
      ? el("div", { class: "cue-card sm" }, el("strong", {}, turn.cue.topic),
          turn.cue.bullets?.length ? el("div", { class: "tiny muted", style: "margin-top:6px" }, "You should say:") : null,
          turn.cue.bullets?.length ? el("ul", {}, turn.cue.bullets.map((b) => el("li", {}, b))) : null)
      : el("div", { class: "turn-q" }, turn.prompt),
    notes || "",
    el("div", { class: "row wrap", style: "gap:10px" }, recordBtn, clock,
      el("span", { class: "tiny muted" }, L(`tối đa ${fmtClock(turn.maxSeconds)}`, `max ${fmtClock(turn.maxSeconds)}`)), player));
  paint();
  return box;
}

/* ======================= Học sinh: làm bài ======================= */
export function speakingWorkArea(ctx, a, sub, teacher) {
  const turns = speakingTurns(a);
  const card = el("div", { class: "card stack" });
  const graded = !!(sub?.gradedAt || sub?.teacherScore);
  const showAi = !!a.speaking?.showAi && aiAvailable();

  // Đã nộp: xem lại bản ghi (và nhận xét AI nếu giáo viên cho phép)
  if (sub) {
    card.append(el("h2", { class: "mb-0" }, L("Bài nói của bạn", "Your speaking")),
      el("div", { class: "notice notice-info small" },
        `${L("Đã nộp lúc", "Submitted")} ${fmtDateTime(sub.submittedAt)}. ` +
        (graded ? L("Giáo viên đã chấm.", "Your teacher has marked it.")
          : showAi ? L("Nhận xét AI ở bên dưới — giáo viên sẽ chốt điểm.", "AI feedback is below — your teacher will confirm the band.")
          : L("Giáo viên sẽ nghe và chấm bài của bạn.", "Your teacher will listen and mark your work."))));
    if (showAi && sub.analysis) card.append(aiReport(sub.analysis, { forTeacher: false }));
    card.append(recordingsList(sub, turns, showAi ? sub.analysis : null));
    if (!graded && !teacher) {
      card.append(el("div", {}, el("button", { class: "btn", onclick: () => { card.replaceWith(recorderArea(ctx, a, turns, teacher, true)); } },
        icon("refresh"), L("Ghi âm lại và nộp lại", "Record again and resubmit"))));
    }
    return card;
  }
  return recorderArea(ctx, a, turns, teacher, !!sub);
}

function recorderArea(ctx, a, turns, teacher, resubmit) {
  const state = [];
  const card = el("div", { class: "card stack" });
  const counter = el("span", { class: "chip" });
  const progress = el("div", { class: "progress hidden" }, el("span", { style: "width:0%" }));
  const status = el("div", { class: "small muted", "aria-live": "polite" });
  const submitBtn = el("button", { class: "btn btn-primary btn-lg", disabled: teacher ? "" : null },
    icon("check"), resubmit ? L("Nộp lại", "Resubmit") : L("Nộp bài", "Submit"));
  const update = () => {
    const n = state.filter(Boolean).length;
    counter.textContent = L(`${n}/${turns.length} câu đã ghi`, `${n}/${turns.length} recorded`);
    counter.className = n === turns.length ? "chip chip-ok" : "chip";
  };

  if (!window.MediaRecorder) {
    card.append(el("div", { class: "notice notice-error" },
      L("Trình duyệt này không ghi âm được. Hãy dùng Chrome, Edge, Firefox hoặc Safari mới.", "This browser can't record audio. Use a recent Chrome, Edge, Firefox or Safari.")));
    return card;
  }

  card.append(
    el("div", { class: "row wrap" }, el("h2", { class: "mb-0", style: "flex:1" }, L("Ghi âm câu trả lời", "Record your answers")), counter),
    el("p", { class: "muted small mb-0" },
      L("Bấm Ghi âm, trả lời như đang thi thật. Hết giờ sẽ tự dừng; nghe lại và ghi lại thoải mái trước khi nộp. Nên dùng tai nghe có micro ở nơi yên tĩnh.",
        "Press Record and answer as if you were in the exam. Recording stops when time is up; listen back and re-record as often as you like before submitting. A quiet room and a headset microphone help.")),
    el("div", { class: "stack" }, turns.map((t, i) => turnRecorder(t, i, state, update))),
    progress, status, el("div", { class: "row" }, submitBtn));
  update();

  submitBtn.onclick = async () => {
    const done = state.filter(Boolean).length;
    if (!done) { toast(L("Bạn chưa ghi âm câu nào.", "You haven't recorded anything yet."), "err"); return; }
    if (activeRecorder) { toast(L("Hãy dừng ghi âm trước khi nộp.", "Stop recording before submitting."), "err"); return; }
    if (done < turns.length) {
      const ok = await confirmDialog({
        title: L("Nộp khi còn thiếu câu?", "Submit with missing answers?"),
        body: L(`Mới ghi ${done}/${turns.length} câu. Câu chưa ghi sẽ được tính là bỏ trống.`, `You've recorded ${done} of ${turns.length}. Missing answers count as blank.`),
        okText: L("Vẫn nộp", "Submit anyway"),
      });
      if (!ok) return;
    }
    submitBtn.disabled = true;
    progress.classList.remove("hidden");
    const bar = progress.firstChild;
    try {
      // 1) Tải ghi âm lên
      const recorded = [];
      for (let i = 0; i < turns.length; i++) {
        const r = state[i];
        if (!r) { recorded.push({ part: turns[i].part, prompt: turns[i].prompt, seconds: 0, audio: null }); continue; }
        status.textContent = L(`Đang tải ghi âm ${i + 1}/${turns.length}…`, `Uploading recording ${i + 1}/${turns.length}…`);
        const ext = r.blob.type.includes("mp4") ? "m4a" : "webm";
        const audio = await uploadFile({ aid: a.id, uid: ctx.user.uid, kind: "submissions", file: r.blob,
          name: `speaking-${String(i + 1).padStart(2, "0")}.${ext}`,
          onProgress: (p) => { bar.style.width = `${Math.round(((i + p) / turns.length) * 40)}%`; } });
        recorded.push({ part: turns[i].part, prompt: turns[i].prompt, seconds: r.seconds, audio, blob: r.blob });
      }

      // 2) AI phân tích (lỗi thì vẫn nộp, giáo viên chấm tay)
      let analysis = null, analysisError = null;
      if (aiAvailable()) {
        const withAudio = recorded.filter((t) => t.blob);
        try {
          analysis = await analyzeSpeaking(withAudio, {
            taskTitle: a.title,
            onProgress: (step, total) => {
              bar.style.width = `${40 + Math.round((step / total) * 55)}%`;
              status.textContent = step < total - 1
                ? L(`i-melts đang nghe câu ${step + 1}/${total - 1}…`, `i-melts is listening to answer ${step + 1}/${total - 1}…`)
                : L("Đang chấm 4 tiêu chí…", "Scoring the four criteria…");
            },
          });
          // gắn phân tích từng câu về đúng vị trí (bỏ qua câu trống)
          let k = 0;
          analysis.turns = recorded.map((t) => (t.blob ? analysis.turns[k++] : null));
        } catch (err) {
          console.error(err);
          analysisError = String(err?.message || err).slice(0, 300);
          toast(L("AI chưa phân tích được — bài vẫn được nộp để giáo viên chấm.", "AI analysis failed — your work is still submitted for your teacher."), "err", 6000);
        }
      }

      // 3) Lưu bài nộp
      status.textContent = L("Đang lưu bài nộp…", "Saving your submission…");
      bar.style.width = "98%";
      await submitHomework(a, ctx.user, {
        turns: recorded.map(({ blob, ...t }) => t),
        files: recorded.filter((t) => t.audio).map((t) => t.audio),
        analysis, analysisError,
      });
      bar.style.width = "100%";
      toast(resubmit ? L("Đã nộp lại!", "Resubmitted!") : L("Đã nộp bài!", "Submitted!"), "ok");
      ctx.go(`homework/${a.id}`, { t: Date.now() });
    } catch (err) {
      console.error(err);
      submitBtn.disabled = false;
      progress.classList.add("hidden");
      status.textContent = "";
      toast(L("Không nộp được: ", "Couldn't submit: ") + (err?.message || err), "err", 7000);
    }
  };
  return card;
}

/* ======================= Danh sách bản ghi ======================= */
/* ----- Tải bản ghi xuống máy ----- */
const slugify = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
  .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const audioExt = (a) => (a?.name?.match(/\.(\w{2,4})$/)?.[1] || (a?.contentType?.includes("mp4") ? "m4a" : a?.contentType?.includes("ogg") ? "ogg" : "webm"));
const fileNameFor = (sub, t, i) => [slugify(sub.name || sub.email || "hoc-sinh"), `cau-${String(i + 1).padStart(2, "0")}`, slugify(t.part)]
  .filter(Boolean).join("_") + "." + audioExt(t.audio);

/** File trên Firebase Storage khác tên miền nên thuộc tính download bị bỏ qua -> tải về dạng blob rồi lưu */
async function downloadAudio(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const blobUrl = URL.createObjectURL(await res.blob());
    const a = el("a", { href: blobUrl, download: filename, style: "display:none" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch (err) {
    console.warn("download fallback", err);
    window.open(url, "_blank", "noopener");   // không tải được thì mở file ở tab mới (bấm ⋮ → Tải xuống)
  }
}

function downloadBtn(url, filename, label) {
  const b = el("button", { type: "button", class: "btn btn-sm", title: filename }, icon("download"), label);
  b.onclick = async () => { b.disabled = true; try { await downloadAudio(url, filename); } finally { b.disabled = false; } };
  return b;
}

export function recordingsList(sub, turnsDef, analysis) {
  const list = el("div", { class: "stack" });
  const withAudio = (sub.turns || []).map((t, i) => ({ t, i })).filter(({ t }) => t.audio?.url);
  if (withAudio.length > 1) {
    const all = el("button", { type: "button", class: "btn btn-sm" }, icon("download"), L(`Tải tất cả (${withAudio.length} file)`, `Download all (${withAudio.length} files)`));
    all.onclick = async () => {
      all.disabled = true;
      for (const { t, i } of withAudio) {
        await downloadAudio(t.audio.url, fileNameFor(sub, t, i));
        await new Promise((r) => setTimeout(r, 400));   // trình duyệt có thể hỏi "cho phép tải nhiều file" — bấm Cho phép
      }
      all.disabled = false;
    };
    list.append(el("div", { class: "row wrap", style: "gap:10px;justify-content:flex-end" },
      el("span", { class: "tiny muted" }, L("Trình duyệt có thể hỏi cho phép tải nhiều file — chọn Cho phép.", "Your browser may ask to allow multiple downloads — choose Allow.")), all));
  }
  (sub.turns || []).forEach((t, i) => {
    const an = analysis?.turns?.[i];
    list.append(el("div", { class: "sp-turn" + (t.audio ? " done" : "") },
      el("div", { class: "row wrap", style: "gap:8px" }, el("span", { class: "sp-part-tag" }, t.part),
        el("span", { class: "tiny muted" }, `#${i + 1}`), el("div", { class: "spacer" }),
        t.audio?.url ? downloadBtn(t.audio.url, fileNameFor(sub, t, i), L("Tải xuống", "Download")) : null,
        t.audio ? el("span", { class: "chip" }, fmtClock(t.seconds)) : el("span", { class: "chip chip-bad" }, L("bỏ trống", "blank"))),
      el("div", { class: "turn-q" }, t.prompt),
      t.audio ? el("audio", { controls: "", preload: "metadata", src: t.audio.url }) : null,
      an?.transcript ? el("div", { class: "sp-transcript" }, el("span", { class: "tiny strong muted" }, L("Lời chép (AI): ", "Transcript (AI): ")), an.transcript) : null,
      an ? turnFeedback(an) : null));
  });
  return list;
}

function turnFeedback(an) {
  const parts = [];
  const notes = [["Fluency", an.fluency], ["Lexical", an.lexical], ["Grammar", an.grammar], ["Pronunciation", an.pronunciation]].filter(([, v]) => v);
  if (an.relevance) parts.push(el("div", { class: "tiny muted" }, an.relevance));
  if (notes.length) parts.push(el("div", { class: "sp-notes-grid" }, notes.map(([k, v]) => el("div", {}, el("span", { class: "tiny strong" }, k), el("div", { class: "small" }, v)))));
  if (an.mistakes?.length) {
    parts.push(el("div", { class: "sp-mistakes" }, an.mistakes.map((m) =>
      el("div", { class: "sp-mistake" },
        el("span", { class: `chip sp-${m.type}` }, m.type),
        el("span", { class: "sp-wrong" }, m.quote), icon("arrow"), el("span", { class: "sp-right" }, m.correction),
        m.explanation ? el("div", { class: "tiny muted", style: "width:100%" }, m.explanation) : null))));
  }
  if (an.upgrades?.length) {
    parts.push(el("div", { class: "row wrap", style: "gap:6px" }, el("span", { class: "tiny strong" }, L("Từ vựng nâng cấp:", "Vocabulary upgrades:")),
      an.upgrades.map((u) => el("span", { class: "chip" }, `${u.original} → ${u.better}`))));
  }
  return el("details", { class: "sp-feedback" }, el("summary", {}, L("Nhận xét & sửa lỗi câu này", "Feedback & corrections for this answer")), ...parts);
}

/* ======================= Báo cáo AI 4 tiêu chí ======================= */
export function aiReport(an, { forTeacher }) {
  const box = el("div", { class: "card ai-report" });
  box.append(el("div", { class: "row wrap", style: "gap:16px;align-items:center" },
    el("div", { class: "band-ring", style: `--pct:${((an.overall || 0) / 9) * 100}%` }, el("div", { class: "val" }, an.overall != null ? an.overall.toFixed(1) : "—")),
    el("div", { style: "flex:1;min-width:220px" },
      el("div", { class: "eyebrow" }, L("Ước lượng của AI", "AI estimate")),
      el("h2", { class: "mb-0" }, L("Phân tích 4 tiêu chí", "Four-criteria analysis")),
      el("div", { class: "row wrap tiny muted", style: "gap:10px;margin-top:6px" },
        el("span", {}, L(`${an.stats?.words ?? 0} từ`, `${an.stats?.words ?? 0} words`)),
        el("span", {}, `${an.stats?.wpm ?? 0} ${L("từ/phút", "words/min")}`),
        el("span", {}, L(`${an.stats?.fillers ?? 0} từ đệm (um, uh…)`, `${an.stats?.fillers ?? 0} fillers (um, uh…)`)),
        el("span", {}, `${L("Thời gian nói", "Speaking time")} ${fmtClock(an.stats?.seconds || 0)}`)))));

  box.append(el("div", { class: "crit-grid" }, CRITERIA.map((c) => {
    const cr = an.criteria?.[c.key] || {};
    return el("div", { class: "crit" },
      el("div", { class: "row", style: "justify-content:space-between" }, el("span", { class: "strong small" }, c.name), el("span", { class: "crit-band" }, cr.band != null ? Number(cr.band).toFixed(1) : "—")),
      el("div", { class: "crit-bar" }, el("span", { style: `width:${((cr.band || 0) / 9) * 100}%` })),
      el("div", { class: "small" }, cr.summary || ""),
      cr.evidence?.length ? el("ul", { class: "crit-evidence tiny muted" }, cr.evidence.slice(0, 3).map((e) => el("li", {}, e))) : null);
  })));

  const list = (title, arr, cls) => arr?.length ? el("div", { class: `ai-list ${cls}` }, el("strong", {}, title), el("ul", {}, arr.map((x) => el("li", {}, x)))) : null;
  box.append(el("div", { class: "grid grid-2" },
    list(L("Điểm mạnh", "Strengths"), an.strengths, "good"),
    list(L("Cần ưu tiên cải thiện", "Work on next"), an.priorities, "next")));
  if (forTeacher && an.teacherNote) box.append(el("div", { class: "notice notice-info small" }, el("strong", {}, L("Ghi chú cho giáo viên: ", "Note for the teacher: ")), an.teacherNote));
  box.append(el("div", { class: "tiny muted" },
    (an.demo ? L("Chế độ thử — báo cáo mẫu. ", "Demo mode — sample report. ") : "") +
    L(`Do ${an.model} tạo lúc ${fmtDateTime(an.createdAt)}. Đây là ước lượng; giáo viên chốt band cuối cùng. Pronunciation được đánh giá từ bản ghi âm nhưng có thể lệch do micro và tiếng ồn.`,
      `Generated by ${an.model} on ${fmtDateTime(an.createdAt)}. This is an estimate; the teacher sets the final band. Pronunciation is judged from the recording and can be affected by microphone quality and background noise.`)));
  return box;
}
