// GIAO DIỆN LÀM BÀI KIỂU THI TRÊN MÁY (computer-delivered IELTS)
//  Bài đọc / audio bên trái, câu hỏi bên phải, thanh dưới cùng: tiến độ + số câu (đã trả lời, đang xem, chưa chắc).
//  Nút "Chưa chắc" ở từng câu, bảng "Danh sách câu hỏi" (lọc câu trống / chưa chắc, bấm để nhảy tới),
//  hỏi lại khi chuyển Part mà Part đang làm còn câu trống.
//  Chỉ dùng cho bài đã bóc được nội dung (js/data/bank-interactive.js); còn lại vẫn hiện PDF.
import { el, icon, fmtClock, confirmDialog } from "../ui.js";
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
 * opts: { flags: [số câu đã đánh dấu chưa chắc], onFlags(list), timer: Countdown (hiện trong Danh sách câu hỏi) }
 * Trả về { paper, sheet, nav, ... } — paper: cột trái, sheet: cột phải, nav: thanh dưới cùng
 */
export function examView(data, item, answers, onChange, opts = {}) {
  const flags = new Set(opts.flags || []);
  const flagViews = new Map();    // số câu -> [nút đánh dấu] để đồng bộ khi bấm ở chỗ khác
  const toggleFlag = (n) => {
    flags.has(n) ? flags.delete(n) : flags.add(n);
    (flagViews.get(n) || []).forEach((b) => b.classList.toggle("on", flags.has(n)));
    opts.onFlags?.([...flags]);
    paint();
  };
  const flagUI = { views: flagViews, toggle: toggleFlag, has: (n) => flags.has(n) };
  const qNodes = new Map();       // số câu -> khối câu hỏi (để cuộn tới)
  const navBtns = new Map();

  /* ----- cột trái: bài đọc ----- */
  const paper = el("div", { class: "cdi-paper" });
  const passageNode = (ps, title, part = null) => el("div", { class: "cdi-passage", dataset: part ? { part } : {} },
    title ? el("h2", {}, title) : null,
    ps.paras.map((p) => el("div", { class: "cdi-para" + (p.mark ? "" : " plain") },
      p.mark ? el("span", { class: "cdi-mark" }, p.mark) : null, el("div", {}, p.text))));
  if (data.passage) paper.append(passageNode(data.passage, data.passage.title || item?.title));
  // đề Reading đầy đủ (3 passage): mỗi Part một bài đọc, chỉ hiện bài của Part đang làm
  const passageNodes = new Map();
  (data.passages || []).forEach((ps, i) => {
    const node = passageNode(ps, `${L("Bài đọc", "Passage")} ${i + 1}, ${ps.title}`, i + 1);
    passageNodes.set(i + 1, node);
    paper.append(node);
  });

  /* ----- cột phải: câu hỏi ----- */
  const sheet = el("div", { class: "cdi-questions" });
  // Listening cả đề (không có bài đọc, quá 10 câu): chia theo Part như thi trên máy — mỗi lần một Part
  // Part: theo từng bài đọc (đề Reading đầy đủ) hoặc mỗi 10 câu (Listening)
  const ranges = data.passages?.length ? data.passages.map((ps) => [ps.from, ps.to]) : null;
  const partOf = ranges ? (n) => ranges.findIndex(([a, b]) => n >= a && n <= b) + 1 : (n) => Math.ceil(n / 10);
  const lastQ = Math.max(...item.groups.map((g) => g.to));
  const byPart = !!ranges || (!data.passage && lastQ > 10 && item.groups.every((g) => partOf(g.from) === partOf(g.to)));
  const partRange = (p) => (ranges ? ranges[p - 1] : [(p - 1) * 10 + 1, p * 10]);
  const partBoxes = new Map();
  for (const g of data.groups) {
    const block = groupBlock(g, item, answers, change, flagUI, qNodes);
    if (!byPart) { sheet.append(block); continue; }
    const p = partOf(g.from);
    if (!partBoxes.has(p)) {
      const box = el("div", { class: "cdi-part", dataset: { part: p } },
        el("div", { class: "cdi-part-head" }, el("strong", {}, `Part ${p}`),
          el("span", { class: "tiny muted" }, L(`Câu ${partRange(p)[0]}–${partRange(p)[1]}`, `Questions ${partRange(p)[0]}–${partRange(p)[1]}`))));
      partBoxes.set(p, box); sheet.append(box);
    }
    partBoxes.get(p).append(block);
  }
  let curPart = 1;
  const partListeners = [];
  let warnSkip = true;   // "Không nhắc lại trong bài này"
  // chuyển Part: Part đang làm còn câu trống thì hỏi lại trước
  const goPart = async (p) => {
    if (!byPart || p === curPart || !partBoxes.has(p)) return true;
    const left = numbers.filter((n) => partOf(n) === curPart && !answered(n));
    if (warnSkip && left.length) {
      const off = el("input", { type: "checkbox" });
      const ok = await confirmDialog({
        title: L(`Part ${curPart} còn ${left.length} câu trống`, `Part ${curPart} has ${left.length} unanswered`),
        body: L(`Bạn đang bỏ qua câu <strong>${left.join(", ")}</strong>. Vẫn chuyển sang Part ${p}?`,
                `You're skipping question${left.length > 1 ? "s" : ""} <strong>${left.join(", ")}</strong>. Move to Part ${p} anyway?`),
        extra: el("label", { class: "check tiny", style: "margin-top:10px" }, off, L("Không nhắc lại trong bài này", "Don't ask again in this test")),
        okText: L(`Sang Part ${p}`, `Go to Part ${p}`), cancelText: L("Ở lại làm tiếp", "Stay here"),
      });
      if (off.checked) warnSkip = false;
      if (!ok) { jump(left[0]); return false; }
    }
    setPart(p);
    return true;
  };
  const setPart = (p) => {
    if (!byPart || !partBoxes.has(p)) return;
    curPart = p;
    partBoxes.forEach((box, k) => box.classList.toggle("hidden", k !== p));
    passageNodes.forEach((node, k) => node.classList.toggle("hidden", k !== p));
    if (passageNodes.size) paper.scrollTop = 0;
    partTabs.forEach((t, k) => t.classList.toggle("on", k === p));
    partListeners.forEach((f) => f(p));
  };
  const partTabs = new Map();

  function change() { onChange?.(); paint(); }

  /* ----- thanh dưới cùng: tiến độ + số câu ----- */
  const nav = el("div", { class: "cdi-nav" + (byPart ? " by-part" : "") });
  const numbers = item.groups.flatMap((g) => Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i));
  const progFill = el("span", { class: "cdi-prog-fill" });
  const progText = el("span", { class: "cdi-prog-text" });
  const dock = el("div", { class: "cdi-dock" },
    el("div", { class: "cdi-prog" },
      el("span", { class: "cdi-prog-bar", role: "progressbar" }, progFill), progText,
      el("button", { type: "button", class: "btn btn-sm cdi-list-btn", onclick: () => openList() }, icon("grid"), L("Danh sách câu hỏi", "Question list"))),
    nav);
  const jump = (n) => {
    if (byPart && partOf(n) !== curPart) setPart(partOf(n));
    const node = qNodes.get(n);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    node?.classList.add("flash");
    setTimeout(() => node?.classList.remove("flash"), 900);
  };
  const navGroups = new Map();
  if (byPart) partBoxes.forEach((_, p) => {
    const tab = el("button", { type: "button", class: "cdi-part-tab", onclick: async () => { if (await goPart(p)) { window.scrollTo({ top: 0, behavior: "smooth" }); sheet.scrollTop = 0; } } },
      el("strong", {}, `Part ${p}`), el("span", { class: "cdi-part-count" }));
    partTabs.set(p, tab);
    const nums = el("div", { class: "cdi-part-nums" });
    navGroups.set(p, nums);
    nav.append(el("div", { class: "cdi-part-nav" }, tab, nums));
  });
  numbers.forEach((n) => {
    const b = el("button", { type: "button", class: "cdi-num", title: L(`Câu ${n}`, `Question ${n}`), onclick: async () => {
      if (byPart && partOf(n) !== curPart && !(await goPart(partOf(n)))) return;
      jump(n);
    } }, String(n));
    navBtns.set(n, b);
    (byPart ? navGroups.get(partOf(n)) || nav : nav).append(b);
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
    const done = numbers.filter(answered).length;
    nav.dataset.left = String(numbers.length - done);
    progFill.style.width = `${Math.round((done / numbers.length) * 100)}%`;
    progText.textContent = L(`${done}/${numbers.length} câu đã làm`, `${done}/${numbers.length} answered`)
      + (flags.size ? L(`, ${flags.size} chưa chắc`, `, ${flags.size} unsure`) : "");
    partTabs.forEach((t, p) => {
      const ns = numbers.filter((n) => partOf(n) === p);
      t.querySelector(".cdi-part-count").textContent = ` ${ns.filter(answered).length}/${ns.length}`;
    });
  };
  /* ----- bảng Danh sách câu hỏi ----- */
  const qText = (n) => {
    const g = data.groups.find((x) => n >= x.from && n <= x.to);
    const q = g?.questions?.find((x) => x.n === n);
    let t = q?.text || "";
    if (!t && g?.notes) t = (g.notes.find((it) => new RegExp(`\\{\\{${n}\\b`).test(it.text))?.text || "").replace(/\{\{\d+(?::[^}]*)?\}\}/g, "____");
    if (!t && g?.kind === "multi") t = g.instruction || "";
    return t.replace(/\s+/g, " ").trim();
  };
  const shown = (n) => {
    const g = item.groups.find((x) => n >= x.from && n <= x.to);
    const v = g?.kind === "multi" ? (answers[`g${g.from}`] || []).join(", ") : String(answers[n] ?? "").trim();
    return v.length > 24 ? v.slice(0, 22) + "…" : v;
  };
  function openList() {
    let filter = "all";
    const clock = el("span", { class: "cdi-list-clock" });
    const tickClock = () => { if (opts.timer) clock.textContent = `${L("Còn lại", "Time left")} ${fmtClock(opts.timer.remaining)}`; };
    const iv = setInterval(tickClock, 500); tickClock();
    const rows = el("div", { class: "cdi-list-rows" });
    const tabs = el("div", { class: "row wrap", style: "gap:6px" });
    const back = el("div", { class: "modal-back cdi-list-back" });
    const close = () => { clearInterval(iv); back.remove(); };
    const FILTERS = [["all", L("Tất cả", "All")], ["blank", L("Còn trống", "Unanswered")], ["flag", L("Chưa chắc", "Unsure")], ["done", L("Đã làm", "Answered")]];
    const draw = () => {
      tabs.replaceChildren(...FILTERS.map(([k, t]) => {
        const c = numbers.filter((n) => k === "all" || (k === "blank" ? !answered(n) : k === "flag" ? flags.has(n) : answered(n))).length;
        return el("button", { type: "button", class: "chip-btn" + (filter === k ? " on" : ""), onclick: () => { filter = k; draw(); } }, `${t} (${c})`);
      }));
      const list = numbers.filter((n) => filter === "all" || (filter === "blank" ? !answered(n) : filter === "flag" ? flags.has(n) : answered(n)));
      rows.replaceChildren(...list.map((n) => {
        const st = flags.has(n) ? "flag" : answered(n) ? "done" : "blank";
        const flag = el("button", { type: "button", class: "cdi-flag mini" + (flags.has(n) ? " on" : ""), title: L("Chưa chắc", "Unsure"),
          onclick: (e) => { e.stopPropagation(); toggleFlag(n); draw(); } }, icon("bookmark"));
        return el("div", { class: `cdi-list-row ${st}`, role: "button", tabindex: "0",
          onclick: async () => { close(); if (byPart && partOf(n) !== curPart && !(await goPart(partOf(n)))) return; jump(n); } },
          el("span", { class: "cdi-list-n" }, String(n)),
          el("span", { class: "cdi-list-q" }, qText(n) || "—", byPart ? el("span", { class: "tiny muted" }, `  Part ${partOf(n)}`) : null),
          el("span", { class: "cdi-list-a" }, answered(n) ? shown(n) : L("trống", "blank")),
          flag);
      }));
      if (!list.length) rows.append(el("p", { class: "muted small", style: "padding:10px" }, L("Không có câu nào.", "Nothing here.")));
    };
    draw();
    back.append(el("div", { class: "modal cdi-list" },
      el("div", { class: "row", style: "gap:10px;align-items:center" },
        el("h3", { class: "mb-0", style: "flex:1" }, L("Danh sách câu hỏi", "Question list")), clock,
        el("button", { type: "button", class: "btn btn-sm btn-ghost", onclick: close }, icon("x"))),
      tabs, rows));
    back.addEventListener("click", (e) => { if (e.target === back) close(); });
    document.body.append(back);
  }

  paint();
  setPart(1);
  return { paper, sheet, nav: dock, flags, byPart, setPart, jump, onPart: (f) => partListeners.push(f),
    blanks: () => numbers.filter((n) => !answered(n)).length, blankList: () => numbers.filter((n) => !answered(n)), flagged: () => [...flags].sort((a, b) => a - b) };
}

/** nút "Chưa chắc" của một câu (hoặc cả nhóm chọn nhiều đáp án) */
function flagBtn(ns, flagUI) {
  const b = el("button", { type: "button", class: "cdi-flag" + (flagUI.has(ns[0]) ? " on" : ""), title: L("Đánh dấu câu chưa chắc để xem lại", "Mark as unsure to review later"),
    onclick: () => ns.forEach((n) => flagUI.toggle(n)) }, icon("bookmark"), el("span", { class: "cdi-flag-t" }, L("Chưa chắc", "Unsure")));
  ns.forEach((n) => flagUI.views.set(n, [...(flagUI.views.get(n) || []), b]));
  return b;
}

/* ----- một nhóm câu hỏi ----- */
function groupBlock(g, item, answers, change, flagUI, qNodes) {
  const box = el("div", { class: "cdi-group" },
    el("div", { class: "cdi-group-head" },
      el("strong", {}, `${L("Câu", g.to > g.from ? "Questions" : "Question")} ${g.from}${g.to > g.from ? `–${g.to}` : ""}`),
      g.instruction ? el("div", { class: "cdi-instr" }, g.instruction) : null));

  // khung đáp án dùng chung (heading / matching)
  if (g.bank?.some((o) => o.t)) {   // khung chữ cái trống (đề chỉ có trên trang PDF) thì khỏi liệt kê
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
    const ns = Array.from({ length: pick }, (_, i) => g.from + i);
    const node = el("div", { class: "cdi-q" }, el("div", { class: "cdi-q-num" }, `${g.from}–${g.to}`), el("div", { style: "flex:1" }, list, info), flagBtn(ns, flagUI));
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
        line.append(noteText(it.text, answers, change, flagUI, qNodes, line, g.bank));
        return line;
      })));
    return box;
  }

  for (const q of g.questions || []) {
    const n = q.n;
    const body = el("div", { class: "cdi-q-body" });
    const node = el("div", { class: "cdi-q" }, el("div", { class: "cdi-q-num" }, String(n)), body, flagBtn([n], flagUI));
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
function noteText(text, answers, change, flagUI, qNodes, line, bank = null) {
  const wrap = el("span", { class: "cdi-note-text" });
  const parts = String(text || "").split(/\{\{(\d+)(?::([^}]*))?\}\}/);
  parts.forEach((p, i) => {
    if (i % 3 === 0) { if (p) wrap.append(document.createTextNode(p)); return; }
    if (i % 3 === 2) return;                       // ký hiệu trước ô trống, xử lý ở nhánh dưới
    const n = Number(p);
    const pre = parts[i + 1] || "";
    qNodes.set(n, line);
    const num = el("button", { type: "button", class: "cdi-qn" + (flagUI.has(n) ? " on" : ""),
      title: L("Bấm để đánh dấu chưa chắc", "Click to mark as unsure"), onclick: () => flagUI.toggle(n) }, String(n));
    flagUI.views.set(n, [...(flagUI.views.get(n) || []), num]);
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
