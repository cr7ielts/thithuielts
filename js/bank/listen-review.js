// XEM LẠI BÀI LISTENING: lời thoại (máy chép từ audio) + nghe lại đúng đoạn chứa đáp án từng câu.
//  Dữ liệu: js/data/explain-listening/<đề>.json (sinh bởi tools/gen_explain_listening.py)
//    { parts: { "1": { dur, lines: [[start, end, text], …] } },
//      q: { "7": { s: 1, t: [start, end], hit: [dòng, từ ký tự, đến ký tự], m: "exact|fuzzy|option|guess|manual", why } } }
//  Section lẻ dùng chung file của đề gốc (cùng audio, cùng số câu).
import { el, icon } from "../ui.js";
import { L } from "../i18n.js";
import { fileUrl } from "./bank.js";

let IDS = null;
export async function loadListenExplain(kind, item) {
  try {
    if (!IDS) IDS = (await import("../data/bank-explain-listening.js")).LISTEN_EXPLAIN;
    const testId = kind === "section" ? item.test : item.id;
    const have = IDS[testId] || [];
    const parts = kind === "section" ? have.filter((s) => s === item.section) : have;
    if (!parts.length) return null;
    const res = await fetch(new URL(`../data/explain-listening/${testId}.json`, import.meta.url));
    return res.ok ? { data: await res.json(), parts } : null;
  } catch (err) { console.warn("không tải được lời thoại", item.id, err); return null; }
}

const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** đoạn lời thoại có tô chữ: hits [{ a, b, n }] */
function lineNodes(text, hits) {
  const out = [];
  let i = 0;
  for (const h of hits) {
    if (h.a > i) out.push(document.createTextNode(text.slice(i, h.a)));
    out.push(el("mark", { class: "ev", dataset: { q: h.n } }, el("sup", { class: "ev-n" }, h.n), text.slice(h.a, h.b)));
    i = h.b;
  }
  if (i < text.length) out.push(document.createTextNode(text.slice(i)));
  return out;
}

/**
 * Bảng lời thoại + trình phát. onClip(n | null) báo câu đang được nghe lại để trang tô thẻ câu hỏi.
 * Trả về { paper, playClip(n), playQueue([n…]), locate(n), quote(n), info(n), stop() }
 */
export function listenPanel(kind, item, lexp, onClip = () => {}) {
  const { data, parts } = lexp;
  const Q = data.q || {};
  const paths = {};
  for (const f of item.files || []) {
    const m = f.type === "audio" && /(\d)$/.exec(f.label || "");
    if (m) paths[Number(m[1])] = f.path;
  }

  /* ----- trình phát: một thẻ audio, đổi nguồn theo section ----- */
  const audio = el("audio", { controls: "", preload: "none", class: "lr-audio" });
  const status = el("div", { class: "lr-status small" });
  let cur = null, stopAt = null, queue = [], playingN = null, seekingByCode = false;
  const urls = {};

  async function show(s) {
    if (cur === s) return;
    cur = s;
    tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.s) === s));
    body.replaceChildren(lines[s]);
    try {
      urls[s] ??= await fileUrl(paths[s]);
      audio.src = urls[s];
    } catch (err) {
      status.textContent = L("Không mở được audio: ", "Cannot open audio: ") + err.message;
    }
    paintStatus();
  }
  const ready = () => new Promise((res, rej) => {
    if (audio.readyState >= 1) return res();
    audio.addEventListener("loadedmetadata", res, { once: true });
    audio.addEventListener("error", () => rej(new Error(L("không tải được file audio", "audio failed to load"))), { once: true });
    audio.load();
  });
  function paintStatus() {
    status.replaceChildren(...[
      el("span", { class: "lr-sec" }, `Section ${cur}`),
      playingN ? el("span", { class: "chip chip-bad lr-now" }, icon("volume"), L(`Đang nghe lại câu ${playingN}`, `Replaying Q${playingN}`)) : null,
      queue.length ? el("span", { class: "tiny muted" }, L(`còn ${queue.length} câu`, `${queue.length} more`)) : null,
      playingN || queue.length ? el("button", { class: "btn btn-ghost btn-sm", onclick: () => stop() }, L("Dừng", "Stop")) : null].filter(Boolean));
  }

  async function seekPlay(s, a, b, n) {
    await show(s);
    await ready();
    seekingByCode = true;
    audio.currentTime = a;
    stopAt = b;
    playingN = n;
    onClip(n);
    paintStatus();
    await audio.play().catch(() => {});
  }
  function finishClip() {
    stopAt = null; playingN = null; onClip(null);
    if (queue.length) {
      const n = queue.shift();
      setTimeout(() => playClip(n, true), 700);
    }
    paintStatus();
  }
  function stop() {
    queue = []; stopAt = null; playingN = null; onClip(null);
    audio.pause();
    paintStatus();
  }
  audio.addEventListener("timeupdate", () => {
    const t = audio.currentTime;
    if (stopAt !== null && t >= stopAt) { audio.pause(); finishClip(); }
    // tô dòng đang phát
    const ls = data.parts[cur]?.lines || [];
    let i = ls.findIndex((x, k) => x[0] <= t && t < (ls[k + 1]?.[0] ?? Infinity));
    const on = body.querySelector(".tr-line.on");
    if (on && Number(on.dataset.i) !== i) on.classList.remove("on");
    const row = i >= 0 ? body.querySelector(`.tr-line[data-i="${i}"]`) : null;
    if (row && !row.classList.contains("on")) {
      row.classList.add("on");
      if (playingN) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
  // học sinh tự kéo thanh thời gian -> thôi dừng tự động
  audio.addEventListener("seeking", () => {
    if (seekingByCode) { seekingByCode = false; return; }
    if (stopAt !== null) { queue = []; stopAt = null; playingN = null; onClip(null); paintStatus(); }
  });

  function playClip(n, fromQueue = false) {
    const q = Q[n];
    if (!q) return;
    if (!fromQueue) queue = [];
    seekPlay(q.s, q.t[0], q.t[1], n).catch((err) => { status.textContent = err.message; });
  }
  function playQueue(ns) {
    queue = ns.filter((n) => Q[n]);
    if (queue.length) playClip(queue.shift(), true);
  }

  /* ----- lời thoại từng section, tô chỗ có đáp án ----- */
  const lines = {};
  for (const s of parts) {
    const hitsBy = {};
    for (const [n, q] of Object.entries(Q)) {
      if (q.s !== s || !q.hit) continue;
      const [li, a, b] = q.hit;
      (hitsBy[li] ||= []).push({ a, b, n: Number(n) });
    }
    lines[s] = el("div", { class: "tr-lines" }, (data.parts[s].lines || []).map(([st, , text], i) => {
      const hits = (hitsBy[i] || []).sort((x, y) => x.a - y.a)
        .filter((h, k, arr) => k === 0 || h.a >= arr[k - 1].b);          // bỏ chỗ chồng nhau
      return el("div", { class: "tr-line", dataset: { i }, onclick: () => { queue = []; seekPlay(s, st, null, null).catch(() => {}); } },
        el("span", { class: "tr-t" }, mmss(st)), el("span", { class: "tr-x" }, lineNodes(text, hits)));
    }));
  }
  const tabs = el("div", { class: "row wrap lr-tabs", style: "gap:6px" }, parts.length > 1
    ? parts.map((s) => el("button", { class: "chip-btn", dataset: { s }, onclick: () => show(s) }, `Section ${s}`)) : null);
  const body = el("div", { class: "lr-body" });
  const paper = el("div", { class: "cdi-paper rv-paper lr-paper" },
    el("div", { class: "lr-bar" },
      el("div", { class: "row", style: "justify-content:space-between;align-items:center;gap:8px" },
        el("h2", { style: "margin:0;font-size:1.15rem" }, L("Lời thoại", "Transcript")), tabs),
      audio, status),
    body,
    el("p", { class: "tiny muted lr-note" }, L("Lời thoại do máy chép từ audio nên có thể sai vài chữ. Bấm một dòng để nghe từ chỗ đó.",
      "Machine transcript — a few words may be wrong. Click a line to play from there.")));
  show(parts[0]);

  function locate(n) {
    const q = Q[n];
    if (!q) return;
    show(q.s).then(() => {
      body.querySelectorAll("mark.ev.flash, .tr-line.flash").forEach((x) => x.classList.remove("flash"));
      const m = body.querySelector(`mark.ev[data-q="${n}"]`);
      const ls = data.parts[q.s].lines;
      const li = m ? null : Math.max(0, ls.findIndex((x) => x[1] > q.t[0]));
      const target = m || body.querySelector(`.tr-line[data-i="${li}"]`);
      target?.classList.add("flash");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /** câu lời thoại chứa đáp án (có tô) để đặt ngay trong thẻ câu hỏi */
  function quote(n) {
    const q = Q[n];
    if (!q?.hit) return null;
    const [li, a, b] = q.hit;
    const line = data.parts[q.s]?.lines?.[li];
    if (!line) return null;
    const text = line[2];
    const whole = a === 0 && b === text.length;
    return el("blockquote", {}, el("span", { class: "tr-t" }, mmss(line[0])), " ",
      whole ? text : [text.slice(0, a), el("mark", { class: "ev" }, text.slice(a, b)), text.slice(b)]);
  }

  return { paper, playClip, playQueue, locate, quote, info: (n) => Q[n] || null, stop };
}

export { mmss };
