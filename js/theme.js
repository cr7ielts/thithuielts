// Giao diện sáng / tối. Mặc định theo máy; người dùng chọn tay thì nhớ trong trình duyệt.
// index.html áp lựa chọn đã lưu trước khi trang vẽ để không bị nháy.
const KEY = "ielts:theme";
const media = window.matchMedia?.("(prefers-color-scheme: dark)");

/** "light" | "dark" | "auto" */
export function getThemePref() {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : "auto"; } catch { return "auto"; }
}

/** giao diện đang hiển thị thật sự: "light" | "dark" */
export function currentTheme() {
  const p = getThemePref();
  return p === "auto" ? (media?.matches ? "dark" : "light") : p;
}

export function setThemePref(p) {
  try { p === "auto" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, p); } catch { /* chế độ riêng tư */ }
  if (p === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = p;
}

/** Bấm nút: đổi sang giao diện ngược với giao diện đang thấy */
export function toggleTheme() {
  setThemePref(currentTheme() === "dark" ? "light" : "dark");
}

// ---------- Bộ giao diện (skin) ----------
// Mỗi skin = danh sách file CSS bật thêm sau styles.css. Phải khớp với đoạn script trong index.html.
const SKIN_KEY = "ielts:skin";
export const SKINS = [
  { id: "vintage", vi: "Vintage Green", en: "Vintage Green", css: ["glass", "vintage"], sw: "linear-gradient(135deg,#f3e8c8,#6b7a2a 60%,#4f6b34)" },
  { id: "glass", vi: "Kính màu", en: "Liquid Glass", css: ["glass"], sw: "linear-gradient(135deg,#7c5cff,#ff5fa2,#22b8ff)" },
  { id: "ocean", vi: "Biển xanh", en: "Ocean", css: ["glass", "ocean"], sw: "linear-gradient(135deg,#e0f7fa,#0ea5b7 55%,#0b4f7a)" },
  { id: "sakura", vi: "Hoa anh đào", en: "Sakura", css: ["glass", "sakura"], sw: "linear-gradient(135deg,#fff0f5,#f472b6 55%,#a855f7)" },
  { id: "neon", vi: "Đêm neon", en: "Neon Night", css: ["glass", "neon"], sw: "linear-gradient(135deg,#0b0820,#22d3ee 50%,#e879f9)" },
  { id: "mochi", vi: "Mochi", en: "Mochi", css: ["mochi"], sw: "radial-gradient(circle at 35% 35%,#fff 0 8%,#f7b8c4 30%,#e98fa3 70%),#f6efe4" },
  { id: "mono", vi: "Tối giản", en: "Minimal", css: ["mono"], sw: "linear-gradient(135deg,#ffffff,#d4d4d4 50%,#111111)" },
  { id: "classic", vi: "Cổ điển", en: "Classic", css: [], sw: "linear-gradient(135deg,#f4f6fb,#1a2b5f 55%,#ff8a2a)" },
];
const ALL_CSS = ["glass", "vintage", "ocean", "sakura", "mono", "neon", "mochi"];

export function getSkin() {
  try { const k = localStorage.getItem(SKIN_KEY); return SKINS.some((s) => s.id === k) ? k : "vintage"; } catch { return "vintage"; }
}

export function setSkin(id) {
  const skin = SKINS.find((s) => s.id === id) || SKINS[0];
  try { localStorage.setItem(SKIN_KEY, skin.id); } catch { /* chế độ riêng tư */ }
  document.documentElement.dataset.skin = skin.id;
  for (const n of ALL_CSS) {
    const l = document.getElementById("skin-" + n);
    if (l) l.disabled = !skin.css.includes(n);
  }
}
