// IDIOMS — thư viện thành ngữ + 2 trò đoán: "Idiom Guess" (đoán nghĩa) và "Missing Word" (điền từ)
import { el, icon, speakText, shuffle, escapeHtml } from "../ui.js";
import { createCat, praise, comfort } from "../cat.js";
import { IDIOMS, IDIOM_TAGS, withGap } from "../data/idioms.js";
import { gameShell, WORDPLAY_GAMES } from "../vocab/games.js";
import { bestScore } from "../vocab/progress.js";
import { L, isVi } from "../i18n.js";

const TAG_LABEL = {
  study: L("Học tập", "Study"), people: L("Con người", "People"), time: L("Thời gian", "Time"),
  health: L("Sức khoẻ", "Health"), money: L("Tiền bạc", "Money"), problems: L("Vấn đề", "Problems"),
  feelings: L("Cảm xúc", "Feelings"), life: L("Cuộc sống", "Life"), animals: L("Động vật", "Animals"),
  work: L("Công việc", "Work"), technology: L("Công nghệ", "Technology"), change: L("Thay đổi", "Change"),
  environment: L("Môi trường", "Environment"), travel: L("Du lịch", "Travel"),
};
const REGISTER_LABEL = { informal: L("thân mật", "informal"), neutral: L("trung tính", "neutral") };

const mainMeaning = (i) => (isVi() ? i.vi : i.meaning);
const otherMeaning = (i) => (isVi() ? i.meaning : i.vi);

/** Tô đậm thành ngữ trong câu ví dụ (khớp theo các từ khoá chính, bỏ qua biến thể thì/ngôi) */
function highlight(example, phrase) {
  const safe = escapeHtml(example);
  // Khớp nguyên cụm trước; nếu thành ngữ bị chia thì/ngôi thì tô từng từ khoá
  const whole = safe.search(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  if (whole >= 0) {
    return safe.slice(0, whole) + `<mark>${safe.slice(whole, whole + phrase.length)}</mark>` + safe.slice(whole + phrase.length);
  }
  const words = phrase.split(" ").filter((w) => w.length >= 3 && !/^(the|and|you|can|than|that|with|your|someone's|out|off|for|has)$/i.test(w));
  let out = safe;
  for (const w of words) {
    const stem = w.replace(/(ing|ed|s)$/i, "");
    out = out.replace(new RegExp(`\\b(${stem}\\w*)`, "i"), "<mark>$1</mark>");
  }
  return out;
}

/* ======================= THƯ VIỆN ======================= */
export function renderIdioms(ctx) {
  let tag = "all";
  const grid = el("div", { class: "idiom-grid" });
  const chips = el("div", { class: "filter-chips", role: "tablist" });

  const cat = createCat({
    size: 140, mood: "think", bubbleSide: "left",
    say: L("“Mưa mèo và chó”? Đâu phải nghĩa đen đâu nha!", "“Raining cats and dogs”? Not literally, I hope!"),
  });

  function paint() {
    [...chips.children].forEach((c) => c.classList.toggle("on", c.dataset.tag === tag));
    grid.innerHTML = "";
    IDIOMS.filter((i) => tag === "all" || i.tag === tag).forEach((i) => grid.append(idiomCard(i, cat)));
  }
  ["all", ...IDIOM_TAGS].forEach((t) =>
    chips.append(el("button", { class: "chip-btn", dataset: { tag: t }, onclick: () => { tag = t; paint(); } },
      t === "all" ? L(`Tất cả (${IDIOMS.length})`, `All (${IDIOMS.length})`) : TAG_LABEL[t] || t)));
  paint();

  const games = WORDPLAY_GAMES.filter((g) => g.id.startsWith("idiom"));

  return el("div", { class: "stack-lg" },
    el("section", { class: "games-hero wordplay-hero idioms" },
      el("div", { style: "flex:1;min-width:260px" },
        el("div", { class: "eyebrow" }, "Idioms"),
        el("h1", {}, L("Đoán xem thành ngữ thật sự nghĩa là gì", "Guess what idioms really mean")),
        el("p", { class: "lead" },
          L("Thành ngữ dùng đúng lúc giúp bài Speaking tự nhiên hơn. Đọc câu ví dụ, tự đoán nghĩa rồi mới lật thẻ.",
            "Used at the right moment, idioms make your Speaking sound natural. Read the example, make a guess, then reveal the meaning.")),
        el("div", { class: "row wrap", style: "gap:10px" },
          games.map((g) => el("button", { class: "btn btn-lg" + (g.id === "idiom-meaning" ? " btn-primary" : ""), onclick: () => ctx.go(g.route) },
            icon(g.icon), g.name, el("span", { class: "chip" }, `${L("Kỷ lục", "Best")} ${bestScore(g.id)}`))))),
      el("div", { class: "games-hero-cat" }, cat)),
    el("div", { class: "notice notice-info small" },
      L("Mẹo IELTS: thành ngữ “thân mật” hợp với Speaking, nhưng hạn chế trong Writing Task 2. Thành ngữ “trung tính” dùng được cả hai.",
        "IELTS tip: “informal” idioms suit Speaking but should be avoided in Writing Task 2. “Neutral” ones work in both.")),
    chips,
    grid);
}

function idiomCard(i, cat) {
  const meaningBox = el("div", { class: "idiom-meaning hidden" },
    el("div", { class: "strong" }, mainMeaning(i)),
    el("div", { class: "muted small" }, otherMeaning(i)));
  const reveal = el("button", { class: "btn btn-sm", onclick: () => {
    meaningBox.classList.remove("hidden");
    reveal.classList.add("hidden");
    cat.setMood("happy", 900);
    cat.say(i.phrase, 1500);
  } }, icon("eye"), L("Xem nghĩa", "Reveal meaning"));

  return el("article", { class: "idiom-card" },
    el("div", { class: "row", style: "gap:8px;align-items:flex-start" },
      el("h3", { class: "idiom-phrase" }, i.phrase),
      el("div", { class: "spacer" }),
      el("button", { class: "icon-btn", title: L("Nghe", "Listen"), onclick: () => speakText(i.phrase) }, icon("volume"))),
    el("div", { class: "row wrap", style: "gap:6px" },
      el("span", { class: "chip" }, TAG_LABEL[i.tag] || i.tag),
      el("span", { class: "chip " + (i.register === "informal" ? "chip-new" : "") }, REGISTER_LABEL[i.register])),
    el("p", { class: "example", html: highlight(i.example, i.phrase) }),
    reveal, meaningBox);
}

/* ======================= TRÒ CHƠI ======================= */
export function renderIdiomGame(ctx, mode) {
  const game = WORDPLAY_GAMES.find((g) => g.id === (mode === "missing" ? "idiom-missing" : "idiom-meaning"));
  const shell = gameShell(ctx, game, { back: "idioms", backLabel: "Idioms", replay: game.route });
  setTimeout(() => { if (shell.alive()) (mode === "missing" ? playMissing : playMeaning)(shell); }, 0);
  return shell.root;
}

function quizLoop(g, rounds, build) {
  const list = shuffle(IDIOMS).slice(0, rounds);
  let i = 0, streak = 0, correct = 0;
  const round = el("span", { class: "score-pill" }, `1/${list.length}`);
  g.extra.append(round);
  const box = el("div", { class: "quiz wordplay-quiz" });
  g.arena.append(box);
  next();

  function next() {
    if (!g.alive()) return;
    if (i >= list.length) return g.over(L(`Đúng ${correct}/${list.length} câu.`, `${correct}/${list.length} correct.`));
    const item = list[i];
    round.textContent = `${i + 1}/${list.length}`;
    const { prompt, options, isRight, label } = build(item);
    let answered = false;

    const nextBtn = el("button", { class: "btn btn-primary hidden", onclick: () => { i++; next(); } },
      i + 1 >= list.length ? L("Xem kết quả", "See results") : L("Câu tiếp theo", "Next"), icon("arrow"));
    const explain = el("div", { class: "wp-explain hidden", "aria-live": "polite" });

    box.innerHTML = "";
    box.append(prompt,
      el("div", { class: "quiz-options" },
        options.map((o, k) => el("button", { class: "opt", onclick: (e) => answer(o, e.currentTarget) }, el("kbd", {}, k + 1), label(o)))),
      explain, el("div", { class: "row", style: "justify-content:center" }, nextBtn));

    const keyer = (e) => {
      if (!g.alive()) return window.removeEventListener("keydown", keyer);
      const n = Number(e.key);
      if (!answered && n >= 1 && n <= 4) box.querySelectorAll(".opt")[n - 1]?.click();
      else if (answered && e.key === "Enter") { window.removeEventListener("keydown", keyer); nextBtn.click(); }
    };
    window.addEventListener("keydown", keyer);

    function answer(o, btn) {
      if (answered) return;
      answered = true;
      const ok = isRight(o);
      box.querySelectorAll(".opt").forEach((b, k) => {
        b.disabled = true;
        if (isRight(options[k])) b.classList.add("ok");
      });
      if (ok) {
        correct++; streak++;
        g.add(10 + Math.min(streak - 1, 5) * 2);
        g.cat.react(true, streak >= 3 ? L(`${streak} câu liên tiếp!`, `${streak} in a row!`) : praise());
      } else {
        streak = 0;
        btn.classList.add("bad");
        g.cat.react(false, comfort());
      }
      explain.innerHTML = "";
      explain.append(
        el("div", { class: "row", style: "gap:8px" },
          el("b", { class: "idiom-phrase sm" }, item.phrase),
          el("button", { class: "icon-btn", title: L("Nghe", "Listen"), onclick: () => speakText(item.phrase) }, icon("volume"))),
        el("div", { class: "strong" }, mainMeaning(item)),
        el("div", { class: "muted small" }, otherMeaning(item)),
        el("p", { class: "example mb-0", html: highlight(item.example, item.phrase) }));
      explain.classList.remove("hidden");
      nextBtn.classList.remove("hidden");
      speakText(item.phrase);
    }
  }
}

function playMeaning(g) {
  g.cat.say(L("Đọc câu rồi đoán nghĩa nhé!", "Read the sentence and guess the meaning!"), 1800);
  quizLoop(g, 10, (item) => {
    const wrong = shuffle(IDIOMS.filter((x) => x.id !== item.id)).slice(0, 3);
    return {
      prompt: el("div", { class: "quiz-q" },
        el("div", { class: "tiny muted" }, L("Thành ngữ này nghĩa là gì?", "What does this idiom mean?")),
        el("div", { class: "quiz-word" }, item.phrase),
        el("p", { class: "example center", html: highlight(item.example, item.phrase) })),
      options: shuffle([item, ...wrong]),
      isRight: (o) => o.id === item.id,
      label: (o) => mainMeaning(o),
    };
  });
}

function playMissing(g) {
  g.cat.say(L("Thiếu mất một từ, tìm giúp Mochi!", "A word went missing — help Mochi find it!"), 1800);
  quizLoop(g, 10, (item) => {
    const wrong = shuffle([...new Set(IDIOMS.filter((x) => x.blank !== item.blank).map((x) => x.blank))]).slice(0, 3);
    return {
      prompt: el("div", { class: "quiz-q" },
        el("div", { class: "tiny muted" }, L("Điền từ còn thiếu", "Complete the idiom")),
        el("div", { class: "quiz-word gap-phrase" }, withGap(item)),
        el("div", { class: "muted" }, `“${mainMeaning(item)}”`)),
      options: shuffle([item.blank, ...wrong]),
      isRight: (o) => o === item.blank,
      label: (o) => o,
    };
  });
}
