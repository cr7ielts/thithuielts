// Trang Từ vựng: danh sách bộ từ, chi tiết bộ, phiên ôn flashcard (SRS)
import { el, icon, toast, speakText } from "../ui.js";
import { createCat, praise, comfort } from "../cat.js";
import { DECKS, getDeck, ALL_WORDS, getWord, meaning, altMeaning } from "../data/vocab.js";
import {
  getStats, deckProgress, buildQueue, grade, previewLabel, wordStatus,
  isSaved, toggleSaved, savedWords, dueIds, NEW_PER_SESSION,
} from "./progress.js";
import { listLeaderboard } from "../store.js";
import { L } from "../i18n.js";

const STATUS_LABEL = {
  new: L("Mới", "New"),
  learning: L("Đang học", "Learning"),
  due: L("Cần ôn", "Due"),
  mastered: L("Đã thuộc", "Mastered"),
};

/* ======================= HUB ======================= */
export function renderVocabHub(ctx) {
  const s = getStats();
  const wrap = el("div", { class: "stack-lg" });

  const cat = createCat({
    size: 150, mood: s.due ? "wow" : "idle", bubbleSide: "left",
    say: s.due
      ? L(`Có ${s.due} từ đang chờ bạn ôn nè!`, `${s.due} words are waiting for you!`)
      : s.learned ? L("Hôm nay học thêm vài từ mới nhé?", "Shall we learn a few new words today?")
      : L("Bắt đầu bộ từ đầu tiên thôi!", "Let's start your first deck!"),
  });

  wrap.append(
    el("section", { class: "vocab-hero" },
      el("div", { class: "vocab-hero-text" },
        el("div", { class: "eyebrow" }, L("Từ vựng IELTS", "IELTS vocabulary")),
        el("h1", {}, L("Học từ, Mochi nhắc ôn đúng lúc", "Learn words, Mochi reminds you on time")),
        el("p", { class: "lead" },
          L("Mỗi từ quay lại ngay trước khi bạn kịp quên: nhớ tốt thì cách vài ngày, quên thì hỏi lại sau 1 phút.",
            "Each word comes back just before you forget it: remember it well and it waits a few days; forget it and it's back in a minute.")),
        el("div", { class: "row wrap", style: "gap:10px" },
          el("button", {
            class: "btn btn-primary btn-lg", disabled: s.due ? null : "",
            onclick: () => ctx.go("review/due"),
          }, icon("refresh"), s.due ? L(`Ôn ${s.due} từ đến hạn`, `Review ${s.due} due words`) : L("Chưa có từ đến hạn", "Nothing due yet")),
          el("button", { class: "btn btn-lg", onclick: () => ctx.go("games") }, icon("game"), L("Chơi mà học", "Learn by playing")))),
      el("div", { class: "vocab-hero-cat" }, cat)),
    statStrip(s)
  );

  wrap.append(
    el("div", { class: "section-head" },
      el("h2", {}, L("Bộ từ theo chủ đề", "Topic decks")),
      el("span", { class: "muted small" }, L(`${DECKS.length} bộ · ${ALL_WORDS.length} từ`, `${DECKS.length} decks · ${ALL_WORDS.length} words`))),
    el("div", { class: "deck-grid" }, DECKS.map((d) => deckCard(d, ctx)))
  );

  const saved = savedWords();
  const lb = el("div", { class: "lb-list" }, el("div", { class: "muted small" }, L("Đang tải…", "Loading…")));
  wrap.append(
    el("div", { class: "grid grid-2" },
      el("div", { class: "card" },
        el("div", { class: "card-title" }, icon("bookmark"), el("h3", {}, L("Sổ từ của tôi", "My word bank")),
          el("span", { class: "chip" }, L(`${saved.length} từ`, `${saved.length} words`))),
        saved.length
          ? el("div", { class: "stack-sm" },
              el("div", { class: "word-chips" }, saved.slice(0, 14).map((w) => el("span", { class: "word-chip" }, w.word))),
              el("div", { class: "row wrap", style: "gap:8px;margin-top:6px" },
                el("button", { class: "btn btn-sm btn-primary", onclick: () => ctx.go("review/saved") }, icon("cards"), L("Ôn sổ từ", "Review word bank")),
                el("button", { class: "btn btn-sm", onclick: () => ctx.go("games/saved") }, icon("game"), L("Chơi với sổ từ", "Play with word bank"))))
          : el("p", { class: "muted small mb-0" },
              L("Bấm biểu tượng dấu trang cạnh một từ để lưu vào đây. Sổ từ dùng được cho flashcard và mọi trò chơi.",
                "Tap the bookmark next to any word to save it here. Your word bank works with flashcards and every game."))),
      el("div", { class: "card" },
        el("div", { class: "card-title" }, icon("trophy"), el("h3", {}, L("Bảng xếp hạng XP", "XP leaderboard"))),
        lb))
  );

  listLeaderboard(8).then((rows) => {
    lb.innerHTML = "";
    if (!rows.length) { lb.append(el("div", { class: "muted small" }, L("Chưa có ai trên bảng. Ôn vài từ để ghi tên đầu tiên!", "No one here yet. Review a few words to be first!"))); return; }
    rows.forEach((r, i) => lb.append(
      el("div", { class: "lb-row" + (r.uid === ctx.user.uid ? " me" : "") },
        el("span", { class: "lb-rank" }, i + 1),
        el("span", { class: "lb-name" }, r.name || L("Học viên", "Student")),
        el("span", { class: "chip" }, `${L("Cấp", "Lv")} ${r.level}`),
        el("span", { class: "lb-xp" }, `${r.xp} XP`))));
  }).catch(() => { lb.innerHTML = ""; lb.append(el("div", { class: "muted small" }, L("Chưa tải được bảng xếp hạng.", "Couldn't load the leaderboard."))); });

  return wrap;
}

export function statStrip(s) {
  return el("div", { class: "stat-strip" },
    miniStat("flame", s.streak, L("ngày liên tiếp", "day streak"), s.doneToday ? L("Hôm nay đã học", "Done for today") : L("Học để giữ chuỗi", "Study to keep it")),
    el("div", { class: "mini-stat level" },
      el("div", { class: "ms-ico" }, icon("paw")),
      el("div", { class: "ms-body" },
        el("div", { class: "ms-v" }, `${L("Cấp", "Level")} ${s.level}`),
        el("div", { class: "xp-bar" }, el("span", { style: `width:${s.pct}%` })),
        el("div", { class: "ms-k" }, `${s.xp} / ${s.to} XP`))),
    miniStat("cards", s.learned, L("từ đã học", "words learned"), L(`${s.mastered} từ đã thuộc`, `${s.mastered} mastered`)),
    miniStat("refresh", s.due, L("từ cần ôn", "due for review"), L(`Hôm nay đã ôn ${s.reviewedToday}`, `${s.reviewedToday} reviewed today`)));
}

function miniStat(ic, v, k, sub) {
  return el("div", { class: "mini-stat" },
    el("div", { class: "ms-ico" }, icon(ic)),
    el("div", { class: "ms-body" },
      el("div", { class: "ms-v" }, String(v), el("span", { class: "ms-k inline" }, k)),
      el("div", { class: "ms-k" }, sub)));
}

function deckCard(d, ctx) {
  const p = deckProgress(d);
  return el("button", { class: "deck-card", style: `--deck:${d.color}`, onclick: () => ctx.go(`deck/${d.id}`) },
    el("div", { class: "deck-top" },
      el("div", { class: "deck-ico" }, icon(d.icon)),
      p.due ? el("span", { class: "chip chip-warn" }, L(`${p.due} cần ôn`, `${p.due} due`)) : null),
    el("div", {},
      el("h3", {}, d.title),
      el("div", { class: "muted tiny" }, d.sub)),
    el("div", { class: "deck-meta" },
      el("div", { class: "progress" }, el("span", { style: `width:${p.pct}%` })),
      el("div", { class: "row tiny muted", style: "justify-content:space-between" },
        el("span", {}, L(`${p.learned}/${p.total} từ`, `${p.learned}/${p.total} words`)),
        el("span", {}, L(`${p.mastered} đã thuộc`, `${p.mastered} mastered`)))));
}

/* ======================= CHI TIẾT BỘ TỪ ======================= */
export function renderDeck(ctx, deckId) {
  const d = getDeck(deckId);
  if (!d) return el("div", { class: "notice notice-error" }, L("Không tìm thấy bộ từ này.", "Deck not found."));
  const p = deckProgress(d);
  const fresh = d.words.filter((w) => wordStatus(w.id) === "new").length;

  const list = el("div", { class: "word-list" });
  for (const w of d.words) list.append(wordRow(w));

  return el("div", { class: "stack-lg" },
    el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("vocab") }, icon("back"), L("Tất cả bộ từ", "All decks")),
    el("section", { class: "deck-head", style: `--deck:${d.color}` },
      el("div", { class: "deck-ico lg" }, icon(d.icon)),
      el("div", { style: "flex:1;min-width:220px" },
        el("h1", { class: "mb-0" }, d.title),
        el("div", { class: "muted" }, `${d.sub} · ${L(`${p.total} từ`, `${p.total} words`)}`),
        el("div", { class: "progress", style: "margin-top:12px;max-width:360px" }, el("span", { style: `width:${p.pct}%` })),
        el("div", { class: "tiny muted", style: "margin-top:6px" },
          L(`Đã học ${p.learned} · Cần ôn ${p.due} · Đã thuộc ${p.mastered}`, `Learned ${p.learned} · Due ${p.due} · Mastered ${p.mastered}`))),
      el("div", { class: "row wrap", style: "gap:10px" },
        el("button", {
          class: "btn btn-primary btn-lg", disabled: p.due || fresh ? null : "",
          onclick: () => ctx.go(`review/${d.id}`),
        }, icon("cards"),
          p.due ? L(`Ôn ${p.due} từ`, `Review ${p.due} words`)
          : fresh ? L(`Học ${Math.min(fresh, NEW_PER_SESSION)} từ mới`, `Learn ${Math.min(fresh, NEW_PER_SESSION)} new words`)
          : L("Đã ôn hết hôm nay", "All done for today")),
        el("button", { class: "btn btn-lg", onclick: () => ctx.go(`games/${d.id}`) }, icon("game"), L("Chơi với bộ này", "Play with this deck")))),
    el("div", { class: "card card-flush" }, list));
}

function wordRow(w) {
  const st = wordStatus(w.id);
  const saveBtn = el("button", {
    class: "icon-btn save" + (isSaved(w.id) ? " on" : ""),
    title: L("Lưu vào sổ từ", "Save to word bank"), "aria-pressed": String(isSaved(w.id)),
    onclick: () => {
      const on = toggleSaved(w.id);
      saveBtn.classList.toggle("on", on);
      saveBtn.setAttribute("aria-pressed", String(on));
      toast(on ? L(`Đã lưu “${w.word}” vào sổ từ`, `Saved “${w.word}” to your word bank`)
               : L(`Đã bỏ “${w.word}” khỏi sổ từ`, `Removed “${w.word}” from your word bank`));
    },
  }, icon("bookmark"));

  return el("div", { class: "word-row" },
    el("button", { class: "icon-btn", title: L("Nghe phát âm", "Listen"), onclick: () => speakText(w.word) }, icon("volume")),
    el("div", { class: "word-main" },
      el("div", { class: "row wrap", style: "gap:8px" },
        el("strong", { class: "word" }, w.word),
        el("span", { class: "ipa" }, w.ipa),
        el("span", { class: "pos" }, w.pos)),
      el("div", { class: "vi" }, meaning(w), el("span", { class: "alt" }, ` · ${altMeaning(w)}`)),
      el("div", { class: "example" }, w.example)),
    el("span", { class: `status status-${st}` }, STATUS_LABEL[st]),
    saveBtn);
}

/* ======================= PHIÊN ÔN FLASHCARD ======================= */
export function renderReview(ctx, source) {
  let words;
  let title;
  if (source === "due") {
    words = dueIds().map(getWord).filter(Boolean);
    title = L("Ôn từ đến hạn", "Due words");
  } else if (source === "saved") {
    words = savedWords();
    title = L("Ôn sổ từ", "Word bank");
  } else {
    const d = getDeck(source);
    words = d ? d.words : [];
    title = d ? d.title : L("Ôn tập", "Review");
  }

  // Sổ từ: ôn cả những từ chưa đến hạn để luyện thêm
  const queue = source === "saved" ? [...words] : buildQueue(words);
  const backTo = source === "due" || source === "saved" ? "vocab" : `deck/${source}`;

  const wrap = el("div", { class: "review" });
  if (!queue.length) {
    const cat = createCat({ size: 170, mood: "sleep", say: L("Hết từ để ôn rồi, Mochi đi ngủ đây…", "Nothing left to review — Mochi's taking a nap…") });
    wrap.append(el("div", { class: "empty-state" }, cat,
      el("h2", {}, L("Không còn từ nào cần ôn", "Nothing to review")),
      el("p", { class: "muted" }, L("Quay lại sau nhé — Mochi sẽ nhắc khi có từ đến hạn.", "Come back later — Mochi will tell you when words are due.")),
      el("button", { class: "btn btn-primary", onclick: () => ctx.go(backTo) }, L("Quay lại", "Go back"))));
    return wrap;
  }

  const total = queue.length;
  let done = 0, again = 0, xpGained = 0;
  const cat = createCat({ size: 120, mood: "idle", bubbleSide: "left" });
  const progress = el("div", { class: "progress" }, el("span", { style: "width:0%" }));
  const counter = el("span", { class: "chip" }, `0 / ${total}`);
  const stage = el("div", { class: "review-stage" });

  wrap.append(
    el("div", { class: "review-top" },
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go(backTo) }, icon("x"), L("Thoát", "Exit")),
      el("div", { style: "flex:1" }, el("div", { class: "tiny muted", style: "font-weight:800" }, title), progress),
      counter),
    el("div", { class: "review-body" }, stage, el("div", { class: "review-cat" }, cat)));

  const onKey = (e) => {
    if (!wrap.isConnected) { window.removeEventListener("keydown", onKey); return; }
    if (e.target?.matches?.("input, textarea, select")) return;
    if (e.key === " ") e.preventDefault();
    stage.dispatchEvent(new CustomEvent("key", { detail: e.key }));
  };
  window.addEventListener("keydown", onKey);

  showCard();

  function showCard() {
    if (!queue.length) return finish();
    const w = queue[0];
    const isNew = wordStatus(w.id) === "new";
    stage.innerHTML = "";

    const card = el("div", { class: "flashcard", tabindex: "0", role: "button", "aria-label": L("Lật thẻ", "Flip card") },
      el("div", { class: "fc-inner" },
        el("div", { class: "fc-face fc-front" },
          isNew ? el("span", { class: "chip chip-new" }, L("Từ mới", "New word")) : null,
          el("div", { class: "fc-word" }, w.word),
          el("div", { class: "ipa lg" }, w.ipa),
          el("div", { class: "tiny muted fc-hint" }, L("Nhấn Space hoặc bấm vào thẻ để lật", "Press Space or tap the card to flip"))),
        el("div", { class: "fc-face fc-back" },
          el("div", { class: "row", style: "gap:8px;justify-content:center" },
            el("span", { class: "fc-word sm" }, w.word), el("span", { class: "pos" }, w.pos)),
          el("div", { class: "fc-vi" }, meaning(w)),
          el("div", { class: "muted small" }, altMeaning(w)),
          el("div", { class: "example center" }, w.example))));

    const speakBtn = el("button", { class: "icon-btn lg", title: L("Nghe phát âm (P)", "Listen (P)"), onclick: (e) => { e.stopPropagation(); speakText(w.word); } }, icon("volume"));
    const saveBtn = el("button", {
      class: "icon-btn lg save" + (isSaved(w.id) ? " on" : ""), title: L("Lưu vào sổ từ", "Save to word bank"),
      onclick: (e) => { e.stopPropagation(); saveBtn.classList.toggle("on", toggleSaved(w.id)); },
    }, icon("bookmark"));

    const grades = el("div", { class: "grade-row hidden" },
      [[L("Quên", "Again"), 0, "g-again", "1"], [L("Khó", "Hard"), 1, "g-hard", "2"], [L("Nhớ", "Good"), 2, "g-good", "3"], [L("Dễ", "Easy"), 3, "g-easy", "4"]]
        .map(([label, g, cls, k]) =>
          el("button", { class: `grade-btn ${cls}`, onclick: () => rate(g) },
            el("span", { class: "gb-label" }, label),
            el("span", { class: "gb-when" }, previewLabel(w.id, g)),
            el("kbd", {}, k))));

    const flipBtn = el("button", { class: "btn btn-primary btn-lg btn-block", onclick: flip }, L("Lật thẻ", "Show answer"));

    stage.append(card, el("div", { class: "row", style: "gap:10px;justify-content:center" }, speakBtn, saveBtn), flipBtn, grades);

    let flipped = false;
    function flip() {
      if (flipped) return;
      flipped = true;
      card.classList.add("flipped");
      flipBtn.classList.add("hidden");
      grades.classList.remove("hidden");
      cat.setMood("think", 900);
      speakText(w.word);
    }
    card.onclick = flip;

    // Phím tắt: Space/Enter lật thẻ, P nghe lại, 1–4 chấm mức nhớ
    if (stage._handler) stage.removeEventListener("key", stage._handler);
    stage._handler = (ev) => {
      const k = ev.detail;
      if (k === " " || k === "Enter") flip();
      else if (k === "p" || k === "P") speakText(w.word);
      else if (flipped && ["1", "2", "3", "4"].includes(k)) rate(Number(k) - 1);
    };
    stage.addEventListener("key", stage._handler);

    let rated = false;
    function rate(g) {
      if (rated) return;
      rated = true;
      const before = getStats().xp;
      grade(w.id, g);
      xpGained += getStats().xp - before;
      queue.shift();
      if (g === 0) {
        again++;
        queue.splice(Math.min(3, queue.length), 0, w); // hỏi lại sau vài thẻ
        cat.react(false, comfort());
      } else {
        done++;
        cat.react(true, g >= 2 ? praise() : L("Cố thêm chút nữa!", "Keep going!"));
      }
      progress.firstChild.style.width = `${Math.round((done / total) * 100)}%`;
      counter.textContent = `${done} / ${total}`;
      setTimeout(showCard, 260);
    }
  }

  function finish() {
    stage.innerHTML = "";
    window.removeEventListener("keydown", onKey);
    cat.setMood("happy");
    cat.say(L("Xong phiên ôn! Mochi tự hào về bạn", "Session done! Mochi is proud of you"), 0);
    progress.firstChild.style.width = "100%";
    stage.append(
      el("div", { class: "review-done" },
        el("h2", {}, L("Hoàn thành phiên ôn", "Review complete")),
        el("div", { class: "done-stats" },
          el("div", {}, el("b", {}, total), el("span", {}, L("từ đã ôn", "words reviewed"))),
          el("div", {}, el("b", {}, again), el("span", {}, L("lần quên", "forgotten"))),
          el("div", {}, el("b", {}, `+${xpGained}`), el("span", {}, "XP"))),
        el("div", { class: "row wrap", style: "gap:10px;justify-content:center" },
          el("button", { class: "btn btn-primary", onclick: () => ctx.go(backTo) }, L("Xong", "Done")),
          el("button", { class: "btn", onclick: () => ctx.go("games") }, icon("game"), L("Chơi củng cố", "Practise with a game")))));
  }

  return wrap;
}
