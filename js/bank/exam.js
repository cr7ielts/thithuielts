// GIAO DIỆN LÀM BÀI KIỂU THI TRÊN MÁY (computer-delivered IELTS)
//  Bài đọc / audio bên trái, câu hỏi bên phải, thanh số câu ở dưới (đã trả lời · đang xem · đánh dấu).
//  Chỉ dùng cho bài đã bóc được nội dung (js/data/bank-interactive.js); còn lại vẫn hiện PDF.
import { el, icon } from "../ui.js";
import { L } from "../i18n.js";

const ROMANS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"];
const letterRange = (ab) => Array.from({ length: Math.max(1, ab.charCodeAt(1) - ab.charCodeAt(0) + 1) }, (_, i) => String.fromCharCode(ab.charCodeAt(0) + i));

/** Nội dung đề tương tác của bài này, hoặc null (chỉ tải đúng bài đang làm) */
let IDS = null;
export async function loadInteractive(id) {
  try {
    if (!IDS) IDS = (await import("../data/bank-interactive.js")).INTERACTIVE_IDS;
    if (!IDS?.has(id)) return null;
    const res = await fetch(new URL(`../data/interactive/${id}.json`, import.meta.url));
    const data = res.ok ? await res.json() : null;
    return data?.groups?.length ? data : null;
  } catch (err) {
    console.warn("không tải được nội dung tương tác", id, err);
    return null;   // hỏng thì quay về cách cũ: làm trên PDF
  }
}

/**
 * Dựng giao diện thi.
 * item: bài trong ngân hàng đề (có groups + key) · data: nội dung đề đã bóc
 * Trả về { paper, sheet, nav, update } — paper: cột trái, sheet: cột phải, nav: thanh số câu
 */
export function examView(data, item, answers, onChange) {
  const flags = new Set();
  const qNodes = new Map();       // số câu -> khối câu hỏi (để cuộn tới)
  const navBtns = new Map();

  /* ----- cột trái: bài đọc ----- */
  const paper = el("div", { class: "cdi-paper" });
  if (data.passage) {
    paper.append(el("div", { class: "cdi-passage" },
      data.passage.title || item?.title ? el("h2", {}, data.passage.title || item.title) : null,
      data.passage.paras.map((p) => el("div", { class: "cdi-para" + (p.mark ? "" : " plain") },
        p.mark ? el("span", { class: "cdi-mark" }, p.mark) : null, el("div", {}, p.text)))));
  }

  /* ----- cột phải: câu hỏi ----- */
  const sheet = el("div", { class: "cdi-questions" });
  for (const g of data.groups) sheet.append(groupBlock(g, item, answers, change, flags, qNodes, () => paint()));

  function change() { onChange?.(); paint(); }

  /* ----- thanh số câu ----- */
  const nav = el("div", { class: "cdi-nav" });
  const numbers = item.groups.flatMap((g) => Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i));
  numbers.forEach((n) => {
    const b = el("button", { type: "button", class: "cdi-num", title: L(`Câu ${n}`, `Question ${n}`), onclick: () => {
      qNodes.get(n)?.scrollIntoView({ behavior: "smooth", block: "center" });
      qNodes.get(n)?.classList.add("flash");
      setTimeout(() => qNodes.get(n)?.classList.remove("flash"), 900);
    } }, String(n));
    navBtns.set(n, b);
    nav.append(b);
  });

  const answered = (n) => {
    const g = item.groups.find((x) => n >= x.from && n <= x.to);
    if (g?.kind === "multi") return (answers[`g${g.from}`] || []).length >= g.to - g.from + 1;
    return !!String(answers[n] ?? "").trim();
  };
  const paint = () => {
    numbers.forEach((n) => {
      const b = navBtns.get(n);
      b.classList.toggle("done", answered(n));
      b.classList.toggle("flag", flags.has(n));
    });
    nav.dataset.left = String(numbers.filter((n) => !answered(n)).length);
  };
  paint();
  return { paper, sheet, nav, flags, blanks: () => numbers.filter((n) => !answered(n)).length, flagged: () => [...flags] };
}

/* ----- một nhóm câu hỏi ----- */
function groupBlock(g, item, answers, change, flags, qNodes, repaint) {
  const box = el("div", { class: "cdi-group" },
    el("div", { class: "cdi-group-head" },
      el("strong", {}, `${L("Câu", g.to > g.from ? "Questions" : "Question")} ${g.from}${g.to > g.from ? `–${g.to}` : ""}`),
      g.instruction ? el("div", { class: "cdi-instr" }, g.instruction) : null));

  // khung đáp án dùng chung (heading / matching)
  if (g.bank?.length) {
    box.append(el("div", { class: "cdi-bank" }, g.bank.map((o) =>
      el("div", { class: "cdi-bank-row" }, el("span", { class: "cdi-bank-v" }, o.v), el("span", {}, o.t)))));
  }

  if (g.kind === "multi") {
    const key = `g${g.from}`;
    const pick = g.to - g.from + 1;
    const chosen = new Set(answers[key] || []);
    const info = el("div", { class: "tiny muted" });
    const upd = () => { info.textContent = L(`Chọn ${pick} đáp án (${chosen.size}/${pick})`, `Choose ${pick} (${chosen.size}/${pick})`); };
    const list = el("div", { class: "cdi-opts" }, (g.options || []).map((o) => {
      const b = el("button", { type: "button", class: "cdi-opt" + (chosen.has(o.v) ? " on" : ""), onclick: () => {
        if (chosen.has(o.v)) chosen.delete(o.v);
        else if (chosen.size < pick) chosen.add(o.v);
        b.classList.toggle("on", chosen.has(o.v));
        answers[key] = [...chosen].sort(); upd(); change();
      } }, el("span", { class: "cdi-opt-v" }, o.v), el("span", {}, o.t));
      return b;
    }));
    upd();
    const node = el("div", { class: "cdi-q" }, el("div", { class: "cdi-q-num" }, `${g.from}–${g.to}`), el("div", { style: "flex:1" }, list, info));
    for (let n = g.from; n <= g.to; n++) qNodes.set(n, node);
    box.append(node);
    return box;
  }

  // dạng điền vào ghi chú / bảng / sơ đồ: giữ nguyên bố cục, ô nhập nằm đúng chỗ trống
  if (g.notes?.length) {
    box.append(el("div", { class: "cdi-notes" },
      g.noteTitle ? el("div", { class: "cdi-notes-title" }, g.noteTitle) : null,
      g.notes.map((it) => {
        const line = el("div", { class: `cdi-note lv${it.level || 0}` }, it.bullet ? el("span", { class: "cdi-bullet" }, it.bullet) : null);
        line.append(noteText(it.text, answers, change, flags, qNodes, repaint, line, g.bank));
        return line;
      })));
    return box;
  }

  for (const q of g.questions || []) {
    const n = q.n;
    const body = el("div", { class: "cdi-q-body" });
    const flag = el("button", { type: "button", class: "cdi-flag", title: L("Đánh dấu để xem lại", "Flag for review"),
      onclick: () => { flags.has(n) ? flags.delete(n) : flags.add(n); flag.classList.toggle("on", flags.has(n)); repaint(); } }, icon("bookmark"));
    const node = el("div", { class: "cdi-q" }, el("div", { class: "cdi-q-num" }, String(n)), body, flag);
    qNodes.set(n, node);

    if (g.kind === "gap" || g.kind === "other") {
      body.append(gapText(q.text, n, answers, change));
    } else if (g.kind === "tfng" || g.kind === "ynng") {
      const opts = g.kind === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];
      body.append(el("div", { class: "cdi-text" }, q.text), segmented(opts, n, answers, change));
    } else if (q.options?.length) {
      // trắc nghiệm A/B/C có phương án riêng cho từng câu
      body.append(el("div", { class: "cdi-text" }, q.text), el("div", { class: "cdi-opts" }, q.options.map((o) => choiceBtn(o, n, answers, change))));
    } else {
      // chọn từ khung đáp án chung ở trên: nút chỉ hiện chữ cái, rê chuột xem nội dung
      const opts = g.kind === "heading" ? ROMANS.slice(0, g.bank?.length || 10).map((v, i) => ({ v, t: g.bank?.[i]?.t || "" }))
        : (g.bank?.length ? g.bank : letterRange(item.groups.find((x) => x.from === g.from)?.letters || "AH").map((v) => ({ v, t: "" })));
      body.append(gapText(q.text, n, answers, change, true),
        el("div", { class: "cdi-opts compact" }, opts.map((o) => choiceBtn(o, n, answers, change, true))));
    }
    box.append(node);
  }
  return box;
}

/** một dòng ghi chú: "…larger {{6}}" -> chữ + số câu + ô nhập */
function noteText(text, answers, change, flags, qNodes, repaint, line, bank = null) {
  const wrap = el("span", { class: "cdi-note-text" });
  const parts = String(text || "").split(/\{\{(\d+)(?::([^}]*))?\}\}/);
  parts.forEach((p, i) => {
    if (i % 3 === 0) { if (p) wrap.append(document.createTextNode(p)); return; }
    if (i % 3 === 2) return;                       // ký hiệu trước ô trống, xử lý ở nhánh dưới
    const n = Number(p);
    const pre = parts[i + 1] || "";
    qNodes.set(n, line);
    const num = el("button", { type: "button", class: "cdi-qn" + (flags.has(n) ? " on" : ""),
      title: L("Bấm để đánh dấu xem lại", "Click to flag for review"),
      onclick: () => { flags.has(n) ? flags.delete(n) : flags.add(n); num.classList.toggle("on", flags.has(n)); repaint(); } }, String(n));
    wrap.append(num);
    if (pre) wrap.append(document.createTextNode(" " + pre + " "));
    wrap.append(bank?.length ? bankSelect(n, bank, answers, change) : input(n, answers, change));
  });
  return wrap;
}

/** chỗ trống chọn từ khung đáp án: hộp chọn giống đề thi máy */
function bankSelect(n, bank, answers, change) {
  const sel = el("select", { class: "cdi-select", id: `bq-${n}`, onchange: () => { answers[n] = sel.value; change(); } },
    el("option", { value: "" }, "—"),
    bank.map((o) => el("option", { value: o.v, selected: answers[n] === o.v ? "" : null }, `${o.v}  ${o.t}`)));
  return sel;
}

function choiceBtn(o, n, answers, change, letterOnly = false) {
  const b = el("button", { type: "button", class: "cdi-opt" + (letterOnly ? " only-v" : "") + (answers[n] === o.v ? " on" : ""),
    title: letterOnly ? o.t || "" : null, onclick: () => {
      answers[n] = answers[n] === o.v ? "" : o.v;
      [...b.parentNode.children].forEach((x) => x.classList.toggle("on", x.dataset.v === answers[n]));
      b.closest(".cdi-q-body")?.querySelectorAll(`.cdi-blank[data-q="${n}"]`).forEach((s) => { s.textContent = answers[n]; });
      change();
    }, dataset: { v: o.v } }, el("span", { class: "cdi-opt-v" }, o.v), !letterOnly && o.t ? el("span", {}, o.t) : null);
  return b;
}

function segmented(opts, n, answers, change) {
  const row = el("div", { class: "cdi-opts compact" });
  opts.forEach((o) => row.append(el("button", { type: "button", class: "cdi-opt" + (answers[n] === o ? " on" : ""), dataset: { v: o },
    onclick: () => { answers[n] = answers[n] === o ? "" : o; [...row.children].forEach((x) => x.classList.toggle("on", x.dataset.v === answers[n])); change(); } },
    el("span", {}, o))));
  return row;
}

/** câu điền từ: ô nhập nằm ngay chỗ trống trong câu (readOnly khi chọn từ khung) */
function gapText(text, n, answers, change, fromBank = false) {
  const wrap = el("div", { class: "cdi-text" });
  const parts = String(text || "").split("____");
  const slot = () => (fromBank ? blankBox(n, answers) : input(n, answers, change));
  parts.forEach((p, i) => {
    wrap.append(document.createTextNode(p));
    if (i < parts.length - 1) wrap.append(slot());
  });
  if (parts.length === 1 && !fromBank) wrap.append(" ", input(n, answers, change));
  return wrap;
}

/** ô trống hiện chữ cái đã chọn từ khung */
function blankBox(n, answers) {
  const box = el("span", { class: "cdi-blank", dataset: { q: n } }, answers[n] || "");
  return box;
}

function input(n, answers, change) {
  const inp = el("input", { type: "text", class: "cdi-input", id: `bq-${n}`, value: answers[n] || "", autocomplete: "off", spellcheck: "false",
    oninput: () => { answers[n] = inp.value; change(); } });
  return inp;
}
