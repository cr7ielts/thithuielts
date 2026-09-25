// =====================================================================
//  Ngôn ngữ giao diện: English (mặc định) / Tiếng Việt
//  Dùng: L("Nộp bài", "Submit")  → trả về chuỗi theo ngôn ngữ đang chọn.
//  Đổi ngôn ngữ sẽ tải lại trang, nên các hằng số tính lúc import vẫn đúng.
// =====================================================================
const KEY = "ielts:lang";

let lang = "en";
try { lang = localStorage.getItem(KEY) === "vi" ? "vi" : "en"; } catch { /* chặn bộ nhớ */ }
document.documentElement.lang = lang;

export const getLang = () => lang;
export const isVi = () => lang === "vi";

/** L(tiếng Việt, English) */
export const L = (vi, en) => (lang === "vi" ? vi : en);

export function setLang(next) {
  if (next === lang) return;
  try { localStorage.setItem(KEY, next); } catch { /* bỏ qua */ }
  location.reload();
}
