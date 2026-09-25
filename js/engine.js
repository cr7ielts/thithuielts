// Bộ dựng câu hỏi + chấm điểm dùng chung cho Listening và Reading
import { el, escapeHtml } from "./ui.js";
import { L } from "./i18n.js";

/* ---------- Chuẩn hoá đáp án trước khi so sánh ---------- */
export function normalize(v) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.,;:!?"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrect(given, accepted) {
  const g = normalize(given);
  if (!g) return false;
  return accepted.some((a) => {
    const n = normalize(a);
    // chấp nhận thừa mạo từ đứng đầu: "the hartley" ~ "hartley"
    return g === n || g === `the ${n}` || `the ${g}` === n || g === `a ${n}` || `a ${g}` === n;
  });
}

/* ---------- Đếm tổng số câu ---------- */
export function countQuestions(groups) {
  return groups.reduce((sum, g) => sum + g.questions.length, 0);
}

export function allQuestionNumbers(groups) {
  return groups.flatMap((g) => g.questions.map((q) => q.n));
}

/* ---------- Dựng giao diện một nhóm câu hỏi ----------
   answers: object dùng chung { [n]: value } — sửa trực tiếp khi người dùng nhập
   onChange: gọi lại sau mỗi lần thay đổi (để cập nhật ô đánh dấu tiến độ)
---------------------------------------------------------------- */
export function renderGroup(group, answers, onChange) {
  const wrap = el("div", { class: "qgroup" });
  wrap.append(el("div", { class: "qgroup-title" }, group.title));
  if (group.instruction) wrap.append(el("div", { class: "qgroup-instr", html: group.instruction }));
  if (group.bank?.length) {
    wrap.append(
      el("div", { class: "option-bank" }, group.bank.map((b) => el("div", {}, b)))
    );
  }

  for (const q of group.questions) {
    const body = el("div", { class: "qbody" });
    const setVal = (v) => { answers[q.n] = v; onChange?.(q.n, v); };

    if (group.type === "gap") {
      const input = el("input", {
        type: "text", class: "gap-input", "aria-label": L(`Câu ${q.n}`, `Question ${q.n}`),
        value: answers[q.n] ?? "",
        oninput: (e) => setVal(e.target.value),
      });
      const parts = String(q.text).split("____");
      const line = el("div", { class: "qtext" });
      parts.forEach((p, i) => {
        line.append(document.createTextNode(p));
        if (i < parts.length - 1) line.append(input);
      });
      if (parts.length === 1) line.append(document.createTextNode(" "), input);
      body.append(line);

    } else if (group.type === "mcq" || group.type === "mcq-multi") {
      body.append(el("div", { class: "qtext", html: escapeHtml(q.text) }));
      const multi = group.type === "mcq-multi";
      const choices = el("div", { class: "choices" });
      for (const c of q.choices) {
        const checked = multi
          ? (answers[q.n] || []).includes(c.v)
          : answers[q.n] === c.v;
        const input = el("input", {
          type: multi ? "checkbox" : "radio",
          name: `q${q.n}`, value: c.v, checked: checked || null,
          onchange: (e) => {
            if (multi) {
              const cur = new Set(answers[q.n] || []);
              e.target.checked ? cur.add(c.v) : cur.delete(c.v);
              setVal([...cur]);
            } else {
              setVal(c.v);
            }
          },
        });
        choices.append(el("label", { class: "choice" }, input, el("span", {}, `${c.v}. ${c.t}`)));
      }
      body.append(choices);

    } else if (group.type === "tfng" || group.type === "ynng") {
      const opts = group.type === "tfng"
        ? ["TRUE", "FALSE", "NOT GIVEN"]
        : ["YES", "NO", "NOT GIVEN"];
      body.append(el("div", { class: "qtext", html: escapeHtml(q.text) }));
      const sel = el(
        "select",
        { class: "pick", "aria-label": L(`Câu ${q.n}`, `Question ${q.n}`), onchange: (e) => setVal(e.target.value) },
        el("option", { value: "" }, L("— chọn —", "— choose —")),
        opts.map((o) => el("option", { value: o, selected: answers[q.n] === o || null }, o))
      );
      body.append(sel);

    } else if (group.type === "matching") {
      const parts = String(q.text).split("____");
      const sel = el(
        "select",
        { class: "pick", "aria-label": L(`Câu ${q.n}`, `Question ${q.n}`), onchange: (e) => setVal(e.target.value) },
        el("option", { value: "" }, "—"),
        group.choices.map((o) => el("option", { value: o, selected: answers[q.n] === o || null }, o))
      );
      const line = el("div", { class: "qtext" });
      parts.forEach((p, i) => {
        line.append(document.createTextNode(p));
        if (i < parts.length - 1) line.append(sel);
      });
      if (parts.length === 1) line.append(document.createTextNode(" "), sel);
      body.append(line);
    }

    wrap.append(
      el("div", { class: "q", id: `q-${q.n}` }, el("div", { class: "qnum" }, q.n), body)
    );
  }
  return wrap;
}

/* ---------- Chấm điểm ---------- */
export function grade(groups, answers) {
  const details = [];
  let correct = 0;
  for (const g of groups) {
    for (const q of g.questions) {
      const given = answers[q.n];
      const ok = Array.isArray(given)
        ? given.length === q.answer.length && given.every((v) => q.answer.includes(v))
        : isCorrect(given, q.answer);
      if (ok) correct++;
      details.push({
        n: q.n,
        question: q.text,
        given: Array.isArray(given) ? given.join(", ") : (given ?? ""),
        key: q.answer.join(" / "),
        ok,
      });
    }
  }
  return { correct, total: details.length, details };
}

export function rawToBand(raw, table) {
  for (const [min, band] of table) if (raw >= min) return band;
  return 0;
}

/* ---------- Ô đánh dấu tiến độ ---------- */
export function progressDots(numbers, answers) {
  const host = el("div", { class: "progress-dots" });
  const update = () => {
    for (const btn of host.children) {
      const n = Number(btn.dataset.n);
      const v = answers[n];
      const filled = Array.isArray(v) ? v.length > 0 : String(v ?? "").trim() !== "";
      btn.classList.toggle("done", filled);
    }
  };
  for (const n of numbers) {
    host.append(
      el("button", {
        class: "qdot", dataset: { n }, type: "button", title: L(`Tới câu ${n}`, `Go to question ${n}`),
        onclick: () => {
          const target = document.getElementById(`q-${n}`);
          target?.scrollIntoView({ behavior: "smooth", block: "center" });
          target?.querySelector("input,select")?.focus();
        },
      }, n)
    );
  }
  host.update = update;
  update();
  return host;
}

export function countWords(text) {
  const t = String(text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
