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
