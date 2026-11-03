// Giao diện một câu hỏi (trắc nghiệm hoặc gõ) do qgen.js sinh ra — dùng cho Learn, Write, Test của Học phần.
import { el, icon, speakText } from "../ui.js";
import { L } from "../i18n.js";
import { clip } from "./cards.js";
import { checkTyped } from "./qgen.js";

const LEVEL_LABEL = [L("Dễ", "Easy"), L("Vừa", "Medium"), L("Khó", "Hard"), L("Rất khó", "Very hard"), L("Rất khó", "Very hard")];

/** Vẽ đầu câu: nhãn dạng câu + mức khó + nút nghe */
export function qHead(q, right = null) {
  return el("div", { class: "learn-head" },
    el("span", { class: "chip" }, q.label),
    el("span", { class: `chip lvl-${Math.min(3, q.level)}` }, LEVEL_LABEL[q.level] || ""),
    right,
    el("button", { class: "icon-btn", title: L("Nghe từ", "Listen"), onclick: () => speakText(q.card.word) }, icon("volume")));
}

const promptNode = (q) => el("div", { class: "q-prompt" + (q.prompt.length > 60 ? " long" : "") },
  q.prompt.includes("_____") ? q.prompt.split("_____").flatMap((p, i) => (i ? [el("span", { class: "gap" }, "_____"), p] : [p])) : q.prompt);

/**
 * Hỏi một câu trong `stage`. done(ok) được gọi khi học sinh bấm tiếp (hoặc tự chuyển khi đúng).
 * Trả hàm huỷ phím tắt.
 */
export function askQuestion(stage, q, done, { head = null } = {}) {
  stage.innerHTML = "";
  let finished = false;
  const finish = (ok) => { if (!finished) { finished = true; document.removeEventListener("keydown", key); done(ok); } };
  const after = (ok, answerText) => {
    if (ok) { setTimeout(() => finish(true), 850); return; }
    stage.append(
      el("div", { class: "reveal" }, L("Đáp án: ", "Answer: "), el("b", {}, answerText), q.explain ? el("div", { class: "small muted", style: "margin-top:6px" }, q.explain) : null),
      el("div", { class: "row", style: "gap:8px;justify-content:center" },
        q.accept ? el("button", { class: "btn btn-sm", onclick: () => finish(true) }, L("Tôi đã đúng", "I was right")) : null,
        el("button", { class: "btn btn-primary", onclick: () => finish(false) }, L("Tiếp tục", "Continue"))));
  };
  stage.append(head || qHead(q), promptNode(q), q.sub ? el("div", { class: "muted center" }, q.sub) : null);

  let key = () => {};
  if (q.options) {
    let picked = false;
    const bs = q.options.map((o, i) => el("button", { class: "opt", onclick: () => pick(i) }, el("span", { class: "opt-n" }, i + 1), clip(o)));
    function pick(i) {
      if (picked) return; picked = true;
      const ok = i === q.answer;
      bs[q.answer].classList.add("ok");
      if (!ok) bs[i].classList.add("bad");
      if (ok && q.explain) stage.append(el("div", { class: "small muted center" }, q.explain));
      after(ok, q.options[q.answer]);
    }
    stage.append(el("div", { class: "opts" }, bs));
    key = (e) => { if (!stage.isConnected) return document.removeEventListener("keydown", key); const n = +e.key; if (!picked && n >= 1 && n <= bs.length) pick(n - 1); };
    if (q.speak) speakText(q.speak);
  } else {
    const input = el("input", { type: "text", class: "type-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: L("Gõ câu trả lời…", "Type your answer…") });
    const hint = el("div", { class: "muted small center hint-line" });
    let tries = 0, hinted = false, locked = false;
    const submit = (skip = false) => {
      if (locked) return;
      if (!skip && !input.value.trim()) return;
      const r = skip ? "bad" : checkTyped(input.value, q.accept);
      if (r === "close" && tries === 0) {
        tries++; input.classList.add("bad"); setTimeout(() => input.classList.remove("bad"), 500);
        hint.textContent = L("Gần đúng rồi, kiểm tra lại chính tả!", "So close — check your spelling!");
        return;
      }
      locked = true; input.disabled = true;
      const ok = r === "ok" && !hinted ? true : r === "ok";
      input.classList.add(ok ? "ok" : "bad");
      after(ok, q.accept);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    stage.append(input, hint, el("div", { class: "row", style: "gap:8px;justify-content:center" },
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => { hinted = true; hint.textContent = L("Gợi ý: ", "Hint: ") + q.hint; } }, L("Gợi ý", "Hint")),
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => submit(true) }, L("Không biết", "Don't know")),
      el("button", { class: "btn btn-primary", onclick: () => submit() }, L("Kiểm tra", "Check"))));
    setTimeout(() => input.focus(), 0);
  }
  document.addEventListener("keydown", key);
  return () => document.removeEventListener("keydown", key);
}
