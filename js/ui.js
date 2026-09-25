// Tiện ích dựng giao diện dùng chung
import { L, isVi } from "./i18n.js";
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ---------- Toast ---------- */
export function toast(msg, kind = "", ms = 3200) {
  let host = $("#toasts");
  if (!host) {
    host = el("div", { id: "toasts" });
    document.body.append(host);
  }
  const t = el("div", { class: `toast ${kind}` }, msg);
  host.append(t);
  setTimeout(() => {
    t.style.transition = "opacity .25s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 260);
  }, ms);
}

/* ---------- Modal xác nhận ---------- */
export function confirmDialog({ title, body, okText = L("Đồng ý", "OK"), cancelText = L("Huỷ", "Cancel"), danger = false }) {
  return new Promise((resolve) => {
    const back = el("div", { class: "modal-back" });
    const close = (v) => { back.remove(); resolve(v); };
    const modal = el(
      "div", { class: "modal" },
      el("h3", {}, title),
      el("div", { class: "muted", html: body || "" }),
      el(
        "div", { class: "modal-actions" },
        el("button", { class: "btn", onclick: () => close(false) }, cancelText),
        el("button", { class: `btn ${danger ? "btn-danger" : "btn-primary"}`, onclick: () => close(true) }, okText)
      )
    );
    back.append(modal);
    back.addEventListener("click", (e) => { if (e.target === back) close(false); });
    document.body.append(back);
  });
}

/* ---------- Thời gian ---------- */
export function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function fmtDateTime(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString(isVi() ? "vi-VN" : "en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return L(`${h} giờ ${m} phút`, `${h} h ${m} min`);
  if (m) return L(`${m} phút ${sec} giây`, `${m} min ${sec} s`);
  return L(`${sec} giây`, `${sec} s`);
}

/**
 * Đồng hồ đếm ngược. Tự chuyển màu cảnh báo và gọi onEnd khi hết giờ.
 */
export class Countdown {
  constructor({ seconds, label = L("Còn lại", "Time left"), onEnd, onTick }) {
    this.total = seconds;
    this.remaining = seconds;
    this.onEnd = onEnd;
    this.onTick = onTick;
    this.stopped = false;
    this.node = el(
      "div", { class: "timer" },
      el("span", { class: "lbl" }, label),
      (this.valueNode = el("span", {}, fmtClock(seconds)))
    );
  }
  start() {
    this.startedAt = Date.now();
    this.tick();
    this.iv = setInterval(() => this.tick(), 250);
    return this;
  }
  tick() {
    if (this.stopped) return;
    const elapsed = (Date.now() - this.startedAt) / 1000;
    this.remaining = Math.max(0, this.total - elapsed);
    this.valueNode.textContent = fmtClock(this.remaining);
    this.node.classList.toggle("warn", this.remaining <= 300 && this.remaining > 60);
    this.node.classList.toggle("danger", this.remaining <= 60);
    this.onTick?.(this.remaining);
    if (this.remaining <= 0) {
      this.stop();
      this.onEnd?.();
    }
  }
  stop() {
    this.stopped = true;
    clearInterval(this.iv);
    return this;
  }
  get elapsedSeconds() {
    return Math.round(this.total - this.remaining);
  }
}

/* ---------- Chặn rời trang khi đang thi ---------- */
let guardOn = false;
const guardHandler = (e) => { e.preventDefault(); e.returnValue = ""; };
export function setExamGuard(on) {
  if (on === guardOn) return;
  guardOn = on;
  if (on) window.addEventListener("beforeunload", guardHandler);
  else window.removeEventListener("beforeunload", guardHandler);
}

/* ---------- Lưu nháp cục bộ (chống mất bài khi F5) ---------- */
export const draft = {
  key: (uid, skill) => `ielts:draft:${uid || "anon"}:${skill}`,
  save(uid, skill, data) {
    try { localStorage.setItem(this.key(uid, skill), JSON.stringify({ at: Date.now(), data })); }
    catch { /* hết dung lượng thì bỏ qua */ }
  },
  load(uid, skill) {
    try {
      const raw = localStorage.getItem(this.key(uid, skill));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  clear(uid, skill) {
    try { localStorage.removeItem(this.key(uid, skill)); } catch { /* noop */ }
  },
};

/* ---------- Biểu đồ cột SVG cho Writing Task 1 ---------- */
export function barChartSVG(chart) {
  const W = 640, H = 340, padL = 46, padR = 16, padT = 22, padB = 62;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const groups = chart.data.length;
  const seriesN = chart.series.length;
  const gw = plotW / groups;
  const bw = Math.min(30, (gw - 18) / seriesN);
  const y = (v) => padT + plotH - (v / 100) * plotH;

  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${escapeHtml(chart.caption)}" style="max-width:660px">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff" rx="10"/>`;
  for (let v = 0; v <= 100; v += 20) {
    s += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" stroke="#ebe8dc"/>`;
    s += `<text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8d9280">${v}</text>`;
  }
  chart.data.forEach((row, gi) => {
    const gx = padL + gi * gw;
    row.values.forEach((v, si) => {
      const x = gx + gw / 2 - (seriesN * bw) / 2 + si * bw;
      s += `<rect x="${x}" y="${y(v)}" width="${bw - 3}" height="${padT + plotH - y(v)}" fill="${chart.colors[si]}" rx="3"/>`;
      s += `<text x="${x + (bw - 3) / 2}" y="${y(v) - 5}" text-anchor="middle" font-size="10" fill="#555b48">${v}</text>`;
    });
    s += `<text x="${gx + gw / 2}" y="${H - padB + 20}" text-anchor="middle" font-size="12" fill="#1d2014" font-weight="600">${escapeHtml(row.label)}</text>`;
  });
  chart.series.forEach((name, i) => {
    const lx = padL + i * 90;
    const ly = H - 16;
    s += `<rect x="${lx}" y="${ly - 9}" width="11" height="11" rx="2" fill="${chart.colors[i]}"/>`;
    s += `<text x="${lx + 17}" y="${ly}" font-size="12" fill="#555b48">${escapeHtml(name)}</text>`;
  });
  s += `</svg>`;
  return s;
}

/* ---------- Icon nét (stroke) ---------- */
const ICON_PATHS = {
  listening: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  reading:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  writing:   '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  speaking:  '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  home:      '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  history:   '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  chart:     '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  logout:    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  arrow:     '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  back:      '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  shield:    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  file:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
  target:    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  cap:       '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  clock:     '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  leaf:      '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  chip:      '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
  heart:     '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  star:      '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  volume:    '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  game:      '<path d="M6 12h4M8 10v4"/><path d="M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="4"/>',
  flame:     '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  trophy:    '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  cards:     '<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  bookmark:  '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  paw:       '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  bolt:      '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  grid:      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  rain:      '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>',
  keyboard:  '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
  puzzle:    '<path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/>',
  check:     '<path d="M20 6 9 17l-5-5"/>',
  x:         '<path d="M18 6 6 18M6 6l12 12"/>',
  refresh:   '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  exam:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  quote:     '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  laugh:     '<circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z"/><path d="M9 9h.01M15 9h.01"/>',
  search:    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  globe:     '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  eye:       '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  download:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  link:      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  mic:       '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  homework:  '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  user:      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:     '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
};

export function icon(name, extraClass = "") {
  const span = document.createElement("span");
  span.className = `i ${extraClass}`.trim();
  span.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
  return span;
}

/* ---------- Phát âm tiếng Anh bằng giọng đọc của trình duyệt ---------- */
export function speakText(text, { rate = 0.9 } = {}) {
  if (!("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voices = synth.getVoices();
  const voice = voices.find((v) => /en-GB/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang || "en-GB";
  u.rate = rate;
  synth.speak(u);
  return true;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
