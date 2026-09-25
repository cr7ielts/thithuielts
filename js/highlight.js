// HIGHLIGHT NHIỀU MÀU khi làm Reading / Listening
//  - Thanh công cụ: chọn màu (bật bút highlight), tẩy, xoá hết
//  - Nội dung HTML (đề thi thử): bôi đen chữ -> tô màu (<mark>)
//  - PDF (ngân hàng đề): bôi đen chữ trên lớp chữ của PDF -> tô; trang ảnh scan: kéo chuột vẽ khung tô.
//    Highlight PDF được lưu trong trình duyệt theo từng bài.
import { el, icon, toast } from "./ui.js";
import { L } from "./i18n.js";

export const HL_COLORS = [
  { id: "y", name: L("Vàng", "Yellow") },
  { id: "g", name: L("Xanh lá", "Green") },
  { id: "b", name: L("Xanh dương", "Blue") },
  { id: "p", name: L("Hồng", "Pink") },
  { id: "o", name: L("Cam", "Orange") },
];

/** Bộ highlight dùng chung cho một trang làm bài: { toolbar, state, onClear(fn) } */
export function createHighlighter() {
  const state = { color: null, erase: false };
  const clearFns = [];
  const btns = [];
  const paint = () => {
    btns.forEach((b) => b.classList.toggle("on", state.erase ? b.dataset.hl === "erase" : b.dataset.hl === state.color));
    document.body.classList.toggle("hl-on", !!state.color);
    document.body.classList.toggle("hl-erasing", state.erase);
  };
  const pick = (c) => {
    if (c === "erase") { state.erase = !state.erase; state.color = null; }
    else { state.color = state.color === c ? null : c; state.erase = false; }
    paint();
  };
  HL_COLORS.forEach((c) => btns.push(el("button", {
    type: "button", class: `hl-swatch hl-${c.id}`, dataset: { hl: c.id }, title: L(`Bút ${c.name.toLowerCase()} — bôi đen chữ để tô`, `${c.name} highlighter — select text to highlight`),
    "aria-label": c.name, onclick: () => pick(c.id),
  })));
  btns.push(el("button", { type: "button", class: "hl-tool", dataset: { hl: "erase" }, title: L("Tẩy: bấm vào chỗ đã tô để xoá", "Eraser: click a highlight to remove it"), onclick: () => pick("erase") }, icon("x")));
  const clearBtn = el("button", { type: "button", class: "hl-tool", title: L("Xoá hết highlight", "Clear all highlights"),
    onclick: () => { clearFns.forEach((f) => f()); toast(L("Đã xoá hết highlight", "All highlights cleared"), "ok"); } }, icon("refresh"));
  const toolbar = el("div", { class: "hl-toolbar", role: "toolbar", "aria-label": "Highlight" },
    el("span", { class: "hl-label" }, icon("writing"), el("span", { class: "hl-label-text" }, "Highlight")), ...btns, clearBtn);
  paint();
  return {
    toolbar, state,
    onClear: (fn) => clearFns.push(fn),
    /** tắt bút khi rời trang làm bài */
    dispose: () => { document.body.classList.remove("hl-on", "hl-erasing"); },
  };
}

/* ======================= HTML ======================= */
/** Cho phép tô màu chữ trong root (đoạn văn, câu hỏi). Không đụng vào ô nhập / nút. */
export function attachHtmlHighlighter(root, hl) {
  const apply = () => {
    if (!hl.state.color) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    wrapRange(range, hl.state.color, root);
    sel.removeAllRanges();
  };
  root.addEventListener("mouseup", () => setTimeout(apply, 0));
  root.addEventListener("touchend", () => setTimeout(apply, 250));
  root.addEventListener("click", (e) => {
    const m = e.target.closest?.("mark.hl");
    if (m && hl.state.erase && root.contains(m)) unwrap(m);
  });
  hl.onClear(() => root.querySelectorAll("mark.hl").forEach(unwrap));
}

function wrapRange(range, color, root) {
  const nodes = [];
  const walker = document.createTreeWalker(range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT, { acceptNode: (n) => (range.intersectsNode(n) && n.nodeValue.trim() && !n.parentNode.closest("input,textarea,select,button,option,script,style") && root.contains(n)
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    let node = n;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.nodeValue.length;
    if (end <= start) continue;
    if (end < node.nodeValue.length) node.splitText(end);
    if (start > 0) node = node.splitText(start);
    // tô lại chỗ đã tô: đổi màu thay vì lồng thêm
    const parentMark = node.parentNode.closest?.("mark.hl");
    if (parentMark && parentMark.textContent === node.nodeValue) { parentMark.className = `hl hl-${color}`; continue; }
    const mark = document.createElement("mark");
    mark.className = `hl hl-${color}`;
    node.parentNode.insertBefore(mark, node);
    mark.append(node);
  }
}

function unwrap(mark) {
  const parent = mark.parentNode;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  mark.remove();
  parent.normalize();
}

/* ======================= PDF ======================= */
/**
 * Gắn highlight cho các trang PDF (mỗi trang: holder chứa canvas + .textLayer).
 * storeKey: khoá lưu trong localStorage. Mỗi highlight: { p: trang, c: màu, r: [[x,y,w,h] theo tỉ lệ 0..1] }
 */
export function pdfHighlightStore(storeKey, hl) {
  let items = [];
  try { items = JSON.parse(localStorage.getItem(storeKey) || "[]"); } catch { items = []; }
  const save = () => { try { localStorage.setItem(storeKey, JSON.stringify(items)); } catch { /* bộ nhớ đầy / chế độ riêng tư */ } };
  const layers = new Map();   // trang -> lớp highlight
  const draw = (page) => {
    const layer = layers.get(page);
    if (!layer) return;
    layer.innerHTML = "";
    items.forEach((h, idx) => {
      if (h.p !== page) return;
      h.r.forEach(([x, y, w, ht]) => layer.append(el("div", {
        class: `hl-rect hl-${h.c}`, dataset: { idx },
        style: `left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${ht * 100}%`,
      })));
    });
  };
  hl.onClear(() => { items = []; save(); layers.forEach((_, p) => draw(p)); });

  /** gọi khi một trang đã vẽ xong: holder (position:relative), số trang */
  const attach = (holder, page) => {
    const layer = el("div", { class: "hl-layer" });
    holder.append(layer);
    layers.set(page, layer);
    draw(page);
    layer.addEventListener("click", (e) => {
      const r = e.target.closest(".hl-rect");
      if (!r || !hl.state.erase) return;
      items.splice(Number(r.dataset.idx), 1); save(); layers.forEach((_, p) => draw(p));
    });
    let start = null;
    holder.addEventListener("pointerdown", (e) => {
      if (!hl.state.color) return;
      const b = holder.getBoundingClientRect();
      start = { x: e.clientX - b.left, y: e.clientY - b.top, box: b, onText: !!e.target.closest(".textLayer span") };
    });
    const finish = (e) => {
      if (!hl.state.color || !start) { start = null; return; }
      const b = start.box;
      setTimeout(() => {
        const sel = window.getSelection();
        let rects = [];
        if (sel && !sel.isCollapsed && sel.rangeCount && holder.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          rects = mergeLines([...sel.getRangeAt(0).getClientRects()]
            .filter((r) => r.width > 1 && r.height > 1)
            .map((r) => [(r.left - b.left) / b.width, (r.top - b.top) / b.height, r.width / b.width, r.height / b.height]));
          sel.removeAllRanges();
        } else if (!start.onText && e) {
          // kéo khung (trang ảnh scan, hoặc vùng không có chữ)
          const x2 = e.clientX - b.left, y2 = e.clientY - b.top;
          if (Math.abs(x2 - start.x) > 8 && Math.abs(y2 - start.y) > 6) {
            rects = [[Math.min(start.x, x2) / b.width, Math.min(start.y, y2) / b.height, Math.abs(x2 - start.x) / b.width, Math.abs(y2 - start.y) / b.height]];
          }
        }
        if (rects.length) { items.push({ p: page, c: hl.state.color, r: rects }); save(); draw(page); }
        start = null;
      }, 0);
    };
    holder.addEventListener("pointerup", finish);
    holder.addEventListener("pointercancel", () => { start = null; });
  };
  return { attach };
}

/** gộp các ô chữ cùng dòng (getClientRects trả từng span) */
function mergeLines(rects) {
  rects.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const out = [];
  for (const r of rects) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - r[1]) < r[3] * 0.5 && r[0] <= last[0] + last[2] + 0.02) {
      const x2 = Math.max(last[0] + last[2], r[0] + r[2]);
      last[1] = Math.min(last[1], r[1]); last[3] = Math.max(last[3], r[3]); last[2] = x2 - last[0];
    } else out.push([...r]);
  }
  return out;
}
