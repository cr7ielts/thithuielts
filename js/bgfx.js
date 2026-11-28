// Hiệu ứng nền động cho từng bộ giao diện (css/bgfx.css). Mỗi skin một lớp riêng, CSS chỉ hiện lớp khớp html[data-skin].
// Vintage: lá rơi · Liquid Glass: bong bóng kính trôi · Ocean: bọt nước nổi lên · Sakura: cánh hoa rơi
// Neon: hạt sáng nhấp nháy + lưới chạy · Tối giản: chấm mảnh trôi chậm · Cổ điển: hình tròn mờ bay lơ lửng.
// Tắt khi máy bật "giảm chuyển động".
(function () {
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) {}
  const rnd = (a, b) => a + Math.random() * (b - a);
  const small = window.innerWidth < 760;
  const leaf = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3C9 3 4 9 4 15c0 1.6.4 3 1 4.2C8 14 12 11 16 9c-3 3-6 6-8 11 1 .6 2.3 1 3.8 1C19 21 21 12 20 3z"/></svg>';
  const petal = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c4 3 6 7 4 12-1 3-3 6-4 8-1-2-3-5-4-8C6 9 8 5 12 2z"/></svg>';

  function layer(skin, n, make) {
    const box = document.createElement("div");
    box.className = "bgfx bgfx-" + skin;
    box.setAttribute("aria-hidden", "true");
    for (let i = 0; i < n; i++) box.appendChild(make(i));
    document.body.appendChild(box);
  }
  function item(cls, vars, html) {
    const s = document.createElement("span");
    s.className = cls;
    s.style.cssText = Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(";");
    if (html) s.innerHTML = html;
    return s;
  }

  const leafC = ["#6b7a2a", "#4f6b34", "#8a8a3a", "#a3ad5c", "#b08a3a", "#8c5a2c"];
  layer("vintage", small ? 7 : 13, (i) => item("fx-fall", { x: rnd(0, 100).toFixed(1) + "%", s: rnd(14, 26).toFixed(0) + "px", c: leafC[i % 6],
    d: rnd(16, 28).toFixed(1) + "s", dl: (-rnd(0, 28)).toFixed(1) + "s", sw: rnd(2.5, 4.5).toFixed(1) + "s", dx: rnd(-120, 120).toFixed(0) + "px" }, leaf));

  const petalC = ["#f9a8d4", "#fbcfe8", "#f472b6", "#fda4af", "#e9d5ff"];
  layer("sakura", small ? 9 : 18, (i) => item("fx-fall fx-petal", { x: rnd(0, 100).toFixed(1) + "%", s: rnd(10, 18).toFixed(0) + "px", c: petalC[i % 5],
    d: rnd(12, 22).toFixed(1) + "s", dl: (-rnd(0, 22)).toFixed(1) + "s", sw: rnd(2, 3.5).toFixed(1) + "s", dx: rnd(40, 220).toFixed(0) + "px" }, petal));

  layer("ocean", small ? 10 : 20, () => item("fx-bubble", { x: rnd(0, 100).toFixed(1) + "%", s: rnd(6, 22).toFixed(0) + "px",
    d: rnd(10, 22).toFixed(1) + "s", dl: (-rnd(0, 22)).toFixed(1) + "s", dx: rnd(-40, 40).toFixed(0) + "px" }));

  const glassC = ["#7c5cff", "#ff5fa2", "#22b8ff", "#ffb03b", "#1fd1a5"];
  layer("glass", small ? 4 : 6, (i) => item("fx-orb", { x: rnd(0, 90).toFixed(1) + "%", y: rnd(0, 90).toFixed(1) + "%", s: rnd(120, 260).toFixed(0) + "px",
    c: glassC[i % 5], d: rnd(18, 30).toFixed(1) + "s", dl: (-rnd(0, 30)).toFixed(1) + "s", dx: rnd(-160, 160).toFixed(0) + "px", dy: rnd(-120, 120).toFixed(0) + "px" }));

  const neonC = ["#22d3ee", "#e879f9", "#a3e635", "#818cf8"];
  layer("neon", small ? 18 : 36, (i) => item("fx-spark", { x: rnd(0, 100).toFixed(1) + "%", y: rnd(0, 100).toFixed(1) + "%", s: rnd(2, 5).toFixed(1) + "px",
    c: neonC[i % 4], d: rnd(2.5, 6).toFixed(1) + "s", dl: (-rnd(0, 6)).toFixed(1) + "s" }));

  layer("mono", small ? 10 : 22, () => item("fx-dot", { x: rnd(0, 100).toFixed(1) + "%", y: rnd(0, 100).toFixed(1) + "%", s: rnd(2, 4).toFixed(1) + "px",
    d: rnd(20, 40).toFixed(1) + "s", dl: (-rnd(0, 40)).toFixed(1) + "s", dx: rnd(-60, 60).toFixed(0) + "px", dy: rnd(-60, 60).toFixed(0) + "px" }));

  const clsC = ["#1a2b5f", "#ff8a2a", "#3d57a8", "#ff9fb2"];
  layer("classic", small ? 5 : 9, (i) => item("fx-float", { x: rnd(0, 95).toFixed(1) + "%", y: rnd(0, 95).toFixed(1) + "%", s: rnd(30, 90).toFixed(0) + "px",
    c: clsC[i % 4], d: rnd(8, 14).toFixed(1) + "s", dl: (-rnd(0, 14)).toFixed(1) + "s" }));

  const mochiC = ["#f4b6c2", "#f7d9a8", "#cfe3b5", "#fbe9ee", "#e8c6e6"];
  layer("mochi", small ? 3 : 6, (i) => item("fx-mochi", { x: rnd(0, 88).toFixed(1) + "%", y: rnd(5, 85).toFixed(1) + "%", s: rnd(70, 170).toFixed(0) + "px",
    c: mochiC[i % 5], d: rnd(9, 15).toFixed(1) + "s", dl: (-rnd(0, 15)).toFixed(1) + "s", dx: rnd(-40, 40).toFixed(0) + "px" }));
})();
