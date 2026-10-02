// GIÁM SÁT KHI LÀM HOMEWORK / THI THỬ (không dùng cho luyện tự do)
//  Ghi nhận — không khoá máy được: rời màn hình (chuyển tab, thu nhỏ, bấm sang cửa sổ khác), thoát toàn màn hình,
//  dán chữ vào bài viết, chữ xuất hiện đột ngột, tải lại trang. Kết quả lưu kèm bài nộp (trường "integrity"),
//  giáo viên xem ở trang chấm. Số liệu giữ qua lần tải lại trang (localStorage theo "key").
//
//  const p = startProctor({ key: "hw-abc", label: "Homework" });   // gọi ngay trong cú bấm "Bắt đầu" (để vào toàn màn hình)
//  p.badge            — chip "Đang giám sát · rời 2 lần" đặt lên thanh làm bài
//  p.guardText(el)    — chặn dán / kéo thả chữ vào ô viết bài
//  p.allowBlur()      — sắp mở hộp chọn file / xin quyền micro: lần rời cửa sổ kế tiếp không tính
//  p.report()         — { leaves, awaySec, fsExits, pasteBlocked, bigInserts, resumes, fs, events }
//  p.stop()           — gỡ theo dõi, thoát toàn màn hình, xoá dữ liệu tạm
import { el, icon, toast } from "./ui.js";
import { L } from "./i18n.js";

const STORE = (key) => `ielts:proctor:${key}`;
const MAX_EVENTS = 40;
const MIN_AWAY = 1.5;    // giây — ngắn hơn thì không tính (thông báo bật lên rồi tắt ngay)

let active = null;
/** Đổi trang khi đang làm bài (bấm menu…): gỡ giám sát nhưng giữ số liệu để lần làm tiếp vẫn cộng dồn */
export function stopActiveProctor() { active?.stop(true); }

export function startProctor({ key, fullscreen = true } = {}) {
  active?.stop(true);
  const t0 = Date.now();
  let st = null;
  try { st = JSON.parse(localStorage.getItem(STORE(key)) || "null"); } catch { /* riêng tư */ }
  if (st && t0 - st.firstAt > 12 * 3600e3) st = null;   // số liệu bỏ dở từ hôm trước: bắt đầu lại
  const fresh = !st;
  st ||= { leaves: 0, awaySec: 0, fsExits: 0, pasteBlocked: 0, bigInserts: 0, resumes: 0, events: [], firstAt: t0 };
  if (!fresh) { st.resumes++; log("resume"); }
  const fsSupported = !!(document.documentElement.requestFullscreen && document.fullscreenEnabled);
  st.fs = fullscreen && fsSupported;

  const save = () => { try { localStorage.setItem(STORE(key), JSON.stringify(st)); } catch { /* đầy */ } };
  function log(type, extra = {}) {
    st.events.push({ type, at: Math.round((Date.now() - st.firstAt) / 1000), ...extra });
    if (st.events.length > MAX_EVENTS) st.events.splice(0, st.events.length - MAX_EVENTS);
  }

  /* ----- chip trạng thái ----- */
  const badge = el("span", { class: "chip proctor-chip", title: L("Hệ thống ghi lại khi bạn rời màn hình làm bài hoặc dán chữ. Giáo viên xem được.",
    "Leaving this screen or pasting text is recorded and shown to your teacher.") });
  const paint = () => {
    badge.replaceChildren(icon("eye"), st.leaves || st.fsExits
      ? L(`Đang giám sát · rời ${st.leaves + st.fsExits} lần`, `Monitored · left ${st.leaves + st.fsExits}×`)
      : L("Đang giám sát", "Monitored"));
    badge.classList.toggle("chip-bad", st.leaves + st.fsExits >= 3);
    badge.classList.toggle("chip-warn", st.leaves + st.fsExits > 0 && st.leaves + st.fsExits < 3);
  };

  /* ----- rời màn hình: tab ẩn hoặc cửa sổ mất focus ----- */
  let awayFrom = null, skipBlurUntil = 0;
  const goAway = (why) => {
    if (awayFrom !== null) return;
    if (why === "blur" && Date.now() < skipBlurUntil) return;
    awayFrom = Date.now();
  };
  const comeBack = () => {
    if (awayFrom === null || document.hidden || !document.hasFocus()) return;
    const sec = (Date.now() - awayFrom) / 1000;
    awayFrom = null;
    if (sec < MIN_AWAY) return;
    st.leaves++;
    st.awaySec = Math.round(st.awaySec + sec);
    log("leave", { sec: Math.round(sec) });
    save(); paint();
    toast(L(`Bạn vừa rời màn hình làm bài ${Math.round(sec)} giây (lần ${st.leaves}) — đã ghi lại, giáo viên sẽ thấy.`,
      `You left the test screen for ${Math.round(sec)}s (time ${st.leaves}) — this is recorded and your teacher will see it.`), "err", 5000);
  };
  const onVis = () => (document.hidden ? goAway("hidden") : comeBack());
  const onBlur = () => goAway("blur");
  const onFocus = () => comeBack();
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);

  /* ----- toàn màn hình ----- */
  const fsBar = el("div", { class: "proctor-fs hidden", role: "alert" },
    icon("eye"), el("span", { style: "flex:1" }, L("Bạn đã thoát chế độ toàn màn hình — đã ghi lại.", "You left full screen — this has been recorded.")),
    el("button", { class: "btn btn-sm btn-primary", onclick: () => enterFs() }, L("Vào lại toàn màn hình", "Back to full screen")));
  let stopped = false;
  const enterFs = () => {
    if (!st.fs) return;
    document.documentElement.requestFullscreen?.().then(() => fsBar.classList.add("hidden")).catch(() => {});
  };
  const onFsChange = () => {
    if (stopped || !st.fs) return;
    if (!document.fullscreenElement) {
      // chuyển tab khi đang toàn màn hình thì trình duyệt tự thoát -> đã tính là "rời màn hình", không đếm hai lần
      if (!document.hidden && awayFrom === null) {
        st.fsExits++;
        log("fs-exit");
        save(); paint();
      }
      fsBar.classList.remove("hidden");
    } else fsBar.classList.add("hidden");
  };
  if (st.fs) {
    document.addEventListener("fullscreenchange", onFsChange);
    document.body.append(fsBar);
    enterFs();
    // mở lại trang (tải lại) thì không tự vào toàn màn hình được (cần cú bấm) -> hiện thanh nhắc
    if (!fresh) fsBar.classList.remove("hidden");
  }

  /* ----- dán chữ / chữ xuất hiện đột ngột ----- */
  const guarded = [];
  function guardText(node) {
    const block = (e) => {
      e.preventDefault();
      st.pasteBlocked++;
      log(e.type === "drop" ? "drop" : "paste");
      save(); paint();
      toast(L("Không dán chữ vào bài viết được — hãy tự gõ. Lần dán đã được ghi lại.",
        "Pasting into your answer is blocked — please type it yourself. The attempt has been recorded."), "err", 4500);
    };
    let last = node.value?.length || 0;
    const onInput = (e) => {
      const len = node.value.length;
      // tự gõ thì mỗi lần thêm vài ký tự; tăng vọt > 40 ký tự mà không phải gõ = dán qua tiện ích, tự điền…
      if (len - last > 40 && e.inputType !== "insertText" && e.inputType !== "insertLineBreak") {
        st.bigInserts++;
        log("insert", { chars: len - last });
        save();
      }
      last = len;
    };
    node.addEventListener("paste", block);
    node.addEventListener("drop", block);
    node.addEventListener("input", onInput);
    guarded.push(() => { node.removeEventListener("paste", block); node.removeEventListener("drop", block); node.removeEventListener("input", onInput); });
  }

  save(); paint();

  const api = {
    badge,
    guardText,
    allowBlur(ms = 60000) { skipBlurUntil = Date.now() + ms; },
    report() {
      return { leaves: st.leaves, awaySec: st.awaySec, fsExits: st.fsExits, pasteBlocked: st.pasteBlocked,
        bigInserts: st.bigInserts, resumes: st.resumes, fs: st.fs, events: st.events.slice(),
        startedAt: new Date(st.firstAt).toISOString(), elapsedSec: Math.round((Date.now() - st.firstAt) / 1000) };
    },
    /** keep=true: giữ số liệu tạm (nộp lỗi, làm tiếp) */
    stop(keep = false) {
      stopped = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFsChange);
      guarded.forEach((f) => f());
      fsBar.remove();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      if (!keep) try { localStorage.removeItem(STORE(key)); } catch { /* riêng tư */ }
      if (active === api) active = null;
    },
  };
  active = api;
  return api;
}

/* ======================= Audio nghe một lần (Listening homework / thi thử) ======================= */
/**
 * Như thi thật: bấm Phát một lần, không tạm dừng, không tua. Tải lại trang thì phát tiếp từ chỗ đang nghe,
 * không nghe lại từ đầu được. key: khoá lưu vị trí (theo học sinh + bài).
 */
export function onceAudio({ src, label = "Audio", key }) {
  const SK = `ielts:once:${key}`;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SK) || "null"); } catch { /* riêng tư */ }
  const audio = el("audio", { preload: "none", src });
  const fill = el("span", { style: "width:0%" });
  const time = el("span", { class: "tiny muted once-time" }, "");
  const btn = el("button", { class: "btn btn-primary btn-sm" });
  const vol = el("input", { type: "range", min: "0", max: "1", step: "0.05", value: "1", class: "once-vol", "aria-label": L("Âm lượng", "Volume"),
    oninput: () => { audio.volume = Number(vol.value); } });
  const box = el("div", { class: "once-audio" },
    el("span", { class: "tiny strong" }, label), btn, el("div", { class: "progress once-bar" }, fill), time, icon("volume"), vol, audio);
  let started = false, lastPos = saved?.pos || 0, ourSeek = false;
  const fmt = (x) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
  const store = (done = false) => { try { localStorage.setItem(SK, JSON.stringify({ pos: lastPos, done })); } catch { /* đầy */ } };
  const setBtn = () => {
    if (saved?.done) { btn.disabled = true; btn.replaceChildren(icon("check"), L("Đã nghe xong", "Finished")); return; }
    btn.disabled = started;
    btn.replaceChildren(icon("play"), started ? L("Đang phát…", "Playing…")
      : lastPos > 1 ? L(`Phát tiếp từ ${fmt(lastPos)}`, `Resume at ${fmt(lastPos)}`) : L("Phát (1 lần)", "Play (once)"));
  };
  btn.onclick = async () => {
    if (started || saved?.done) return;
    started = true; setBtn();
    try {
      if (audio.readyState < 1) await new Promise((res, rej) => {
        audio.addEventListener("loadedmetadata", res, { once: true });
        audio.addEventListener("error", () => rej(new Error("audio")), { once: true });
        audio.load();
      });
      if (lastPos > 1) { ourSeek = true; audio.currentTime = lastPos; }
      await audio.play();
    } catch {
      started = false; setBtn();
      toast(L("Không phát được audio — kiểm tra mạng rồi bấm lại.", "Couldn't play the audio — check your connection and try again."), "err");
    }
  };
  audio.addEventListener("timeupdate", () => {
    const t = audio.currentTime;
    if (Math.abs(t - lastPos) > 3 && !ourSeek) { ourSeek = true; audio.currentTime = lastPos; return; }   // tua bằng phím media: trả về
    ourSeek = false;
    if (t > lastPos) lastPos = t;
    fill.style.width = `${audio.duration ? (t / audio.duration) * 100 : 0}%`;
    time.textContent = `${fmt(t)} / ${audio.duration ? fmt(audio.duration) : "--:--"}`;
    if (Math.floor(t) % 2 === 0) store();
  });
  // tạm dừng bằng phím media / tai nghe: phát tiếp (thi thật không dừng được)
  audio.addEventListener("pause", () => { if (started && !audio.ended) audio.play().catch(() => {}); });
  audio.addEventListener("ended", () => { saved = { done: true }; store(true); started = false; setBtn(); fill.style.width = "100%"; });
  setBtn();
  if (saved?.done) fill.style.width = "100%";
  return box;
}

/** Nộp bài xong: xoá trạng thái "đã nghe" để lần làm sau nghe lại được */
export function clearOnce(prefix) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(`ielts:once:${prefix}`)) localStorage.removeItem(k);
  } catch { /* riêng tư */ }
}

/* ======================= Cờ cho giáo viên ======================= */
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/**
 * Danh sách cờ từ một bài nộp: [{ level: "bad"|"warn", text }]
 * opt: { expectedSec, raw, total, words } — để nhận ra làm nhanh / viết nhanh bất thường
 */
export function integrityFlags(sub, opt = {}) {
  const f = [];
  const g = sub?.integrity;
  if (g) {
    const left = (g.leaves || 0) + (g.fsExits || 0);
    if (g.leaves) f.push({ level: g.leaves >= 3 || g.awaySec >= 60 ? "bad" : "warn",
      text: L(`Rời màn hình ${g.leaves} lần · ${mmss(g.awaySec || 0)}`, `Left screen ${g.leaves}× · ${mmss(g.awaySec || 0)}`) });
    if (g.fsExits) f.push({ level: left >= 3 ? "bad" : "warn", text: L(`Thoát toàn màn hình ${g.fsExits} lần`, `Left full screen ${g.fsExits}×`) });
    if (g.pasteBlocked) f.push({ level: "bad", text: L(`Cố dán chữ ${g.pasteBlocked} lần`, `Tried to paste ${g.pasteBlocked}×`) });
    if (g.bigInserts) f.push({ level: "bad", text: L(`Chữ xuất hiện đột ngột ${g.bigInserts} lần`, `Text appeared suddenly ${g.bigInserts}×`) });
    if (g.resumes) f.push({ level: "warn", text: L(`Tải lại / mở lại trang ${g.resumes} lần`, `Reloaded ${g.resumes}×`) });
  }
  const dur = sub?.durationSec;
  if (dur && opt.expectedSec && opt.total && opt.raw != null && opt.raw / opt.total >= 0.7 && dur < opt.expectedSec * 0.3) {
    f.push({ level: "bad", text: L(`Làm nhanh bất thường: ${mmss(dur)} mà đúng ${Math.round((opt.raw / opt.total) * 100)}%`,
      `Unusually fast: ${mmss(dur)} with ${Math.round((opt.raw / opt.total) * 100)}% correct`) });
  }
  if (dur && opt.words >= 120 && opt.words / (dur / 60) > 35) {
    f.push({ level: "bad", text: L(`Viết nhanh bất thường: ${opt.words} từ trong ${mmss(dur)}`, `Unusually fast writing: ${opt.words} words in ${mmss(dur)}`) });
  }
  return f;
}

export function flagChips(flags) {
  return flags.map((x) => el("span", { class: `chip ${x.level === "bad" ? "chip-bad" : "chip-warn"}` }, icon("eye"), x.text));
}
