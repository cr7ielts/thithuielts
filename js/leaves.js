// Lá rơi nhẹ ở nền cho giao diện Vintage Green (css/vintage.css). Tắt khi máy bật "giảm chuyển động".
(function () {
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) {}
  const colors = ["#6b7a2a", "#4f6b34", "#8a8a3a", "#a3ad5c", "#b08a3a", "#8c5a2c"];
  const leafSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3C9 3 4 9 4 15c0 1.6.4 3 1 4.2C8 14 12 11 16 9c-3 3-6 6-8 11 1 .6 2.3 1 3.8 1C19 21 21 12 20 3z"/></svg>';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const box = document.createElement("div");
  box.className = "leaf-fall";
  box.setAttribute("aria-hidden", "true");
  const n = window.innerWidth < 760 ? 7 : 13;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "leaf";
    s.style.cssText = `--x:${rnd(0, 100).toFixed(1)}%;--s:${rnd(14, 26).toFixed(0)}px;--c:${colors[i % colors.length]};` +
      `--d:${rnd(16, 28).toFixed(1)}s;--dl:${(-rnd(0, 28)).toFixed(1)}s;--sw:${rnd(2.5, 4.5).toFixed(1)}s;--dx:${rnd(-120, 120).toFixed(0)}px`;
    s.innerHTML = leafSvg;
    box.appendChild(s);
  }
  document.body.appendChild(box);
})();
