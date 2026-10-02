// TẢI BẢN GHI SPEAKING DẠNG MP3 (từng câu hoặc gộp tất cả thành một file)
//  Bản ghi lưu trên Storage ở dạng trình duyệt ghi được (webm/opus, m4a). Khi bấm tải: tải file về, giải mã bằng
//  Web Audio, mã hoá MP3 ngay trên máy (thư viện lamejs, js/vendor/lame.min.js — LGPL) rồi lưu.
//  Gộp: các câu nối theo thứ tự, mỗi câu cách nhau GAP giây im lặng.
//  Không chuyển được (mạng chặn CORS, trình duyệt không giải mã được) -> tải file gốc.
import { el, icon, toast } from "./ui.js";
import { L } from "./i18n.js";

const RATE = 22050;     // giọng nói: 22 kHz mono là đủ rõ, file nhỏ
const KBPS = 64;
const GAP = 1.5;        // giây im lặng giữa hai câu khi gộp

let lamePromise = null;
function loadLame() {
  if (window.lamejs?.Mp3Encoder) return Promise.resolve(window.lamejs);
  lamePromise ||= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = new URL("./vendor/lame.min.js", import.meta.url).href;
    s.onload = () => (window.lamejs?.Mp3Encoder ? res(window.lamejs) : rej(new Error("lamejs")));
    s.onerror = () => { lamePromise = null; rej(new Error(L("không tải được bộ mã hoá MP3", "couldn't load the MP3 encoder"))); };
    document.head.append(s);
  });
  return lamePromise;
}

/** url hoặc Blob -> Float32Array mono ở RATE Hz */
async function decodeMono(src) {
  const buf = src instanceof Blob ? await src.arrayBuffer() : await fetch(src).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.arrayBuffer();
  });
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  let audio;
  try { audio = await new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej)); }
  finally { ctx.close?.(); }
  // trộn về mono + đổi tần số mẫu bằng OfflineAudioContext
  const len = Math.max(1, Math.ceil(audio.duration * RATE));
  const off = new OfflineAudioContext(1, len, RATE);
  const node = off.createBufferSource();
  node.buffer = audio;
  node.connect(off.destination);
  node.start();
  return (await off.startRendering()).getChannelData(0);
}

/** Float32 [-1,1] -> Blob MP3; onProgress(0..1) */
async function encodeMp3(samples, onProgress) {
  const lame = await loadLame();
  const enc = new lame.Mp3Encoder(1, RATE, KBPS);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  const parts = [];
  const STEP = 1152 * 40;
  for (let i = 0; i < pcm.length; i += STEP) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + STEP));
    if (out.length) parts.push(new Uint8Array(out));
    onProgress?.(Math.min(1, (i + STEP) / pcm.length));
    if ((i / STEP) % 8 === 7) await new Promise((r) => setTimeout(r));   // nhường giao diện, không treo trang
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  return new Blob(parts, { type: "audio/mpeg" });
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename, style: "display:none" });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** Một bản ghi -> MP3 */
export async function toMp3(src, onProgress) {
  const pcm = await decodeMono(src);
  return encodeMp3(pcm, onProgress);
}

/** Nhiều bản ghi -> một MP3, theo đúng thứ tự, cách nhau GAP giây */
export async function mergeToMp3(srcs, onProgress) {
  const pcms = [];
  for (let i = 0; i < srcs.length; i++) {
    pcms.push(await decodeMono(srcs[i]));
    onProgress?.(((i + 1) / srcs.length) * 0.5);
  }
  const gap = Math.round(GAP * RATE);
  const all = new Float32Array(pcms.reduce((n, p) => n + p.length, 0) + gap * Math.max(0, pcms.length - 1));
  let at = 0;
  pcms.forEach((p, i) => { all.set(p, at); at += p.length + (i < pcms.length - 1 ? gap : 0); });
  return encodeMp3(all, (f) => onProgress?.(0.5 + f * 0.5));
}

/** File gốc khi không chuyển được sang MP3 */
async function saveOriginal(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    saveBlob(await res.blob(), filename);
  } catch {
    window.open(url, "_blank", "noopener");   // mở ở tab mới (bấm ⋮ → Tải xuống)
  }
}

/**
 * Nút tải MP3 cho một bản ghi. item: { url, name (không đuôi), origExt }
 */
export function mp3Button(item, label = L("Tải MP3", "Download MP3")) {
  const b = el("button", { type: "button", class: "btn btn-sm", title: `${item.name}.mp3` }, icon("download"), label);
  b.onclick = async () => {
    b.disabled = true;
    const keep = [...b.childNodes];
    try {
      const blob = await toMp3(item.url, (f) => { b.replaceChildren(L(`Đang chuyển MP3… ${Math.round(f * 100)}%`, `Converting… ${Math.round(f * 100)}%`)); });
      saveBlob(blob, `${item.name}.mp3`);
    } catch (err) {
      console.warn("mp3", err);
      toast(L("Không chuyển được sang MP3 — tải file gốc.", "Couldn't convert to MP3 — downloading the original file."), "err", 5000);
      await saveOriginal(item.url, `${item.name}.${item.origExt || "webm"}`);
    } finally { b.replaceChildren(...keep); b.disabled = false; }
  };
  return b;
}

/**
 * Hàng nút tải cho cả bài nói: "Tải gộp 1 file MP3" + "Tải từng câu (MP3)".
 * items: [{ url, name, origExt }] theo thứ tự câu · mergedName: tên file gộp (không đuôi)
 */
export function mp3Downloads(items, mergedName) {
  if (!items.length) return null;
  const status = el("span", { class: "tiny muted" });
  const merge = el("button", { type: "button", class: "btn btn-sm btn-primary" }, icon("download"),
    L(`Tải gộp 1 file MP3 (${items.length} câu)`, `Download as one MP3 (${items.length} answers)`));
  merge.onclick = async () => {
    merge.disabled = true;
    try {
      const blob = await mergeToMp3(items.map((x) => x.url), (f) => { status.textContent = L(`Đang gộp… ${Math.round(f * 100)}%`, `Merging… ${Math.round(f * 100)}%`); });
      saveBlob(blob, `${mergedName}.mp3`);
      status.textContent = "";
    } catch (err) {
      console.warn("merge", err);
      status.textContent = "";
      toast(L("Không gộp được file (mạng hoặc trình duyệt chặn) — hãy tải từng câu.", "Couldn't merge the files — download them one by one."), "err", 6000);
    } finally { merge.disabled = false; }
  };
  const each = items.length > 1 ? el("button", { type: "button", class: "btn btn-sm" }, icon("download"),
    L(`Tải từng câu (${items.length} file MP3)`, `Download each (${items.length} MP3s)`)) : null;
  if (each) each.onclick = async () => {
    each.disabled = true;
    try {
      for (const [i, x] of items.entries()) {
        status.textContent = L(`Đang chuyển câu ${i + 1}/${items.length}…`, `Converting ${i + 1}/${items.length}…`);
        try { saveBlob(await toMp3(x.url), `${x.name}.mp3`); }
        catch (err) { console.warn(err); await saveOriginal(x.url, `${x.name}.${x.origExt || "webm"}`); }
        await new Promise((r) => setTimeout(r, 400));   // trình duyệt có thể hỏi "cho phép tải nhiều file"
      }
    } finally { status.textContent = ""; each.disabled = false; }
  };
  return el("div", { class: "row wrap", style: "gap:10px;justify-content:flex-end;align-items:center" },
    status, each ? el("span", { class: "tiny muted" }, L("Tải nhiều file: trình duyệt có thể hỏi — chọn Cho phép.", "Several files: your browser may ask — choose Allow.")) : null,
    each, merge);
}
