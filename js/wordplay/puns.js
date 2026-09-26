// PUNS — thư viện câu chơi chữ + trò "Pun Detective" (tìm từ tạo nên câu đùa)
import { el, icon, speakText, shuffle, escapeHtml } from "../ui.js";
import { createCat, praise, comfort } from "../cat.js";
import { PUNS } from "../data/puns.js";
import { gameShell, WORDPLAY_GAMES } from "../vocab/games.js";
import { bestScore } from "../vocab/progress.js";
import { L } from "../i18n.js";

const TYPE_LABEL = {
  double: L("Một từ hai nghĩa", "Double meaning"),
  sound: L("Đồng âm", "Sounds alike"),
  blend: L("Ghép từ", "Word blend"),
};

/** Bọc từ khoá chơi chữ trong <mark> */
function markKey(p) {
  const idx = p.text.indexOf(p.key);
  if (idx < 0) return escapeHtml(p.text);
  return escapeHtml(p.text.slice(0, idx)) + `<mark class="pun-key">${escapeHtml(p.key)}</mark>` + escapeHtml(p.text.slice(idx + p.key.length));
}

function explanation(p) {
  return el("div", { class: "pun-explain" },
    el("div", { class: "row wrap", style: "gap:6px;margin-bottom:8px" },
      el("span", { class: "chip chip-gold" }, TYPE_LABEL[p.type]),
      el("span", { class: "strong" }, `“${p.key}”`)),
    el("ol", { class: "pun-meanings" }, p.meanings.map((m) => el("li", {}, m))),
    el("div", { class: "muted small" }, p.vi));
}

/* ======================= THƯ VIỆN ======================= */
export function renderPuns(ctx) {
  const cat = createCat({
    size: 140, mood: "idle", bubbleSide: "left",
    say: L("i-melts là chuyên gia “purr-fect” đó!", "I'm a purr-fect pun expert!"),
  });
  const game = WORDPLAY_GAMES.find((g) => g.id === "pun-detective");

  return el("div", { class: "stack-lg" },
    el("section", { class: "games-hero wordplay-hero puns" },
      el("div", { style: "flex:1;min-width:260px" },
        el("div", { class: "eyebrow" }, "Puns"),
        el("h1", {}, L("Chơi chữ: khi một từ mang hai nghĩa", "Puns: when one word means two things")),
        el("p", { class: "lead" },
          L("Hiểu được câu đùa chơi chữ nghĩa là bạn đã nắm cả hai nghĩa của từ. Đọc, tự tìm chỗ buồn cười, rồi bấm “Hiểu chưa?”.",
            "If you get a pun, you know both meanings of the word. Read it, spot the joke, then tap “Get it?”.")),
        el("div", { class: "row wrap", style: "gap:10px" },
          el("button", { class: "btn btn-primary btn-lg", onclick: () => ctx.go(game.route) },
            icon(game.icon), game.name, el("span", { class: "chip" }, `${L("Kỷ lục", "Best")} ${bestScore(game.id)}`)))),
      el("div", { class: "games-hero-cat" }, cat)),
    el("div", { class: "pun-grid" }, PUNS.map((p) => punCard(p, cat))));
}

function punCard(p, cat) {
  const text = el("p", { class: "pun-text" }, p.text);
  const detail = el("div", { class: "hidden" }, explanation(p));
  const btn = el("button", { class: "btn btn-sm btn-primary", onclick: () => {
    text.innerHTML = markKey(p);
    detail.classList.remove("hidden");
    btn.classList.add("hidden");
    cat.setMood("happy", 1200);
    cat.say(L("Haha, hiểu rồi chứ?", "Ha! Got it?"), 1400);
  } }, icon("laugh"), L("Hiểu chưa?", "Get it?"));

  return el("article", { class: "pun-card" },
    el("div", { class: "row", style: "gap:8px;align-items:flex-start" },
      text,
      el("button", { class: "icon-btn", title: L("Nghe", "Listen"), onclick: () => speakText(p.text, { rate: 0.95 }) }, icon("volume"))),
    btn, detail);
}

/* ======================= PUN DETECTIVE ======================= */
export function renderPunGame(ctx) {
  const game = WORDPLAY_GAMES.find((g) => g.id === "pun-detective");
  const shell = gameShell(ctx, game, { back: "puns", backLabel: "Puns", replay: game.route });
  setTimeout(() => { if (shell.alive()) playDetective(shell); }, 0);
  return shell.root;
}

function playDetective(g) {
  const list = shuffle(PUNS).slice(0, 8);
  let i = 0, correct = 0, streak = 0;
  const round = el("span", { class: "score-pill" }, `1/${list.length}`);
  g.extra.append(round);
  const box = el("div", { class: "quiz wordplay-quiz" });
  g.arena.append(box);
  g.cat.say(L("Từ nào đang giở trò đây?", "Which word is playing tricks?"), 1800);
  next();

  function next() {
    if (!g.alive()) return;
    if (i >= list.length) return g.over(L(`Bạn phá được ${correct}/${list.length} vụ chơi chữ.`, `You cracked ${correct}/${list.length} puns.`));
    const p = list[i];
    round.textContent = `${i + 1}/${list.length}`;
    const options = shuffle([p.key, ...p.decoys]);
    let answered = false;

    const text = el("p", { class: "pun-text lg center" }, p.text);
    const explain = el("div", { class: "wp-explain hidden", "aria-live": "polite" });
    const nextBtn = el("button", { class: "btn btn-primary hidden", onclick: () => { i++; next(); } },
      i + 1 >= list.length ? L("Xem kết quả", "See results") : L("Câu tiếp theo", "Next"), icon("arrow"));

    box.innerHTML = "";
    box.append(
      el("div", { class: "quiz-q" },
        el("div", { class: "tiny muted" }, L("Từ hoặc cụm từ nào tạo nên câu đùa?", "Which word or phrase makes the joke?")),
        text,
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => speakText(p.text, { rate: 0.95 }) }, icon("volume"), L("Nghe câu đùa", "Hear the joke"))),
      el("div", { class: "quiz-options" },
        options.map((o, k) => el("button", { class: "opt", onclick: (e) => answer(o, e.currentTarget) }, el("kbd", {}, k + 1), o))),
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
      const ok = o === p.key;
      box.querySelectorAll(".opt").forEach((b, k) => {
        b.disabled = true;
        if (options[k] === p.key) b.classList.add("ok");
      });
      if (ok) {
        correct++; streak++;
        g.add(10 + Math.min(streak - 1, 4) * 3);
        g.cat.react(true, streak >= 3 ? L("Thám tử lừng danh!", "Top detective!") : praise());
      } else {
        streak = 0;
        btn.classList.add("bad");
        g.cat.react(false, comfort());
      }
      text.innerHTML = markKey(p);
      explain.innerHTML = "";
      explain.append(explanation(p));
      explain.classList.remove("hidden");
      nextBtn.classList.remove("hidden");
    }
  }
}
