// Mã QR: tạo (qrcode-generator, MIT) và quét bằng camera (BarcodeDetector, không có thì jsQR – Apache-2.0).
// Hai thư viện nằm ở js/vendor và chỉ được nạp khi dùng.
import { el } from "../ui.js";
import { L } from "../i18n.js";

const loaded = {};
function loadScript(src) {
  if (!loaded[src]) {
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = new URL(src, import.meta.url).href;
      s.onload = resolve;
      s.onerror = () => { delete loaded[src]; reject(new Error("load " + src)); };
      document.head.append(s);
    });
  }
  return loaded[src];
}

/** Vẽ mã QR của `text` thành SVG (nền trắng, viền yên tĩnh 4 ô) */
export async function qrSvg(text, size = 220) {
  await loadScript("../vendor/qrcode.js");
  const qr = window.qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), pad = 4, total = n + pad * 2;
  let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + pad} ${r + pad}h1v1h-1z`;
  const wrap = el("div", { class: "qr-box", role: "img", "aria-label": L("Mã QR vào phòng", "QR code to join") });
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  return wrap;
}

/**
 * Quét mã bằng camera. Trả về { node, stop }: node là khung xem trước, onText(text) được gọi một lần khi đọc được.
 * Ném lỗi nếu không mở được camera.
 */
export async function startScanner(onText) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  const video = el("video", { class: "scan-video", playsinline: "", muted: "" });
  video.srcObject = stream;
  await video.play().catch(() => {});

  const detector = "BarcodeDetector" in window ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
  if (!detector) await loadScript("../vendor/jsqr.js");
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d", { willReadFrequently: true });

  let alive = true;
  const stop = () => { alive = false; stream.getTracks().forEach((t) => t.stop()); };
  const tick = async () => {
    if (!alive) return;
    if (video.videoWidth) {
      try {
        let text = "";
        if (detector) {
          const found = await detector.detect(video);
          text = found[0]?.rawValue || "";
        } else {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          g.drawImage(video, 0, 0);
          const img = g.getImageData(0, 0, canvas.width, canvas.height);
          text = window.jsQR(img.data, img.width, img.height)?.data || "";
        }
        if (text) { stop(); onText(text); return; }
      } catch { /* khung hình lỗi: thử lại */ }
    }
    setTimeout(tick, 200);
  };
  tick();
  return { node: video, stop };
}
