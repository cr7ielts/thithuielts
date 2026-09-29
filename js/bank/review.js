// XEM LẠI BÀI LÀM READING (kiểu Youpass)
//  Bài đọc bên trái — câu dẫn chứng được tô và đánh số câu; bên phải từng câu: bạn chọn / đáp án đúng /
//  giải thích tiếng Việt / nút "Xem trong bài" cuộn tới dẫn chứng. Lọc: tất cả · câu sai · câu đúng.
//  Giải thích viết sẵn: js/data/explain/<id>.json (sinh từ tools/explain bằng gen_explain.py)
//    { "id": "...", "q": { "14": { "ev": ["câu nguyên văn trong bài", ...], "why": "giải thích" }, ... } }
import { el, icon, fmtDateTime, fmtDuration } from "../ui.js";
import { L } from "../i18n.js";
import { listMySubmissions } from "../store.js";
import { findBankItem } from "./bank.js";
import { loadInteractive } from "./exam.js";

let EXPLAIN_IDS = null;
async function loadExplain(id) {
  try {
    if (!EXPLAIN_IDS) EXPLAIN_IDS = (await import("../data/bank-explain.js")).EXPLAIN_IDS;
    if (!EXPLAIN_IDS.has(id)) return null;
    const res = await fetch(new URL(`../data/explain/${id}.json`, import.meta.url));
    return res.ok ? await res.json() : null;
  } catch (err) { console.warn("không tải được giải thích", id, err); return null; }
}

const TF = { TRUE: L("Đúng (TRUE)", "TRUE"), FALSE: L("Sai (FALSE)", "FALSE"), "NOT GIVEN": L("Không có thông tin (NOT GIVEN)", "NOT GIVEN"),
  YES: L("Có (YES)", "YES"), NO: L("Không (NO)", "NO") };

/** số câu -> { text, options } lấy từ nội dung đề tương tác */
function questionTexts(inter) {
  const map = new Map();
  for (const g of inter.groups) {
    const opts = g.bank || g.options || null;
    for (const q of g.questions || []) map.set(q.n, { text: q.text, options: q.options || opts, instr: g.instruction });
    for (const it of g.notes || []) {
      for (const m of it.text.matchAll(/\{\{(\d+)(?::[^}]*)?\}\}/g)) {
        const n = Number(m[1]);
        const text = it.text.replace(/\{\{(\d+)(?::([^}]*))?\}\}/g, (_, k, pre) => (Number(k) === n ? `${pre || ""}______` : "…"));
        map.set(n, { text, options: opts, instr: g.instruction });
      }
    }
    if (g.kind === "multi") for (let n = g.from; n <= g.to; n++) map.set(n, { text: g.instruction, options: g.options, instr: "" });
  }
  return map;
}

/** "B" -> "B · nội dung phương án" nếu có */
function withOption(v, options) {
  if (!v) return v;
  const parts = String(v).split(/\s*,\s*/);
  return parts.map((p) => {
    const o = options?.find((x) => x.v.toLowerCase() === p.toLowerCase());
    return o ? `${p} · ${o.t}` : TF[p.toUpperCase()] && !options ? p.toUpperCase() : p;
  }).join(" / ");
}

const norm = (s) => String(s).replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

/** Tô dẫn chứng: trả về đoạn văn đã chia thành chữ thường + <mark> theo từng câu */
function paraNodes(text, hits) {
  // hits: [{ start, end, n }] đã sắp, không chồng nhau
  const out = [];
  let i = 0;
  for (const h of hits) {
    if (h.start > i) out.push(document.createTextNode(text.slice(i, h.start)));
    out.push(el("mark", { class: "ev", dataset: { q: h.n } }, el("sup", { class: "ev-n" }, h.n), text.slice(h.start, h.end)));
    i = h.end;
  }
  if (i < text.length) out.push(document.createTextNode(text.slice(i)));
  return out;
}

export function renderBankReview(ctx, kind, id, sub = null) {
  const wrap = el("div", { class: "stack-lg rv" });
  wrap.append(el("button", { class: "btn btn-ghost btn-sm back", onclick: () => (sub ? ctx.go("result", { submission: sub }) : ctx.go("history")) },
    icon("back"), sub ? L("Kết quả", "Result") : L("Lịch sử", "History")));
  const body = el("div", { class: "card muted" }, L("Đang tải…", "Loading…"));
  wrap.append(body);

  (async () => {
    const item = (await findBankItem({ kind, id }))?.item;
    if (!item) throw new Error(L("Không tìm thấy bài này.", "Test not found."));
    // mở thẳng link / tải lại trang: lấy lần làm gần nhất của bài này
    if (!sub) sub = (await listMySubmissions(ctx.user.uid)).find((s) => s.testId === `bank:${kind}:${id}` && s.details?.length) || null;
    if (!sub) { body.replaceWith(el("div", { class: "notice notice-info" }, L("Bạn chưa làm bài này. Làm bài xong sẽ xem lại được ở đây.", "You haven't taken this test yet."))); return; }
    const [inter, exp] = await Promise.all([loadInteractive(id), loadExplain(id)]);
    body.replaceWith(view(ctx, kind, item, sub, inter, exp));
  })().catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));
  return wrap;
}

function view(ctx, kind, item, sub, inter, exp) {
  const details = sub.details;
  const right = details.filter((d) => d.ok).length;
  const blank = details.filter((d) => !d.given).length;
  const qx = inter ? questionTexts(inter) : new Map();
  const E = exp?.q || {};

  /* ----- đầu trang: điểm + lọc ----- */
  let filter = "all";
  const chips = el("div", { class: "row wrap", style: "gap:8px" });
  const head = el("section", { class: "card rv-head" },
    el("div", { class: "row wrap", style: "gap:18px;align-items:center" },
      el("div", { class: "rv-score" }, el("span", { class: "v" }, right), el("span", { class: "t" }, `/ ${details.length}`)),
      el("div", { style: "flex:1;min-width:220px" },
        el("div", { class: "eyebrow" }, L("Xem lại bài làm", "Review")),
        el("h1", { style: "margin:0 0 4px;font-size:1.6rem" }, item.title),
        el("div", { class: "small muted" }, [
          sub.submittedAt ? fmtDateTime(sub.submittedAt) : null,
          sub.durationSec ? `${L("thời gian", "time")} ${fmtDuration(sub.durationSec)}` : null,
        ].filter(Boolean).join(" · "))),
      el("div", { class: "row wrap", style: "gap:8px" },
        el("span", { class: "chip chip-ok" }, icon("check"), L(`${right} đúng`, `${right} correct`)),
        el("span", { class: "chip chip-bad" }, icon("x"), L(`${details.length - right - blank} sai`, `${details.length - right - blank} wrong`)),
        blank ? el("span", { class: "chip" }, L(`${blank} bỏ trống`, `${blank} blank`)) : null,
        el("button", { class: "btn btn-sm", onclick: () => ctx.go(`bank/${kind}/${item.id}`) }, icon("refresh"), L("Làm lại", "Try again")))),
    exp ? null : el("div", { class: "notice notice-info small", style: "margin-top:12px" },
      L("Bài này chưa có lời giải thích chi tiết — bạn vẫn xem được đáp án đúng từng câu. Giải thích đang được bổ sung dần.",
        "Detailed explanations for this test are coming soon — you can still see the correct answer for each question.")),
    el("div", { style: "margin-top:12px" }, chips));

  /* ----- cột trái: bài đọc có tô dẫn chứng ----- */
  const evFirst = new Map();     // số câu -> <mark> đầu tiên
  let paper = null;
  if (inter?.passage) {
    const paras = inter.passage.paras.map((p) => ({ ...p, text: norm(p.text) }));
    const hitsBy = paras.map(() => []);
    for (const [n, e] of Object.entries(E)) {
      for (const q of e.ev || []) {
        const needle = norm(q);
        if (!needle) continue;
        const pi = paras.findIndex((p) => p.text.includes(needle));
        if (pi < 0) continue;
        const start = paras[pi].text.indexOf(needle);
        const hit = { start, end: start + needle.length, n: Number(n) };
        if (hitsBy[pi].some((h) => h.start < hit.end && hit.start < h.end)) continue;   // chồng lên dẫn chứng câu khác
        hitsBy[pi].push(hit);
      }
    }
    const passage = el("div", { class: "cdi-passage" },
      el("h2", {}, inter.passage.title || item.title),
      paras.map((p, i) => {
        const hits = hitsBy[i].sort((a, b) => a.start - b.start);
        return el("div", { class: "cdi-para" + (p.mark ? "" : " plain") },
          p.mark ? el("span", { class: "cdi-mark" }, p.mark) : null, el("div", {}, paraNodes(p.text, hits)));
      }));
    paper = el("div", { class: "cdi-paper rv-paper" }, passage);
    paper.querySelectorAll("mark.ev").forEach((m) => { const n = Number(m.dataset.q); if (!evFirst.has(n)) evFirst.set(n, m); });
  }
  const locate = (n) => {
    const m = evFirst.get(n);
    if (!m) return;
    paper.querySelectorAll("mark.ev.flash").forEach((x) => x.classList.remove("flash"));
    paper.querySelectorAll(`mark.ev[data-q="${n}"]`).forEach((x) => x.classList.add("flash"));
    m.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ----- cột phải: từng câu ----- */
  const cards = details.map((d) => {
    const q = qx.get(d.n) || {};
    const e = E[d.n];
    const state = d.ok ? "ok" : d.given ? "bad" : "blank";
    const card = el("div", { class: `rv-q ${state}`, dataset: { q: d.n } },
      el("div", { class: "rv-q-top" },
        el("span", { class: "rv-num" }, d.n),
        el("div", { class: "rv-q-text" }, q.text || d.question || ""),
        el("span", { class: "chip " + (d.ok ? "chip-ok" : d.given ? "chip-bad" : "") },
          d.ok ? L("Đúng", "Correct") : d.given ? L("Sai", "Wrong") : L("Bỏ trống", "Blank"))),
      el("div", { class: "rv-ans" },
        el("div", {}, el("span", { class: "rv-lbl" }, L("Bạn chọn", "Your answer")),
          el("span", { class: "rv-given" }, d.given ? withOption(d.given, q.options) : L("(bỏ trống)", "(blank)"))),
        d.ok ? null : el("div", {}, el("span", { class: "rv-lbl" }, L("Đáp án", "Answer")),
          el("span", { class: "rv-key" }, withOption(String(d.key).split(" / ")[0], q.options),
            String(d.key).includes(" / ") ? el("span", { class: "tiny muted" }, ` (${L("chấp nhận", "also")}: ${String(d.key).split(" / ").slice(1).join(", ")})`) : null))),
      e?.why ? el("div", { class: "rv-why" }, el("div", { class: "rv-lbl" }, icon("bolt"), L("Giải thích", "Explanation")), el("div", {}, e.why)) : null,
      e?.ev?.length ? el("div", { class: "rv-ev" },
        el("div", { class: "rv-lbl" }, icon("quote"), L("Dẫn chứng", "Evidence"), e.para ? el("span", { class: "tiny muted" }, ` · ${L("đoạn", "paragraph")} ${e.para}`) : null),
        e.ev.map((t) => el("blockquote", {}, `“${t}”`)),
        evFirst.has(d.n) ? el("button", { class: "btn btn-sm", onclick: (ev) => { ev.stopPropagation(); locate(d.n); } }, icon("search"), L("Xem trong bài", "Show in passage")) : null)
        : null);
    card.addEventListener("click", () => locate(d.n));
    return card;
  });
  const list = el("div", { class: "rv-list" }, cards);
  const paint = () => {
    chips.replaceChildren(...[["all", L(`Tất cả (${details.length})`, `All (${details.length})`)], ["wrong", L(`Câu sai (${details.length - right})`, `Wrong (${details.length - right})`)],
      ["right", L(`Câu đúng (${right})`, `Correct (${right})`)]].map(([k, t]) =>
      el("button", { class: "chip-btn" + (filter === k ? " on" : ""), onclick: () => { filter = k; paint(); } }, t)));
    cards.forEach((c, i) => c.classList.toggle("hidden", filter === "wrong" ? details[i].ok : filter === "right" ? !details[i].ok : false));
  };
  paint();

  return el("div", { class: "stack-lg" }, head,
    paper ? el("div", { class: "bank-split cdi-split rv-split" }, paper, el("div", { class: "rv-side" }, list)) : list);
}
