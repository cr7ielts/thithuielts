// Nền động: vài hình mờ trôi chậm phía sau nội dung (chữ A/B/C, sách, tai nghe, bút, dấu tick, dấu chân mèo…).
// Tự đứng yên khi người dùng bật "giảm chuyển động" và ẩn hẳn khi đang làm bài thi (body.exam-on, xem setExamGuard).
const S = (inner, vb = "0 0 24 24") =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const bubble = (ch) => S(`<path d="M5 4h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7l-5 4v-4H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"/>
  <text x="12" y="14.6" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" stroke="none" font-family="Lexend, sans-serif">${ch}</text>`);
const SHAPES = {
  a: bubble("A"), b: bubble("B"), c: bubble("C"),
  book: S('<path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v17H4.5A2.5 2.5 0 0 0 2 22.5Z"/><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13v17h6.5a2.5 2.5 0 0 1 2.5 2.5Z"/>'),
  head: S('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3ZM3 19a2 2 0 0 0 2 2h1v-6H3Z"/>'),
  pen: S('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>'),
  check: S('<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>'),
  star: S('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>'),
  paw: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="4.6" ry="3.8"/><circle cx="6" cy="10" r="2"/><circle cx="9.6" cy="6.2" r="2"/><circle cx="14.4" cy="6.2" r="2"/><circle cx="18" cy="10" r="2"/></svg>`,
  clock: S('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  aa: S('<text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" stroke="none" font-family="Lexend, sans-serif">Aa</text>'),
};
// [hình, trái %, trên %, cỡ px, màu, thời gian s, trễ s]
const ITEMS = [
  ["a", 6, 12, 54, "navy", 19, 0], ["book", 88, 8, 64, "copper", 23, -6], ["paw", 72, 38, 40, "fur", 17, -3],
  ["check", 14, 58, 46, "mint", 21, -9], ["b", 52, 84, 50, "copper", 25, -4], ["head", 93, 60, 58, "navy", 22, -12],
  ["star", 34, 22, 34, "copper", 16, -7], ["pen", 4, 88, 48, "navy", 24, -2], ["c", 78, 90, 44, "mint", 20, -11],
  ["aa", 44, 50, 52, "navy", 26, -14], ["clock", 62, 14, 40, "fur", 18, -5], ["paw", 24, 92, 34, "copper", 21, -8],
];

export function mountBackground() {
  if (document.querySelector(".bg-float")) return;
  const layer = document.createElement("div");
  layer.className = "bg-float";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = ITEMS.map(([k, x, y, size, color, dur, delay], i) =>
    `<span class="bg-item c-${color}" style="left:${x}%;top:${y}%;--s:${size}px;--d:${dur}s;--dl:${delay}s;--r:${i % 2 ? -1 : 1}">${SHAPES[k]}</span>`).join("");
  document.body.prepend(layer);
}
