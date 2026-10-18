// Các chế độ học trên một học phần: Flashcards · Learn · Write · Spell · Test · Match
import { el, icon, toast, shuffle, speakText } from "../ui.js";
import { L } from "../i18n.js";
import { meaning } from "../data/vocab.js";
import { addXP } from "../vocab/progress.js";
import { front, back, clip, isCorrect, makeMC, starredIds, toggleStar } from "./cards.js";

export const MODES = [
  { id: "flash", icon: "cards", name: L("Thẻ ghi nhớ", "Flashcards"), desc: L("Lật thẻ, đánh dấu từ đã thuộc", "Flip cards and mark what you know") },
  { id: "learn", icon: "bolt", name: "Learn", desc: L("Trắc nghiệm rồi tự luận, từ sai lặp lại đến khi thuộc", "Choice then typing; missed words repeat until learned") },
  { id: "write", icon: "keyboard", name: "Write", desc: L("Nhìn nghĩa, gõ lại từ", "See the meaning, type the word") },
  { id: "spell", icon: "volume", name: "Spell", desc: L("Nghe đọc, gõ đúng chính tả", "Listen and type the spelling") },
  { id: "test", icon: "exam", name: "Test", desc: L("Bài kiểm tra tự sinh, có chấm điểm", "A generated test with scoring") },
  { id: "match", icon: "puzzle", name: "Match", desc: L("Nối từ với nghĩa, tính giờ", "Match words to meanings against the clock") },
];
export const modeById = (id) => MODES.find((m) => m.id === id);

const speak = (w) => speakText(w.word);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/* ======================= KHUNG + MÀN CÀI ĐẶT ======================= */
export function renderStudy(ctx, modeId, r) {
  const mode = modeById(modeId);
  const root = el("div", { class: "study-page" });
  if (!mode) { root.append(el("div", { class: "notice notice-error" }, L("Không có chế độ này.", "Unknown mode."))); return root; }
  const body = el("div", { class: "study-body" });
  root.append(
    el("div", { class: "game-bar" },
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go(`set/${r.ref}`) }, icon("back"), r.title),
      el("div", { class: "game-title" }, el("span", { class: "game-ico sm" }, icon(mode.icon)), mode.name)),
    body);

  if (r.cards.length < 2) {
    body.append(el("div", { class: "notice notice-warn" }, L("Học phần cần ít nhất 2 thẻ để học.", "A set needs at least 2 cards to study.")));
    return root;
  }
  setup(body, r, mode, (opts) => {
    body.innerHTML = "";
    const cards = opts.starOnly ? r.cards.filter((c) => starredIds(r.ref).has(c.id)) : r.cards;
    const again = () => ctx.go(`study/${modeId}/${r.ref}`, { again: Date.now() });
    ({ flash, learn, write, spell, test, match }[modeId])(body, { ctx, r, cards, pool: r.cards, opts, again });
  });
  return root;
}

function setup(body, r, mode, start) {
  const stars = starredIds(r.ref);
  const opts = { dir: "wd", shuffle: true, starOnly: false, count: Math.min(20, r.cards.length), types: { mc: true, tf: true, match: true, write: true } };
  const row = (label, ...children) => el("div", { class: "setup-row" }, el("div", { class: "setup-label" }, label), el("div", { class: "setup-ctl" }, children));
  const seg = (key, choices) => {
    const wrap = el("div", { class: "seg" });
    const paint = () => [...wrap.children].forEach((b) => b.classList.toggle("on", b.dataset.v === String(opts[key])));
    choices.forEach(([v, label]) => wrap.append(el("button", { type: "button", dataset: { v }, onclick: () => { opts[key] = v; paint(); } }, label)));
    paint();
    return wrap;
  };
  const check = (label, get, set) => {
    const cb = el("input", { type: "checkbox", onchange: () => set(cb.checked) });
    cb.checked = get();
    return el("label", { class: "check" }, cb, label);
  };

  const rows = [];
  if (mode.id === "flash" || mode.id === "write") {
    rows.push(row(mode.id === "write" ? L("Bạn gõ", "You type") : L("Mặt trước", "Front side"),
      seg("dir", mode.id === "write"
        ? [["dw", L("Từ (nhìn nghĩa)", "The word (see meaning)")], ["wd", L("Nghĩa (nhìn từ)", "The meaning (see word)")]]
        : [["wd", L("Từ", "Word")], ["dw", L("Nghĩa", "Meaning")]])));
    if (mode.id === "write") opts.dir = "dw";
  }
  if (mode.id === "flash") rows.push(row(L("Thứ tự", "Order"), check(L("Xáo trộn thẻ", "Shuffle cards"), () => opts.shuffle, (v) => (opts.shuffle = v))));
  if (mode.id === "test") {
    const max = r.cards.length;
    const count = el("input", { type: "number", min: 1, max, value: opts.count, class: "num-input", oninput: () => (opts.count = Math.max(1, Math.min(max, +count.value || 1))) });
    rows.push(row(L("Số câu", "Questions"), count, el("span", { class: "muted small" }, `/ ${max}`)));
    rows.push(row(L("Dạng câu hỏi", "Question types"),
      check(L("Trắc nghiệm", "Multiple choice"), () => opts.types.mc, (v) => (opts.types.mc = v)),
      check(L("Đúng / Sai", "True / False"), () => opts.types.tf, (v) => (opts.types.tf = v)),
      check(L("Nối", "Matching"), () => opts.types.match, (v) => (opts.types.match = v)),
      check(L("Tự luận (gõ từ)", "Written"), () => opts.types.write, (v) => (opts.types.write = v))));
  }
  if (stars.size) rows.push(row(L("Thẻ", "Cards"), check(L(`Chỉ ${stars.size} thẻ gắn sao`, `Only ${stars.size} starred cards`), () => opts.starOnly, (v) => (opts.starOnly = v))));

  if (!rows.length) { start(opts); return; }
  body.append(el("div", { class: "card setup-card" },
    el("h3", {}, mode.name), el("p", { class: "muted" }, mode.desc),
    ...rows,
    el("button", { class: "btn btn-primary btn-lg", onclick: () => {
      if (opts.starOnly && stars.size < 2) { toast(L("Cần ít nhất 2 thẻ gắn sao.", "Star at least 2 cards."), "error"); return; }
      if (mode.id === "test" && !Object.values(opts.types).some(Boolean)) { toast(L("Chọn ít nhất một dạng câu hỏi.", "Pick at least one question type."), "error"); return; }
      start(opts);
    } }, icon("play"), L("Bắt đầu", "Start"))));
}

function summary(body, { title, big, sub, stats = [], actions }) {
  body.innerHTML = "";
  body.append(el("div", { class: "game-over" },
    el("div", { class: "eyebrow" }, title),
    el("div", { class: "big-score" }, big),
    sub ? el("div", { class: "muted" }, sub) : null,
    stats.length ? el("div", { class: "row wrap", style: "gap:8px;justify-content:center" }, stats.map((s) => el("span", { class: "chip" }, s))) : null,
    el("div", { class: "row wrap", style: "gap:10px;justify-content:center;margin-top:10px" }, actions)));
}

/* ======================= FLASHCARDS ======================= */
function flash(body, { ctx, r, cards, opts, again }) {
  let deck = opts.shuffle ? shuffle(cards) : [...cards];
  let i = 0, flipped = false;
  const known = new Set(), learning = new Set();

  const card = el("div", { class: "fc", tabindex: "0", role: "button", "aria-label": L("Lật thẻ", "Flip card"), onclick: () => flip() });
  const bar = el("div", { class: "bar-track" }, el("span"));
  const count = el("div", { class: "muted small center" });
  const star = el("button", { class: "icon-btn", title: L("Gắn sao", "Star"), onclick: (e) => { e.stopPropagation(); toggleStar(r.ref, deck[i].id); paint(); } }, icon("star"));
  const spk = el("button", { class: "icon-btn", title: L("Đọc", "Listen"), onclick: (e) => { e.stopPropagation(); speak(deck[i]); } }, icon("volume"));

  function paint() {
    const w = deck[i];
    flipped = false;
    const showWord = opts.dir === "wd";
    card.classList.remove("flipped");
    card.innerHTML = "";
    const face = (isWord) => el("div", { class: "fc-face" },
      isWord
        ? [el("div", { class: "fc-word" }, w.word), w.ipa ? el("div", { class: "ipa" }, w.ipa) : null, w.pos ? el("div", { class: "muted small" }, w.pos) : null]
        : [el("div", { class: "fc-mean" }, meaning(w)), w.example ? el("div", { class: "fc-ex" }, w.example) : null]);
    card.append(el("div", { class: "fc-side fc-front" }, face(showWord)), el("div", { class: "fc-side fc-back" }, face(!showWord)));
    bar.firstChild.style.width = `${(i / deck.length) * 100}%`;
    count.textContent = `${i + 1} / ${deck.length}`;
    star.classList.toggle("on", starredIds(r.ref).has(w.id));
    if (showWord) speak(w);
  }
  function flip() { flipped = !flipped; card.classList.toggle("flipped", flipped); }
  function go(known_) {
    const w = deck[i];
    (known_ ? known : learning).add(w.id);
    (known_ ? learning : known).delete(w.id);
    if (i + 1 >= deck.length) return done();
    i++; paint();
  }
  function done() {
    addXP(Math.min(30, known.size));
    const missed = deck.filter((w) => learning.has(w.id));
    summary(body, {
      title: L("Hết thẻ", "All done"), big: `${known.size}/${deck.length}`, sub: L("thẻ đã thuộc", "cards known"),
      actions: [
        missed.length ? el("button", { class: "btn btn-primary", onclick: () => { deck = shuffle(missed); i = 0; known.clear(); learning.clear(); body.innerHTML = ""; mount(); paint(); } },
          icon("refresh"), L(`Học lại ${missed.length} thẻ chưa thuộc`, `Review ${missed.length} missed cards`)) : null,
        el("button", { class: "btn", onclick: again }, L("Học lại từ đầu", "Start over")),
      ] });
  }
  function mount() {
    body.append(el("div", { class: "fc-wrap" }, bar, card,
      el("div", { class: "fc-tools" }, star, spk),
      el("div", { class: "fc-actions" },
        el("button", { class: "btn btn-danger btn-lg", onclick: () => go(false) }, icon("x"), L("Chưa thuộc", "Still learning")),
        el("button", { class: "btn btn-teal btn-lg", onclick: () => go(true) }, icon("check"), L("Đã thuộc", "Know it"))),
      el("div", { class: "row", style: "justify-content:center;gap:14px" },
        el("button", { class: "btn btn-ghost btn-sm", disabled: i ? null : "", onclick: () => { if (i) { i--; paint(); } } }, icon("back"), L("Thẻ trước", "Previous")),
        count),
      el("p", { class: "muted small center" }, L("Phím tắt: Space lật · ← chưa thuộc · → đã thuộc", "Keys: Space flip · ← still learning · → know it"))));
  }
  mount(); paint();

  const onKey = (e) => {
    if (!body.isConnected) { document.removeEventListener("keydown", onKey); return; }
    if (e.target.matches("input,textarea")) return;
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); flip(); }
    else if (e.key === "ArrowLeft") go(false);
    else if (e.key === "ArrowRight") go(true);
  };
  document.addEventListener("keydown", onKey);
}

/* ======================= LEARN ======================= */
function learn(body, { r, cards, pool, again }) {
  const level = new Map(cards.map((c) => [c.id, 0]));   // 0 chưa biết · 1 qua trắc nghiệm · 2 đã thuộc
  const misses = new Map();
  const canMC = pool.length >= 4;
  let working = [], last = null, answered = 0, right = 0;

  const bar = el("div", { class: "bar-track" }, el("span"));
  const stage = el("div", { class: "learn-stage" });
  body.append(el("div", { class: "fc-wrap" }, bar, stage));

  const mastered = () => [...level.values()].filter((v) => v >= 2).length;

  function next() {
    bar.firstChild.style.width = `${pct(mastered(), cards.length)}%`;
    if (mastered() === cards.length) return finish();
    working = working.filter((c) => level.get(c.id) < 2);
    if (working.length < 7) {
      const ids = new Set(working.map((c) => c.id));
      working.push(...shuffle(cards.filter((c) => level.get(c.id) < 2 && !ids.has(c.id))).slice(0, 7 - working.length));
    }
    let pick = working.filter((c) => c.id !== last);
    if (!pick.length) pick = working;
    const c = pick[Math.floor(Math.random() * pick.length)];
    last = c.id;
    ask(c);
  }

  function head(c, kind) {
    return el("div", { class: "learn-head" },
      el("span", { class: "chip" }, kind === "mc" ? L("Chọn nghĩa đúng", "Choose the meaning") : L("Gõ lại từ", "Type the word")),
      el("span", { class: "muted small" }, `${mastered()}/${cards.length} ${L("đã thuộc", "learned")}`),
      el("button", { class: "icon-btn", title: L("Đọc", "Listen"), onclick: () => speak(c) }, icon("volume")));
  }

  function ask(c) {
    stage.innerHTML = "";
    if (level.get(c.id) === 0 && canMC) askMC(c); else askWrite(c);
  }

  function feedback(ok, c, extra) {
    answered++; if (ok) right++;
    const lv = level.get(c.id);
    if (ok) level.set(c.id, Math.min(2, lv + 1)); else { level.set(c.id, 0); misses.set(c.id, (misses.get(c.id) || 0) + 1); }
    return extra;
  }

  function askMC(c) {
    const q = makeMC(c, pool, "wd");
    const opts = q.options.map((o, i) => el("button", { class: "opt", onclick: () => pick(i) }, el("span", { class: "opt-n" }, i + 1), clip(o)));
    let done = false;
    function pick(i) {
      if (done) return; done = true;
      const ok = i === q.answer;
      opts[q.answer].classList.add("ok");
      if (!ok) opts[i].classList.add("bad");
      feedback(ok, c);
      if (ok) setTimeout(next, 800);
      else stage.append(el("button", { class: "btn btn-primary", onclick: next }, L("Tiếp tục", "Continue")));
    }
    stage.append(head(c, "mc"), el("div", { class: "q-prompt" }, q.prompt), el("div", { class: "opts" }, opts));
    speak(c);
    const key = (e) => {
      if (!stage.isConnected || done) { document.removeEventListener("keydown", key); return; }
      const n = +e.key; if (n >= 1 && n <= opts.length) pick(n - 1);
    };
    document.addEventListener("keydown", key);
  }

  function askWrite(c) {
    const answer = c.word;
    const input = el("input", { type: "text", class: "type-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: L("Gõ từ tiếng Anh…", "Type the English word…") });
    let done = false;
    function submit() {
      if (done) return;
      if (!input.value.trim()) return;
      done = true;
      const ok = isCorrect(input.value, answer);
      input.disabled = true;
      feedback(ok, c);
      input.classList.add(ok ? "ok" : "bad");
      if (ok) { setTimeout(next, 800); return; }
      stage.append(
        el("div", { class: "reveal" }, L("Đáp án: ", "Answer: "), el("b", {}, answer)),
        el("div", { class: "row", style: "gap:8px" },
          el("button", { class: "btn btn-sm", onclick: () => { level.set(c.id, 1); misses.set(c.id, Math.max(0, (misses.get(c.id) || 1) - 1)); right++; next(); } }, L("Tôi đã đúng", "I was right")),
          el("button", { class: "btn btn-primary", onclick: next }, L("Tiếp tục", "Continue"))));
    }
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    stage.append(head(c, "write"), el("div", { class: "q-prompt" }, meaning(c)), c.example ? el("div", { class: "muted small center" }, c.example.replace(new RegExp(c.word, "ig"), "____")) : null,
      input, el("div", { class: "row", style: "gap:8px;justify-content:center" },
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => { input.value = ""; done = false; input.disabled = false; submit_skip(); } }, L("Không biết", "Don't know")),
        el("button", { class: "btn btn-primary", onclick: submit }, L("Kiểm tra", "Check"))));
    function submit_skip() {
      input.value = "?"; done = false; submit();
    }
    setTimeout(() => input.focus(), 0);
  }

  function finish() {
    addXP(Math.min(50, cards.length * 2));
    const hard = [...misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => cards.find((c) => c.id === id)).filter(Boolean);
    summary(body, {
      title: L("Đã thuộc cả học phần", "You learned the whole set"), big: `${cards.length}/${cards.length}`, sub: L("thẻ đã thuộc", "cards learned"),
      stats: [L(`${pct(right, answered)}% trả lời đúng`, `${pct(right, answered)}% correct`), L(`${answered} lượt trả lời`, `${answered} answers`)],
      actions: [el("button", { class: "btn btn-primary", onclick: again }, icon("refresh"), L("Học lại", "Learn again"))] });
    if (hard.length) body.firstChild.append(el("div", { class: "muted small center" }, L("Từ hay sai: ", "Tricky words: ") + hard.map((c) => c.word).join(", ")));
  }

  next();
}

/* ======================= WRITE ======================= */
function write(body, { cards, opts, again }) {
  const dir = opts.dir;   // "dw": nhìn nghĩa, gõ từ
  let queue = shuffle(cards), wrong = [], total = cards.length, ok = 0, i = 0;
  const bar = el("div", { class: "bar-track" }, el("span"));
  const stage = el("div", { class: "learn-stage" });
  body.append(el("div", { class: "fc-wrap" }, bar, stage));

  function ask() {
    bar.firstChild.style.width = `${pct(i, total)}%`;
    if (!queue.length) {
      if (wrong.length) { queue = shuffle(wrong); wrong = []; } else return finish();
    }
    const c = queue.shift();
    stage.innerHTML = "";
    const expected = back(c, dir);
    const input = el("input", { type: "text", class: "type-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
      placeholder: dir === "dw" ? L("Gõ từ tiếng Anh…", "Type the English word…") : L("Gõ nghĩa…", "Type the meaning…") });
    let done = false;
    const submit = (skip) => {
      if (done) return;
      if (!skip && !input.value.trim()) return;
      done = true; input.disabled = true;
      const good = !skip && isCorrect(input.value, expected);
      input.classList.add(good ? "ok" : "bad");
      if (good) { ok++; i++; setTimeout(ask, 700); return; }
      wrong.push(c);
      stage.append(el("div", { class: "reveal" }, L("Đáp án: ", "Answer: "), el("b", {}, expected)),
        el("div", { class: "row", style: "gap:8px" },
          el("button", { class: "btn btn-sm", onclick: () => { wrong.pop(); ok++; i++; ask(); } }, L("Tôi đã đúng", "I was right")),
          el("button", { class: "btn btn-primary", onclick: () => { ask(); } }, L("Tiếp tục", "Continue"))));
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(false); });
    stage.append(el("div", { class: "learn-head" }, el("span", { class: "chip" }, `${i + 1}/${total}`), c.pos ? el("span", { class: "muted small" }, c.pos) : null),
      el("div", { class: "q-prompt" }, front(c, dir)), input,
      el("div", { class: "row", style: "gap:8px;justify-content:center" },
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => submit(true) }, L("Không biết", "Don't know")),
        el("button", { class: "btn btn-primary", onclick: () => submit(false) }, L("Kiểm tra", "Check"))));
    setTimeout(() => input.focus(), 0);
  }
  function finish() {
    addXP(Math.min(40, ok));
    summary(body, { title: L("Hoàn thành", "Finished"), big: `${total}/${total}`, sub: L("thẻ đã gõ đúng", "cards typed correctly"),
      actions: [el("button", { class: "btn btn-primary", onclick: again }, icon("refresh"), L("Làm lại", "Again"))] });
  }
  ask();
}

/* ======================= SPELL ======================= */
function spell(body, { cards, again }) {
  let queue = shuffle(cards), wrong = [], total = cards.length, i = 0, firstTry = 0;
  const bar = el("div", { class: "bar-track" }, el("span"));
  const stage = el("div", { class: "learn-stage" });
  body.append(el("div", { class: "fc-wrap" }, bar, stage));
  if (!("speechSynthesis" in window)) body.prepend(el("div", { class: "notice notice-warn" }, L("Trình duyệt này không đọc to được; hãy nhìn nghĩa để đoán từ.", "This browser can't read aloud; use the meaning as a clue.")));

  function ask() {
    bar.firstChild.style.width = `${pct(i, total)}%`;
    if (!queue.length) { if (wrong.length) { queue = shuffle(wrong); wrong = []; } else return finish(); }
    const c = queue.shift();
    stage.innerHTML = "";
    let tries = 0, done = false;
    const input = el("input", { type: "text", class: "type-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: L("Gõ lại từ bạn nghe…", "Type what you hear…") });
    const hint = el("div", { class: "muted small center" }, L("Nghĩa: ", "Meaning: "), meaning(c));
    const finishCard = (good) => {
      done = true; input.disabled = true;
      if (good) { if (tries === 0) firstTry++; i++; input.classList.add("ok"); setTimeout(ask, 700); return; }
      wrong.push(c);
      stage.append(el("div", { class: "reveal" }, L("Đáp án: ", "Answer: "), el("b", {}, c.word)),
        el("button", { class: "btn btn-primary", onclick: ask }, L("Tiếp tục", "Continue")));
    };
    const submit = () => {
      if (done || !input.value.trim()) return;
      if (isCorrect(input.value, c.word)) return finishCard(true);
      tries++;
      input.classList.add("bad"); setTimeout(() => input.classList.remove("bad"), 500);
      if (tries >= 2) finishCard(false);
      else { toast(L("Chưa đúng, thử lại một lần nữa.", "Not quite, try once more."), "error", 1800); input.select(); }
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    stage.append(el("div", { class: "learn-head" }, el("span", { class: "chip" }, `${i + 1}/${total}`)),
      el("div", { class: "row", style: "gap:10px;justify-content:center" },
        el("button", { class: "btn btn-lg", onclick: () => speakText(c.word) }, icon("volume"), L("Nghe", "Listen")),
        el("button", { class: "btn", onclick: () => speakText(c.word, { rate: 0.5 }) }, L("Nghe chậm", "Slow"))),
      hint, input,
      el("div", { class: "row", style: "gap:8px;justify-content:center" },
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => { if (!done) finishCard(false); } }, L("Không biết", "Don't know")),
        el("button", { class: "btn btn-primary", onclick: submit }, L("Kiểm tra", "Check"))));
    setTimeout(() => { speakText(c.word); input.focus(); }, 150);
  }
  function finish() {
    addXP(Math.min(40, firstTry));
    summary(body, { title: L("Hoàn thành", "Finished"), big: `${firstTry}/${total}`, sub: L("từ đúng ngay lần đầu", "spelled right first time"),
      actions: [el("button", { class: "btn btn-primary", onclick: again }, icon("refresh"), L("Làm lại", "Again"))] });
  }
  ask();
}

/* ======================= TEST ======================= */
function test(body, { cards, pool, opts, again }) {
  const types = Object.entries(opts.types).filter(([, v]) => v).map(([k]) => k).filter((k) => (k !== "mc" || pool.length >= 3));
  if (!types.length) types.push("write");
  const n = Math.min(opts.count, cards.length);
  const picked = shuffle(cards).slice(0, n);

  // chia câu cho các dạng; "nối" lấy một nhóm tối đa 6 thẻ
  const groups = { tf: [], mc: [], match: [], write: [] };
  const matchSize = types.includes("match") ? Math.min(6, Math.max(2, Math.floor(n / types.length))) : 0;
  const rest = [...picked];
  if (matchSize && rest.length >= matchSize + 0) groups.match = rest.splice(0, matchSize);
  const others = types.filter((t) => t !== "match");
  rest.forEach((c, k) => groups[others.length ? others[k % others.length] : "write"].push(c));

  const items = [];   // { kind, c, ... , check() -> bool, node }
  const sections = [];
  const section = (title, nodes) => { if (nodes.length) sections.push(el("section", { class: "card test-sec" }, el("h3", {}, title), ...nodes)); };

  const mark = (it) => it.node.classList.add(it.ok ? "t-ok" : "t-bad");

  // Đúng / Sai
  section(L("Đúng hay sai", "True or false"), groups.tf.map((c) => {
    const real = Math.random() < 0.5;
    const other = shuffle(pool.filter((w) => w.id !== c.id && meaning(w) !== meaning(c)))[0] || c;
    const shown = real ? meaning(c) : meaning(other);
    const it = { c, real, val: null };
    const bs = [[true, L("Đúng", "True")], [false, L("Sai", "False")]].map(([v, t]) =>
      el("button", { type: "button", class: "opt", onclick: () => { it.val = v; bs.forEach((b) => b.classList.toggle("sel", b === bs[v ? 0 : 1])); } }, t));
    it.node = el("div", { class: "t-q" }, el("div", { class: "t-pair" }, el("b", {}, c.word), el("span", {}, " = "), el("span", {}, clip(shown))), el("div", { class: "row", style: "gap:8px" }, bs));
    it.grade = () => { it.ok = it.val === real; it.show = real ? "" : `${c.word} = ${meaning(c)}`; return it.ok; };
    items.push(it); return it.node;
  }));

  // Trắc nghiệm
  section(L("Trắc nghiệm", "Multiple choice"), groups.mc.map((c) => {
    const q = makeMC(c, pool, Math.random() < 0.7 ? "wd" : "dw");
    const it = { c, val: -1 };
    const bs = q.options.map((o, i) => el("button", { type: "button", class: "opt", onclick: () => { it.val = i; bs.forEach((b, k) => b.classList.toggle("sel", k === i)); } }, el("span", { class: "opt-n" }, i + 1), clip(o)));
    it.node = el("div", { class: "t-q" }, el("div", { class: "q-prompt left" }, q.prompt), el("div", { class: "opts" }, bs));
    it.grade = () => { it.ok = it.val === q.answer; it.show = q.options[q.answer]; bs[q.answer].classList.add("ok"); if (!it.ok && it.val >= 0) bs[it.val].classList.add("bad"); return it.ok; };
    items.push(it); return it.node;
  }));

  // Nối
  if (groups.match.length) {
    const defs = shuffle(groups.match);
    const selects = groups.match.map((c) => {
      const sel = el("select", {}, el("option", { value: "" }, "—"), defs.map((d, i) => el("option", { value: d.id }, clip(meaning(d), 70))));
      const it = { c, sel };
      it.node = el("div", { class: "t-q t-match" }, el("b", { style: "min-width:120px" }, c.word), sel);
      it.grade = () => { it.ok = sel.value === c.id; it.show = meaning(c); return it.ok; };
      items.push(it); return it.node;
    });
    section(L("Nối từ với nghĩa", "Matching"), selects);
  }

  // Tự luận
  section(L("Tự luận — gõ từ tiếng Anh", "Written — type the English word"), groups.write.map((c) => {
    const input = el("input", { type: "text", class: "type-input small", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: L("Gõ từ…", "Type the word…") });
    const it = { c, input };
    it.node = el("div", { class: "t-q" }, el("div", { class: "q-prompt left" }, meaning(c)), input);
    it.grade = () => { it.ok = isCorrect(input.value, c.word); it.show = c.word; input.disabled = true; return it.ok; };
    items.push(it); return it.node;
  }));

  const submit = el("button", { class: "btn btn-primary btn-lg", onclick: grade }, icon("check"), L("Nộp bài", "Submit test"));
  const result = el("div");
  body.append(el("div", { class: "test-wrap" }, result, ...sections, submit));

  function grade() {
    let ok = 0;
    items.forEach((it) => { if (it.grade()) ok++; mark(it); if (!it.ok && it.show) it.node.append(el("div", { class: "reveal" }, L("Đáp án: ", "Answer: "), el("b", {}, it.show))); });
    items.forEach((it) => it.node.querySelectorAll("button,select").forEach((b) => (b.disabled = true)));
    submit.remove();
    addXP(Math.min(60, ok * 2));
    const wrongCards = items.filter((it) => !it.ok).map((it) => it.c);
    result.append(el("div", { class: "test-score" },
      el("div", { class: "big-score" }, `${pct(ok, items.length)}%`),
      el("div", { class: "muted" }, L(`${ok}/${items.length} câu đúng`, `${ok}/${items.length} correct`)),
      el("div", { class: "row wrap", style: "gap:10px;justify-content:center;margin-top:8px" },
        el("button", { class: "btn btn-primary", onclick: again }, icon("refresh"), L("Làm bài mới", "New test")),
        wrongCards.length ? el("span", { class: "muted small" }, L(`${wrongCards.length} câu sai — xem đáp án bên dưới`, `${wrongCards.length} wrong — see answers below`)) : null)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/* ======================= MATCH ======================= */
function match(body, { r, cards, again }) {
  const size = Math.min(6, cards.length);
  const BEST = `ielts:sets:matchbest:${r.ref}`;
  const set = shuffle(cards).slice(0, size);
  const tiles = shuffle(set.flatMap((c) => [{ id: c.id, text: c.word, side: "w" }, { id: c.id, text: clip(meaning(c), 60), side: "m" }]));
  let sel = null, left = size, mistakes = 0, started = 0, timerId = 0;
  const clock = el("b", {}, "0.0");
  const board = el("div", { class: "match-grid" });

  tiles.forEach((t) => {
    const b = el("button", { class: "tile" + (t.side === "w" ? " word" : ""), onclick: () => click(b, t) }, t.text);
    t.node = b; board.append(b);
  });
  body.append(el("div", { class: "fc-wrap wide" },
    el("div", { class: "row", style: "justify-content:center;gap:10px" },
      el("div", { class: "score-pill timer-pill" }, icon("clock"), clock),
      el("div", { class: "muted small" }, L("Nối từ với nghĩa. Bấm ô đầu tiên để bắt đầu tính giờ.", "Match words with meanings. The clock starts on your first tap."))),
    board));

  function click(b, t) {
    if (b.classList.contains("gone")) return;
    if (!started) { started = performance.now(); timerId = setInterval(() => { if (!body.isConnected) clearInterval(timerId); clock.textContent = ((performance.now() - started) / 1000).toFixed(1); }, 100); }
    if (t.side === "w") speak({ word: t.text });
    if (!sel) { sel = { b, t }; b.classList.add("sel"); return; }
    if (sel.b === b) { b.classList.remove("sel"); sel = null; return; }
    const a = sel; sel = null;
    if (a.t.id === t.id && a.t.side !== t.side) {
      [a.b, b].forEach((x) => { x.classList.remove("sel"); x.classList.add("ok"); setTimeout(() => x.classList.add("gone"), 300); });
      if (--left === 0) setTimeout(finish, 600);
    } else {
      mistakes++;
      [a.b, b].forEach((x) => { x.classList.add("bad"); setTimeout(() => x.classList.remove("bad", "sel"), 420); });
    }
  }
  function finish() {
    clearInterval(timerId);
    const secs = (performance.now() - started) / 1000 + mistakes * 1;   // mỗi lần nối sai +1 giây
    let best = +localStorage.getItem(BEST) || 0;
    const isBest = !best || secs < best;
    if (isBest) { best = secs; try { localStorage.setItem(BEST, String(secs)); } catch { /* bỏ qua */ } }
    addXP(10);
    summary(body, { title: L("Xong rồi!", "Done!"), big: `${secs.toFixed(1)}s`, sub: mistakes ? L(`gồm ${mistakes} giây phạt vì nối sai`, `includes ${mistakes}s penalty for misses`) : L("không sai lần nào", "no mistakes"),
      stats: [isBest ? L("Kỷ lục mới!", "New best!") : L(`Kỷ lục: ${best.toFixed(1)}s`, `Best: ${best.toFixed(1)}s`)],
      actions: [el("button", { class: "btn btn-primary", onclick: again }, icon("refresh"), L("Chơi lại", "Play again"))] });
  }
}
