// Trò chơi từ vựng: Ghép cặp · Mưa chữ · Đánh vần · Trắc nghiệm tốc độ · Đoán chữ
// (+ liên kết tới trò chơi chữ: Idioms & Puns ở js/wordplay/)
import { el, icon, toast, speakText, shuffle } from "../ui.js";
import { createCat, praise, comfort } from "../cat.js";
import { DECKS, ALL_WORDS, meaning } from "../data/vocab.js";
import { poolFor, recordGame, bestScore, savedWords } from "./progress.js";
import { L } from "../i18n.js";

export const GAMES = [
  { id: "match", name: L("Ghép cặp", "Word Match"), icon: "grid", color: "#7c8cf0",
    desc: L("Nối từ tiếng Anh với nghĩa đúng trước khi hết 60 giây. Xoá sạch bàn được cộng thêm giờ.",
            "Match each word to its meaning before 60 seconds run out. Clear the board for bonus time.") },
  { id: "rain", name: L("Mưa chữ", "Word Rain"), icon: "rain", color: "#5aa6d6",
    desc: L("Nghĩa rơi xuống — gõ đúng từ tiếng Anh trước khi nó chạm đất. Có 3 mạng.",
            "Meanings fall from the sky — type the English word before they land. You have 3 lives.") },
  { id: "spell", name: L("Đánh vần", "Spelling Bee"), icon: "volume", color: "#4fb58c",
    desc: L("Nghe Mochi đọc rồi gõ lại từ cho đúng chính tả. 10 lượt, dùng gợi ý sẽ bị trừ điểm.",
            "Listen to Mochi and type the word with perfect spelling. 10 rounds; hints cost points.") },
  { id: "quiz", name: L("Trắc nghiệm tốc độ", "Speed Quiz"), icon: "bolt", color: "#e0a24a",
    desc: L("Chọn nghĩa đúng trước khi cuộn len lăn tới chỗ Mochi. Trả lời liên tiếp để nhân điểm.",
            "Pick the right meaning before the ball of yarn reaches Mochi. Answer in a row to multiply points.") },
  { id: "guess", name: L("Đoán chữ", "Word Guess"), icon: "puzzle", color: "#a98bd8",
    desc: L("Đọc nghĩa, đoán từ trong 6 lần với gợi ý màu: xanh đúng chỗ, vàng có trong từ.",
            "Read the meaning and guess the word in 6 tries: green is the right spot, yellow is in the word.") },
];

/** Trò chơi chữ (idioms, puns) — trang riêng, nhưng hiện chung ở trang Trò chơi */
export const WORDPLAY_GAMES = [
  { id: "idiom-meaning", name: L("Đoán nghĩa thành ngữ", "Idiom Guess"), icon: "quote", color: "#e27d6a", route: "idioms/play/meaning",
    desc: L("Đọc thành ngữ trong câu, đoán xem nó thật sự có nghĩa là gì.", "Read an idiom in context and guess what it really means.") },
  { id: "idiom-missing", name: L("Điền từ thành ngữ", "Missing Word"), icon: "keyboard", color: "#d9a13b", route: "idioms/play/missing",
    desc: L("Thành ngữ bị mất một từ — chọn từ đúng để hoàn thành.", "One word is missing from each idiom — pick the one that completes it.") },
  { id: "pun-detective", name: L("Thám tử chơi chữ", "Pun Detective"), icon: "search", color: "#5b9bd0", route: "puns/play",
    desc: L("Tìm từ tạo nên câu đùa, rồi xem vì sao nó buồn cười.", "Find the word that makes the joke, then see why it's funny.") },
];

const SOURCES = () => [
  { id: "all", label: L("Tất cả từ", "All words") },
  { id: "saved", label: `${L("Sổ từ", "Word bank")} (${savedWords().length})` },
  { id: "learning", label: L("Từ đang học", "Words I'm learning") },
  ...DECKS.map((d) => ({ id: d.id, label: d.title })),
];

const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ").replace(/[‘’]/g, "'");

/* ======================= HUB ======================= */
export function renderGamesHub(ctx, preset = "all") {
  let source = preset;
  const select = el("select", { id: "game-source", class: "pick" },
    SOURCES().map((s) => el("option", { value: s.id, selected: s.id === source ? "" : null }, s.label)));
  select.onchange = () => { source = select.value; countNote.textContent = poolNote(source); };
  const countNote = el("span", { class: "muted small" }, poolNote(source));

  const cat = createCat({ size: 130, mood: "idle", say: L("Chơi 5 phút, nhớ cả tuần!", "Play for 5 minutes, remember all week!"), bubbleSide: "left" });

  return el("div", { class: "stack-lg" },
    el("section", { class: "games-hero" },
      el("div", { style: "flex:1;min-width:260px" },
        el("div", { class: "eyebrow" }, L("Chơi mà học", "Learn by playing")),
        el("h1", {}, L("Trò chơi từ vựng", "Vocabulary games")),
        el("p", { class: "lead" }, L("Mỗi trò bắt bạn tự nhớ lại từ thay vì chỉ đọc lướt — cách ghi nhớ hiệu quả nhất.",
                                     "Every game makes you recall the word yourself instead of just reading it — the most effective way to remember.")),
        el("div", { class: "row wrap", style: "gap:10px" },
          el("label", { for: "game-source", class: "field-label mb-0" }, L("Chơi với", "Play with")),
          select, countNote)),
      el("div", { class: "games-hero-cat" }, cat)),
    el("div", { class: "game-grid" }, GAMES.map((g) => gameCard(g, () => ctx.go(`game/${g.id}/${source}`)))),
    el("div", { class: "section-head" },
      el("h2", {}, L("Trò chơi chữ", "Wordplay games")),
      el("span", { class: "muted small" }, L("Thành ngữ & chơi chữ tiếng Anh", "English idioms & puns"))),
    el("div", { class: "game-grid" }, WORDPLAY_GAMES.map((g) => gameCard(g, () => ctx.go(g.route)))));
}

function gameCard(g, onPlay) {
  return el("div", { class: "game-card", style: `--game:${g.color}` },
    el("div", { class: "game-art" }, el("div", { class: "game-ico" }, icon(g.icon)),
      el("span", { class: "paw-deco" }, icon("paw")), el("span", { class: "paw-deco b" }, icon("paw"))),
    el("div", { class: "game-body" },
      el("h3", {}, g.name),
      el("p", { class: "muted small" }, g.desc),
      el("div", { class: "row", style: "justify-content:space-between;margin-top:auto" },
        el("span", { class: "chip" }, icon("trophy"), `${L("Kỷ lục", "Best")} ${bestScore(g.id)}`),
        el("button", { class: "btn btn-primary btn-sm", onclick: onPlay }, L("Chơi ngay", "Play"), icon("arrow")))));
}

function poolNote(source) {
  const n = poolFor(source).length;
  return n < 6
    ? L(`chỉ có ${n} từ — sẽ dùng thêm từ các bộ khác`, `only ${n} words — extra words will be added`)
    : L(`${n} từ`, `${n} words`);
}

function getPool(source) {
  let pool = poolFor(source);
  if (pool.length < 6) {
    const extra = shuffle(ALL_WORDS.filter((w) => !pool.includes(w))).slice(0, 12 - pool.length);
    pool = [...pool, ...extra];
  }
  return pool;
}

/* ======================= KHUNG CHUNG ======================= */
/**
 * Khung dùng chung cho mọi trò chơi.
 * routes: { back, backLabel, replay } — đường dẫn nút quay lại và nút chơi lại
 */
export function gameShell(ctx, game, routes) {
  const score = el("b", {}, "0");
  const extra = el("div", { class: "row", style: "gap:8px" });
  const cat = createCat({ size: 96, mood: "idle", bubbleSide: "left" });
  const arena = el("div", { class: "arena" });
  const root = el("div", { class: "game-page", style: `--game:${game.color}` },
    el("div", { class: "game-bar" },
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go(routes.back) }, icon("back"), routes.backLabel || L("Trò chơi", "Games")),
      el("div", { class: "game-title" }, el("span", { class: "game-ico sm" }, icon(game.icon)), game.name),
      el("div", { class: "spacer" }),
      extra,
      el("div", { class: "score-pill" }, L("Điểm", "Score"), " ", score)),
    el("div", { class: "game-stage" }, arena, el("div", { class: "game-cat" }, cat)));

  const api = {
    root, arena, cat, extra,
    points: 0,
    add(n) {
      api.points = Math.max(0, api.points + n);
      score.textContent = api.points;
      score.parentElement.classList.remove("bump"); void score.offsetWidth; score.parentElement.classList.add("bump");
    },
    alive: () => root.isConnected,
    over(summary = "") {
      const res = recordGame(game.id, api.points);
      cat.setMood("happy");
      cat.say(res.isBest && api.points > 0 ? L("Kỷ lục mới! Meo meo!", "New best! Meow meow!") : L("Chơi hay lắm!", "Well played!"), 0);
      arena.innerHTML = "";
      arena.append(el("div", { class: "game-over" },
        el("div", { class: "eyebrow" }, L("Kết thúc", "Game over")),
        el("div", { class: "big-score" }, api.points),
        el("div", { class: "muted" }, L("điểm", "points")),
        res.isBest && api.points > 0
          ? el("span", { class: "chip chip-gold" }, icon("trophy"), L("Kỷ lục mới", "New best"))
          : el("span", { class: "chip" }, `${L("Kỷ lục", "Best")}: ${res.best}`),
        summary ? el("p", { class: "muted small center", style: "max-width:420px" }, summary) : null,
        el("div", { class: "chip chip-xp" }, `+${res.xp} XP`),
        el("div", { class: "row wrap", style: "gap:10px;justify-content:center;margin-top:8px" },
          el("button", { class: "btn btn-primary", onclick: () => ctx.go(routes.replay, { replay: Date.now() }) }, icon("refresh"), L("Chơi lại", "Play again")),
          el("button", { class: "btn", onclick: () => ctx.go(routes.back) }, L("Chọn trò khác", "Choose another game")))));
    },
  };
  return api;
}

export function renderGame(ctx, gameId, source = "all") {
  const game = GAMES.find((g) => g.id === gameId);
  if (!game) return el("div", { class: "notice notice-error" }, L("Không tìm thấy trò chơi này.", "Game not found."));
  const shell = gameShell(ctx, game, { back: `games/${source}`, replay: `game/${game.id}/${source}` });
  const pool = getPool(source);
  const play = { match: playMatch, rain: playRain, spell: playSpell, quiz: playQuiz, guess: playGuess }[gameId];
  // Bắt đầu sau khi khung trò chơi đã được gắn vào trang (các trò dừng khi trang bị rời đi)
  setTimeout(() => { if (shell.alive()) play(shell, pool); }, 0);
  return shell.root;
}

export function timerPill(seconds) {
  const v = el("b", {}, seconds);
  const node = el("div", { class: "score-pill timer-pill" }, icon("clock"), v);
  return { node, set: (s) => { v.textContent = Math.max(0, Math.ceil(s)); node.classList.toggle("low", s <= 10); } };
}

function livesPill(n) {
  const node = el("div", { class: "score-pill lives", "aria-label": L("Số mạng", "Lives") });
  const set = (k) => { node.innerHTML = ""; for (let i = 0; i < n; i++) node.append(el("span", { class: "life" + (i < k ? "" : " lost") }, icon("heart"))); };
  set(n);
  return { node, set };
}

/* ======================= 1. GHÉP CẶP ======================= */
function playMatch(g, pool) {
  let timeLeft = 60, combo = 0, cleared = 0;
  const t = timerPill(timeLeft);
  g.extra.append(t.node);
  g.cat.say(L("Nối từ với nghĩa nhé!", "Match the words to their meanings!"), 1800);

  const board = el("div", { class: "match-board" });
  const left = el("div", { class: "match-col" });
  const right = el("div", { class: "match-col" });
  board.append(left, right);
  g.arena.append(el("p", { class: "muted small center mt-0" },
    L("Chọn một từ bên trái rồi chọn nghĩa của nó bên phải.", "Pick a word on the left, then its meaning on the right.")), board);

  let selL = null, selR = null, bag = shuffle(pool);

  function deal() {
    if (bag.length < 6) bag = shuffle(pool);
    const set = bag.splice(0, 6);
    left.innerHTML = ""; right.innerHTML = "";
    shuffle(set).forEach((w) => left.append(tile(w, "word")));
    shuffle(set).forEach((w) => right.append(tile(w, "vi")));
  }

  function tile(w, side) {
    const b = el("button", { class: `tile ${side}`, dataset: { id: w.id } }, side === "word" ? w.word : meaning(w));
    b.onclick = () => {
      if (b.classList.contains("gone")) return;
      if (side === "word") { selL?.classList.remove("sel"); selL = b; speakText(w.word); }
      else { selR?.classList.remove("sel"); selR = b; }
      b.classList.add("sel");
      if (selL && selR) check();
    };
    return b;
  }

  function check() {
    const a = selL, b = selR;
    selL = selR = null;
    if (a.dataset.id === b.dataset.id) {
      combo++;
      g.add(10 + Math.min(combo, 5) * 2);
      [a, b].forEach((x) => { x.classList.remove("sel"); x.classList.add("ok", "gone"); });
      if (combo % 3 === 0) g.cat.react(true, `Combo x${combo}!`); else g.cat.setMood("happy", 700);
      if (left.querySelectorAll(".tile:not(.gone)").length === 0) {
        cleared++;
        timeLeft += 5;
        g.cat.say(L("+5 giây!", "+5 seconds!"), 1000);
        setTimeout(deal, 380);
      }
    } else {
      combo = 0;
      [a, b].forEach((x) => { x.classList.add("bad"); setTimeout(() => x.classList.remove("bad", "sel"), 420); });
      g.cat.react(false);
    }
  }

  deal();
  let last = Date.now();
  const iv = setInterval(() => {
    if (!g.alive()) return clearInterval(iv);
    const now = Date.now();
    timeLeft -= (now - last) / 1000;
    last = now;
    t.set(timeLeft);
    if (timeLeft <= 0) { clearInterval(iv); g.over(L(`Bạn xoá sạch ${cleared} bàn.`, `You cleared ${cleared} boards.`)); }
  }, 200);
}

/* ======================= 2. MƯA CHỮ ======================= */
function playRain(g, pool) {
  let lives = 3, speed = 11, caught = 0, running = true;
  const lp = livesPill(3);
  g.extra.append(lp.node);

  const sky = el("div", { class: "rain-sky" });
  const ground = el("div", { class: "rain-ground" });
  const input = el("input", {
    id: "rain-input", type: "text", class: "rain-input",
    placeholder: L("Gõ từ tiếng Anh rồi nhấn Enter", "Type the English word and press Enter"),
    autocomplete: "off", autocapitalize: "off", spellcheck: "false",
  });
  g.arena.append(sky, ground, el("div", { class: "rain-controls" }, input));
  setTimeout(() => input.focus(), 50);
  g.cat.say(L("Gõ nhanh kẻo rơi mất!", "Type fast before they land!"), 1800);

  let bag = shuffle(pool);
  const drops = [];

  function spawn() {
    if (!bag.length) bag = shuffle(pool);
    const w = bag.pop();
    const node = el("div", { class: "drop", style: `left:${8 + Math.random() * 60}%` }, meaning(w));
    sky.append(node);
    drops.push({ w, node, born: performance.now(), dur: speed * 1000 });
  }

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const val = norm(input.value);
    if (!val) return;
    const hit = drops.find((d) => norm(d.w.word) === val);
    if (hit) {
      caught++;
      g.add(10 + hit.w.word.length);
      hit.node.classList.add("pop");
      setTimeout(() => hit.node.remove(), 300);
      drops.splice(drops.indexOf(hit), 1);
      speed = Math.max(5, speed - 0.35);
      input.value = "";
      g.cat.react(true, caught % 5 === 0 ? praise() : "");
    } else {
      input.classList.add("shake");
      setTimeout(() => input.classList.remove("shake"), 350);
      g.cat.setMood("sad", 600);
    }
  });

  spawn();
  function frame(now) {
    if (!running) return;
    if (!g.alive()) { running = false; return; }
    const h = sky.clientHeight - 40;
    for (const d of [...drops]) {
      const p = (now - d.born) / d.dur;
      d.node.style.transform = `translateY(${p * h}px)`;
      if (p >= 1) {
        drops.splice(drops.indexOf(d), 1);
        d.node.classList.add("splash");
        setTimeout(() => d.node.remove(), 400);
        lives--;
        lp.set(lives);
        g.cat.react(false, `${d.w.word}!`);
        toast(L(`“${meaning(d.w)}” là ${d.w.word}`, `“${meaning(d.w)}” = ${d.w.word}`), "err", 2200);
        if (lives <= 0) { running = false; g.over(L(`Bạn bắt được ${caught} từ.`, `You caught ${caught} words.`)); return; }
      }
    }
    const newest = drops[drops.length - 1];
    if (!newest || (drops.length < 2 && (now - newest.born) / newest.dur > 0.45)) spawn();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ======================= 3. ĐÁNH VẦN ======================= */
function playSpell(g, pool) {
  const list = shuffle(pool.filter((w) => !w.word.includes(" "))).slice(0, 10);
  let i = 0, correct = 0;
  const round = el("span", { class: "score-pill" }, `1/${list.length}`);
  g.extra.append(round);

  if (!("speechSynthesis" in window)) {
    g.arena.append(el("div", { class: "notice notice-warn" },
      L("Trình duyệt này không hỗ trợ đọc tự động — Mochi sẽ hiện nghĩa để bạn đoán.", "This browser can't read words aloud — use the meaning as your clue.")));
  }

  const box = el("div", { class: "spell" });
  g.arena.append(box);
  next();

  function next() {
    if (!g.alive()) return;
    if (i >= list.length) return g.over(L(`Đúng ${correct}/${list.length} từ.`, `${correct}/${list.length} words spelled correctly.`));
    const w = list[i];
    round.textContent = `${i + 1}/${list.length}`;
    let hints = 0, locked = false;

    const slots = el("div", { class: "slots" }, [...w.word].map((ch) => el("span", { class: "slot" + (ch === "-" ? " dash" : "") }, ch === "-" ? "-" : "")));
    const input = el("input", {
      id: "spell-input", type: "text", class: "spell-input", maxlength: String(w.word.length + 4),
      autocomplete: "off", autocapitalize: "off", spellcheck: "false",
      placeholder: L("Gõ từ bạn nghe được", "Type the word you hear"),
    });
    const feedback = el("div", { class: "spell-feedback", "aria-live": "polite" });

    const paint = () => {
      const v = input.value.toLowerCase();
      [...slots.children].forEach((s, k) => {
        if (w.word[k] === "-") return;
        s.textContent = v[k] || "";
        s.classList.toggle("filled", !!v[k]);
      });
    };
    input.oninput = paint;

    const submit = () => {
      if (locked) return;
      locked = true;
      const ok = norm(input.value) === norm(w.word);
      if (ok) {
        correct++;
        const pts = Math.max(2, 10 - hints * 3);
        g.add(pts);
        feedback.className = "spell-feedback ok";
        feedback.textContent = L(`Chính xác! +${pts}`, `Correct! +${pts}`);
        g.cat.react(true, praise());
      } else {
        feedback.className = "spell-feedback bad";
        feedback.innerHTML = "";
        feedback.append(L("Đáp án: ", "Answer: "), el("b", {}, w.word), el("span", { class: "ipa" }, ` ${w.ipa}`));
        g.cat.react(false, comfort());
      }
      [...slots.children].forEach((s, k) => { s.textContent = w.word[k]; s.classList.add(ok ? "ok" : "reveal"); });
      i++;
      setTimeout(next, ok ? 1100 : 2200);
    };
    input.onkeydown = (e) => { if (e.key === "Enter") submit(); };

    box.innerHTML = "";
    box.append(
      el("button", { class: "listen-btn", onclick: () => speakText(w.word, { rate: 0.8 }) }, icon("volume"), L("Nghe lại", "Listen again")),
      el("div", { class: "spell-clue" }, el("span", { class: "pos" }, w.pos), " ", meaning(w)),
      slots, input,
      el("div", { class: "row wrap", style: "gap:8px;justify-content:center" },
        el("button", {
          class: "btn btn-sm", onclick: () => {
            if (locked) return;
            const cur = input.value.toLowerCase();
            let k = 0;
            while (k < w.word.length && cur[k] === w.word[k]) k++;
            if (k >= w.word.length) return;
            hints++;
            input.value = w.word.slice(0, k + 1);
            paint(); input.focus();
          },
        }, L("Gợi ý 1 chữ (−3)", "Reveal a letter (−3)")),
        el("button", { class: "btn btn-sm", onclick: () => { if (!locked) { input.value = ""; submit(); } } }, L("Bỏ qua", "Skip")),
        el("button", { class: "btn btn-primary btn-sm", onclick: submit }, L("Kiểm tra", "Check"))),
      feedback);
    setTimeout(() => { speakText(w.word, { rate: 0.85 }); input.focus(); }, 250);
  }
}

/* ======================= 4. TRẮC NGHIỆM TỐC ĐỘ ======================= */
function playQuiz(g, pool) {
  const TOTAL = 15, LIMIT = 7;
  const qs = shuffle(pool).slice(0, Math.min(TOTAL, pool.length));
  let i = 0, combo = 0, correct = 0;
  const round = el("span", { class: "score-pill" }, `1/${qs.length}`);
  const comboPill = el("span", { class: "score-pill combo hidden" }, "x1");
  g.extra.append(comboPill, round);

  const track = el("div", { class: "yarn-track" }, el("div", { class: "yarn" }));
  const qBox = el("div", { class: "quiz" });
  g.arena.append(track, qBox);
  next();

  function next() {
    if (!g.alive()) return;
    if (i >= qs.length) return g.over(L(`Đúng ${correct}/${qs.length} câu.`, `${correct}/${qs.length} correct.`));
    const w = qs[i];
    const reverse = i % 3 === 2; // mỗi câu thứ 3: cho nghĩa, chọn từ
    round.textContent = `${i + 1}/${qs.length}`;
    const distract = shuffle(ALL_WORDS.filter((x) => x.id !== w.id && x.pos === w.pos)).slice(0, 3);
    while (distract.length < 3) distract.push(shuffle(ALL_WORDS.filter((x) => x.id !== w.id && !distract.includes(x)))[0]);
    const options = shuffle([w, ...distract]);

    let answered = false;
    const start = Date.now();
    const yarn = track.firstChild;
    yarn.style.transition = "none";
    yarn.style.left = "0%";
    void yarn.offsetWidth;
    yarn.style.transition = `left ${LIMIT}s linear`;
    yarn.style.left = "calc(100% - 34px)";

    const timeout = setTimeout(() => answer(null), LIMIT * 1000);

    qBox.innerHTML = "";
    qBox.append(
      el("div", { class: "quiz-q" },
        el("div", { class: "tiny muted" }, reverse ? L("Từ tiếng Anh nào mang nghĩa", "Which word means") : L("Nghĩa của từ", "What does this word mean?")),
        el("div", { class: "quiz-word" }, reverse ? meaning(w) : w.word),
        reverse ? null : el("div", { class: "ipa" }, w.ipa)),
      el("div", { class: "quiz-options" },
        options.map((o, k) => el("button", { class: "opt", dataset: { id: o.id }, onclick: (e) => answer(o, e.currentTarget) },
          el("kbd", {}, k + 1), reverse ? o.word : meaning(o)))));
    if (!reverse) speakText(w.word);

    const keyer = (e) => {
      if (!g.alive()) return window.removeEventListener("keydown", keyer);
      const n = Number(e.key);
      if (n >= 1 && n <= 4) qBox.querySelectorAll(".opt")[n - 1]?.click();
    };
    window.addEventListener("keydown", keyer);

    function answer(o, btn) {
      if (answered) return;
      answered = true;
      clearTimeout(timeout);
      window.removeEventListener("keydown", keyer);
      const leftPx = parseFloat(getComputedStyle(yarn).left);
      yarn.style.transition = "none"; yarn.style.left = `${leftPx}px`;
      const ok = o && o.id === w.id;
      qBox.querySelectorAll(".opt").forEach((b) => {
        b.disabled = true;
        if (b.dataset.id === w.id) b.classList.add("ok");
      });
      if (ok) {
        correct++; combo++;
        const secs = Math.max(0, LIMIT - (Date.now() - start) / 1000);
        g.add(Math.round((10 + secs * 2) * (1 + Math.min(combo - 1, 4) * 0.25)));
        comboPill.classList.toggle("hidden", combo < 2);
        comboPill.textContent = `Combo x${combo}`;
        g.cat.react(true, combo >= 3 ? `Combo x${combo}!` : "");
      } else {
        combo = 0;
        comboPill.classList.add("hidden");
        btn?.classList.add("bad");
        g.cat.react(false, o ? comfort() : L("Cuộn len tới rồi!", "The yarn got here first!"));
      }
      i++;
      setTimeout(next, ok ? 700 : 1500);
    }
  }
}

/* ======================= 5. ĐOÁN CHỮ ======================= */
function playGuess(g, pool) {
  const ROUNDS = 3, TRIES = 6;
  let candidates = pool.filter((w) => /^[a-z]{4,8}$/.test(w.word));
  if (candidates.length < ROUNDS) candidates = ALL_WORDS.filter((w) => /^[a-z]{4,8}$/.test(w.word));
  const words = shuffle(candidates).slice(0, ROUNDS);
  let r = 0, solved = 0;
  const round = el("span", { class: "score-pill" }, `1/${ROUNDS}`);
  g.extra.append(round);

  const box = el("div", { class: "guess" });
  g.arena.append(box);
  let keyer = null;
  next();

  function next() {
    if (!g.alive()) return;
    if (keyer) window.removeEventListener("keydown", keyer);
    if (r >= words.length) return g.over(L(`Đoán đúng ${solved}/${words.length} từ.`, `You solved ${solved}/${words.length} words.`));
    const w = words[r];
    const target = w.word;
    const n = target.length;
    round.textContent = `${r + 1}/${words.length}`;
    let row = 0, cur = "", done = false;
    const letterState = {};

    const grid = el("div", { class: "g-grid", style: `--n:${n}` });
    for (let k = 0; k < TRIES; k++) {
      grid.append(el("div", { class: "g-row" }, Array.from({ length: n }, () => el("span", { class: "g-cell" }))));
    }
    const kb = el("div", { class: "g-kb" });
    const keyBtns = {};
    ["qwertyuiop", "asdfghjkl", "zxcvbnm"].forEach((line, li) => {
      const rowEl = el("div", { class: "g-kb-row" });
      if (li === 2) rowEl.append(el("button", { class: "g-key wide", onclick: () => press("Enter") }, "Enter"));
      for (const ch of line) {
        keyBtns[ch] = el("button", { class: "g-key", onclick: () => press(ch) }, ch);
        rowEl.append(keyBtns[ch]);
      }
      if (li === 2) rowEl.append(el("button", { class: "g-key wide", onclick: () => press("Backspace"), "aria-label": L("Xoá", "Delete") }, "⌫"));
      kb.append(rowEl);
    });
    const msg = el("div", { class: "g-msg", "aria-live": "polite" });

    box.innerHTML = "";
    box.append(
      el("div", { class: "spell-clue" }, el("span", { class: "pos" }, w.pos), " ", meaning(w),
        el("span", { class: "chip", style: "margin-left:8px" }, L(`${n} chữ cái`, `${n} letters`))),
      grid, msg, kb);

    function paintRow() {
      const cells = grid.children[row].children;
      for (let k = 0; k < n; k++) { cells[k].textContent = cur[k] || ""; cells[k].classList.toggle("filled", !!cur[k]); }
    }

    function press(k) {
      if (done) return;
      if (k === "Enter") return submit();
      if (k === "Backspace") { cur = cur.slice(0, -1); return paintRow(); }
      if (/^[a-z]$/i.test(k) && cur.length < n) { cur += k.toLowerCase(); paintRow(); }
    }

    function submit() {
      if (cur.length < n) {
        const rowEl = grid.children[row];
        rowEl.classList.add("shake"); setTimeout(() => rowEl.classList.remove("shake"), 350);
        msg.textContent = L(`Cần đủ ${n} chữ cái`, `You need ${n} letters`);
        return;
      }
      msg.textContent = "";
      // tô màu kiểu Wordle (xử lý đúng chữ lặp)
      const res = Array(n).fill("absent");
      const rest = {};
      for (let k = 0; k < n; k++) {
        if (cur[k] === target[k]) res[k] = "correct";
        else rest[target[k]] = (rest[target[k]] || 0) + 1;
      }
      for (let k = 0; k < n; k++) {
        if (res[k] !== "correct" && rest[cur[k]]) { res[k] = "present"; rest[cur[k]]--; }
      }
      const cells = grid.children[row].children;
      const rank = { absent: 0, present: 1, correct: 2 };
      res.forEach((s, k) => {
        setTimeout(() => cells[k].classList.add(s, "flip"), k * 90);
        const prev = letterState[cur[k]];
        if (!prev || rank[s] > rank[prev]) letterState[cur[k]] = s;
      });
      setTimeout(() => {
        for (const [ch, s] of Object.entries(letterState)) {
          keyBtns[ch]?.classList.remove("absent", "present", "correct");
          keyBtns[ch]?.classList.add(s);
        }
      }, n * 90);

      if (cur === target) {
        done = true; solved++;
        g.add((TRIES - row) * 10);
        g.cat.react(true, praise());
        msg.innerHTML = "";
        msg.append(el("b", {}, target), el("span", { class: "ipa" }, ` ${w.ipa}`), " — ", w.example);
        speakText(target);
        r++;
        setTimeout(next, 2600);
        return;
      }
      row++;
      cur = "";
      if (row >= TRIES) {
        done = true;
        g.cat.react(false, comfort());
        msg.innerHTML = "";
        msg.append(L("Đáp án: ", "Answer: "), el("b", {}, target), el("span", { class: "ipa" }, ` ${w.ipa}`));
        speakText(target);
        r++;
        setTimeout(next, 2800);
      } else if (row === 3) {
        g.cat.say(L(`Gợi ý: bắt đầu bằng “${target[0]}”`, `Hint: it starts with “${target[0]}”`), 2500);
      }
    }

    keyer = (e) => {
      if (!g.alive()) return window.removeEventListener("keydown", keyer);
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter" || e.key === "Backspace" || /^[a-z]$/i.test(e.key)) { e.preventDefault(); press(e.key); }
    };
    window.addEventListener("keydown", keyer);
  }
}
