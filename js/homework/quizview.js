// Giao diện làm bài / xem kết quả cho bài kiểm tra dựng từ file Word (quizdoc.js)
import { el } from "../ui.js";
import { L } from "../i18n.js";

const GAP = /(_{3,}|\.{6,}|…{2,})/;

/** chữ có "____": hiện khoảng trống thành vạch gạch đẹp hơn */
function withBlanks(text) {
  return String(text).split(GAP).filter((x) => x !== "").map((p) => (GAP.test(p) ? el("span", { class: "qz-blank" }) : p));
}

/**
 * quiz: dữ liệu từ parseQuiz · answers: { [n]: chuỗi } (sửa trực tiếp) · onChange()
 * res (khi xem kết quả): { byN: Map n → {ok, key, kind}, why: Map n → chữ, sample: Map n → chữ, showKey }
 */
export function quizView(quiz, answers, onChange, res = null) {
  const lock = !!res;
  const set = (n, v) => { answers[n] = v; onChange?.(); };
  const mark = (n) => (res ? res.byN.get(n) : null);
  const cls = (n) => { const d = mark(n); return !d ? "" : d.ok === true ? " ok" : d.ok === false ? " bad" : " free"; };
  const feedback = (n) => {
    if (!res) return null;
    const d = mark(n) || {};
    const why = res.why?.get(n), sample = res.sample?.get(n);
    const parts = [];
    if (d.ok === false && res.showKey && d.key) parts.push(el("div", {}, el("span", { class: "qz-lbl" }, L("Đáp án: ", "Answer: ")), el("strong", { class: "ans-key" }, d.key)));
    if (d.kind === "free") parts.push(el("div", { class: "tiny muted" }, L("Câu này giáo viên chấm.", "Your teacher marks this one.")));
    if (res.showKey && sample) parts.push(el("div", {}, el("span", { class: "qz-lbl" }, L("Câu mẫu: ", "Model answer: ")), sample));
    if (res.showKey && why) parts.push(el("div", { class: "qz-why" }, why));
    return parts.length ? el("div", { class: "qz-fb" }, parts) : null;
  };

  const control = (q) => {
    const v = answers[q.n] ?? "";
    if (q.kind === "mcq" || q.kind === "choice") {
      const btns = q.options.map((o) => {
        const b = el("button", { type: "button", class: "qz-opt" + (v === o.v ? " on" : ""), disabled: lock ? "" : null },
          q.kind === "mcq" ? [el("span", { class: "qz-letter" }, o.v), o.t] : o.t);
        b.onclick = () => { btns.forEach((x) => x.classList.remove("on")); b.classList.add("on"); set(q.n, o.v); };
        return b;
      });
      return el("div", { class: "qz-opts" + (q.kind === "choice" ? " row" : "") }, btns);
    }
    if (q.kind === "free") {
      const ta = el("textarea", { class: "qz-free", rows: 3, placeholder: L("Viết câu của bạn…", "Write your sentence…"), disabled: lock ? "" : null });
      ta.value = v; ta.oninput = () => set(q.n, ta.value);
      return ta;
    }
    const inp = el("input", { type: "text", class: "qz-input", value: v, autocomplete: "off", spellcheck: "false", disabled: lock ? "" : null,
      placeholder: L("Câu trả lời", "Your answer") });
    inp.oninput = () => set(q.n, inp.value);
    return inp;
  };

  const gapControl = (n, kind, bank) => {
    const v = answers[n] ?? "";
    if (kind === "bank" && bank?.length) {
      const sel = el("select", { class: "qz-sel" + cls(n), disabled: lock ? "" : null },
        el("option", { value: "" }, `(${n})`), bank.map((o) => el("option", { value: o.v, selected: v === o.v ? "" : null }, `${o.v}. ${o.t}`)));
      sel.onchange = () => set(n, sel.value);
      return sel;
    }
    const inp = el("input", { type: "text", class: "qz-gap" + cls(n), value: v, placeholder: `(${n})`, autocomplete: "off", disabled: lock ? "" : null });
    inp.oninput = () => set(n, inp.value);
    return inp;
  };

  const out = [];
  for (const it of quiz.items) {
    if (it.t === "part") out.push(el("h2", { class: "qz-part" }, it.text));
    else if (it.t === "head") out.push(el("div", { class: "qz-head" }, it.text));
    else if (it.t === "text") out.push(el("p", { class: "qz-text" }, it.text));
    else if (it.t === "passage") {
      out.push(el("div", { class: "qz-passage" }, it.title ? el("h3", {}, it.title) : null,
        it.paras.map((p) => el("p", {}, p.label ? el("strong", { class: "qz-plabel" }, p.label) : null, p.text))));
    } else if (it.t === "bank") {
      out.push(el("div", { class: "qz-bank" }, it.options.map((o) => el("span", {}, el("strong", {}, o.v), " ", o.t))));
    } else if (it.t === "gaptext") {
      const nodes = it.text.split(/(\{\{\d+\}\})/).filter(Boolean).map((p) => {
        const m = /^\{\{(\d+)\}\}$/.exec(p);
        return m ? gapControl(+m[1], it.gaps[m[1]], it.bank) : p;
      });
      out.push(el("p", { class: "qz-gaptext" }, nodes));
      if (res) for (const n of Object.keys(it.gaps)) { const f = feedback(+n); if (f) out.push(el("div", { class: "qz-gapfb" }, el("span", { class: "qnum" }, n), f)); }
    } else if (it.t === "q") {
      out.push(el("div", { class: "qz-q" + cls(it.n), dataset: { q: it.n } },
        el("div", { class: "qz-qhead" }, el("span", { class: "qnum" }, it.n), el("div", { class: "qz-qtext" }, withBlanks(it.text))),
        it.extra.length ? el("div", { class: "qz-extra" }, it.extra.map((x) =>
          /^[A-Z][A-Z' -]{2,}$/.test(x) ? el("div", { class: "qz-keyword" }, x) : el("div", {}, withBlanks(x)))) : null,
        control(it), feedback(it.n)));
    }
  }
  return el("div", { class: "qz" }, out);
}
