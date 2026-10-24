// Live game — màn hình người chơi (điện thoại)
import { el, icon } from "../ui.js";
import { L } from "../i18n.js";
import { liveDb } from "./store.js";
import { OPT_STYLE, TEAM_STYLE, MODE_INFO, isTeamMode, teamName, gamePath, playerPath, watchWhile, bar } from "./live.js";

export function renderLivePlay(ctx, pin) {
  const root = el("div", { class: "live-play" });
  let game = null, me = null, players = [], sig = "", shownAt = 0, shownQ = -2, leftTimer = 0;
  const ready = { g: false, m: false, p: false };   // chờ cả ba nguồn dữ liệu trả lời lần đầu rồi mới vẽ
  const myPath = playerPath(pin, ctx.user.uid);

  watchWhile(root, gamePath(pin), (g) => { game = g; ready.g = true; refresh(); });
  watchWhile(root, myPath, (p) => { me = p; ready.m = true; refresh(); });
  watchWhile(root, `${gamePath(pin)}/players`, (ps) => { players = ps; ready.p = true; refresh(); }, true);

  const myTeam = () => (game?.teams || []).find((t) => me && String(t.id) === String(me.team));

  function signature() {
    if (!game) return "none";
    if (!me) return "nome";
    const t = myTeam();
    const mates = t ? players.filter((p) => String(p.team) === String(t.id)).map((p) => p.uid).join(",") : "";
    if (game.mode === "race" && game.status === "question") return `race|${t ? `${t.seq}|${t.progress}|${t.last?.n || 0}` : "noteam"}|${mates}`;
    const rank = [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).findIndex((p) => p.uid === me.uid);
    return [game.status, game.qIndex, game.correct, me.answers?.[game.qIndex] ? "a" : "-", me.last?.q, me.score, rank, t?.id ?? "", mates, game.winner ?? "", players.length].join("|");
  }

  function refresh() {
    if (!ready.g || !ready.m || !ready.p) return;
    const s = signature();
    if (s === sig) return;
    sig = s;
    paint();
  }

  const shell = (...kids) => { clearInterval(leftTimer); root.innerHTML = ""; root.append(el("div", { class: "lp-wrap" }, ...kids)); };
  const who = () => el("div", { class: "lp-who" }, el("b", {}, me.name),
    el("span", { class: "chip" }, `${me.score || 0} ${L("điểm", "pts")}`),
    myTeam() ? el("span", { class: "chip", style: `background:${TEAM_STYLE[myTeam().id % 8][2]};color:#fff` }, teamName(myTeam())) : null);
  const leave = () => el("button", { class: "btn btn-ghost btn-sm", onclick: async () => { await liveDb.del(myPath).catch(() => {}); ctx.go("live"); } }, L("Rời phòng", "Leave"));

  function paint() {
    if (!game) return shell(el("div", { class: "card center stack" }, el("h2", {}, L("Phòng đã đóng hoặc không tồn tại", "This room is closed or doesn't exist")),
      el("button", { class: "btn btn-primary", onclick: () => ctx.go("live") }, L("Nhập mã khác", "Enter another code"))));
    if (!me) {
      // bị mời ra, hoặc mở link QR khi chưa vào phòng: vào lại
      return shell(el("div", { class: "card center stack" }, el("h2", {}, game.title), el("p", { class: "muted" }, L("Bạn chưa ở trong phòng này.", "You're not in this room yet.")),
        el("button", { class: "btn btn-primary btn-lg", onclick: async () => {
          await liveDb.set(myPath, { uid: ctx.user.uid, name: (ctx.user.displayName || ctx.user.email || L("Học viên", "Student")).slice(0, 30), team: "", score: 0, streak: 0, answers: {}, joinedAt: Date.now() });
        } }, icon("play"), L("Vào phòng", "Join"))));
    }
    if (game.status === "lobby") return lobby();
    if (game.status === "question") return game.mode === "race" ? race() : question();
    if (game.status === "reveal") return reveal();
    return finished();
  }

  function lobby() {
    const t = myTeam();
    const mates = t ? players.filter((p) => String(p.team) === String(t.id)) : [];
    shell(who(),
      el("div", { class: "card center stack lp-wait" },
        el("div", { class: "lp-pulse" }, icon("users")),
        el("h2", {}, L("Bạn đã vào phòng!", "You're in!")),
        el("p", { class: "muted" }, game.title, " · ", MODE_INFO[game.mode].name),
        isTeamMode(game.mode) ? (t
          ? el("div", { class: "lv-team", style: `--tc:${TEAM_STYLE[t.id % 8][2]}` }, el("b", {}, L("Đội của bạn: ", "Your team: "), teamName(t)), el("div", { class: "muted small" }, mates.map((p) => p.name).join(", ")))
          : el("p", { class: "muted" }, L("Chờ giáo viên chia đội…", "Waiting for the teacher to make teams…")))
          : null,
        el("p", { class: "muted small" }, L("Nhìn lên màn hình chung. Giáo viên bắt đầu là chơi ngay.", "Watch the main screen — play starts when the teacher presses Start.")),
        leave()));
  }

  function question() {
    const qi = game.qIndex, q = game.qs[qi];
    const mine = me.answers?.[qi];
    if (shownQ !== qi) { shownQ = qi; shownAt = performance.now(); }
    const bits = [who(), el("div", { class: "muted small center" }, L(`Câu ${qi + 1}/${game.total}`, `Question ${qi + 1}/${game.total}`))];
    if (mine) {
      shell(...bits, el("div", { class: "card center stack lp-wait" }, el("div", { class: "lp-pulse" }, icon("check")), el("h2", {}, L("Đã gửi đáp án", "Answer sent")),
        el("p", { class: "muted" }, L("Chờ các bạn khác và giáo viên…", "Waiting for the others…")),
        el("div", { class: "lp-picked", style: `--oc:${OPT_STYLE[mine.c]?.color}` }, OPT_STYLE[mine.c]?.shape, " ", q.o[mine.c] || "")));
      return;
    }
    const meter = bar(100, "var(--copper)");
    let sent = false;
    const tiles = q.o.map((o, i) => el("button", { class: "lp-opt", style: `--oc:${OPT_STYLE[i].color}`, onclick: () => {
      if (sent) return; sent = true;
      const ms = Math.round(performance.now() - shownAt);
      const answers = { ...(me.answers || {}), [qi]: { c: i, ms } };
      me.answers = answers;
      sig = ""; refresh();
      liveDb.update(myPath, { answers }).catch((e) => console.warn(e));
    } }, el("span", { class: "lv-shape" }, OPT_STYLE[i].shape), el("span", {}, o)));
    shell(...bits, meter, el("div", { class: "lp-prompt" }, q.k ? el("div", { class: "lv-kind" }, q.k) : null, q.p), el("div", { class: "lp-opts" }, tiles));
    const t0 = shownAt, secs = game.qSecs;
    leftTimer = setInterval(() => {
      if (!root.isConnected) { clearInterval(leftTimer); return; }
      const left = Math.max(0, secs - (performance.now() - t0) / 1000);
      meter.firstChild.style.width = `${(left / secs) * 100}%`;
      if (left <= 0) { sent = true; tiles.forEach((b) => (b.disabled = true)); clearInterval(leftTimer); }
    }, 200);
  }

  function reveal() {
    const qi = game.qIndex, q = game.qs[qi];
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const rank = sorted.findIndex((p) => p.uid === me.uid) + 1;
    const mineThis = me.last?.q === qi ? me.last : null;
    const got = me.answers?.[qi];
    shell(who(),
      el("div", { class: "card center stack lp-result " + (mineThis?.ok ? "ok" : "bad") },
        el("div", { class: "lp-big" }, mineThis?.ok ? "✓" : got ? "✗" : "…"),
        el("h2", {}, mineThis?.ok ? L("Chính xác!", "Correct!") : got ? L("Chưa đúng", "Not quite") : L("Hết giờ", "Time's up")),
        mineThis?.ok ? el("div", { class: "chip chip-xp" }, `+${mineThis.pts}`) : null,
        mineThis?.ok && (me.streak || 0) > 1 ? el("div", { class: "muted" }, L(`Chuỗi ${me.streak} câu đúng`, `${me.streak} in a row`)) : null,
        el("div", { class: "muted small" }, L("Đáp án đúng: ", "Correct answer: "), el("b", {}, q.o[game.correct] ?? "")),
        el("div", { class: "lp-rank" }, L(`Hạng ${rank}/${players.length}`, `Rank ${rank} of ${players.length}`))));
  }

  function race() {
    const t = myTeam();
    if (!t) return shell(who(), el("div", { class: "card center stack" }, el("h2", {}, L("Chờ xếp đội…", "Waiting for a team…")), leave()));
    const mates = players.filter((p) => String(p.team) === String(t.id)).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0) || (a.uid < b.uid ? -1 : 1));
    const idx = Math.max(0, mates.findIndex((p) => p.uid === me.uid));
    const q = game.qs[t.order[t.seq % game.total]];
    const slots = Math.max(1, Math.min(4, mates.length, q.o.length));
    const mine = q.o.map((o, i) => [o, i]).filter(([, i]) => i % slots === idx % slots);
    let sent = false;
    const color = TEAM_STYLE[t.id % 8][2];
    const fb = t.last ? el("div", { class: "lp-fb " + (t.last.ok ? "ok" : "bad") },
      t.last.ok ? L(`✓ ${t.last.by} chọn đúng! Cả nhóm tiến lên.`, `✓ ${t.last.by} got it! The team moves up.`) : L(`✗ ${t.last.by} chọn sai. Nhóm về vạch xuất phát!`, `✗ ${t.last.by} missed. Back to the start!`)) : null;
    shell(who(),
      el("div", { class: "lv-lane", style: `--tc:${color}` }, el("div", { class: "lv-lane-name" }, teamName(t)),
        el("div", { class: "lv-track" }, el("span", { class: "lv-run", style: `width:${Math.min(100, (t.progress / game.goal) * 100)}%` }), el("span", { class: "lv-flag" }, "🏁")),
        el("div", { class: "lv-lane-n" }, `${t.progress}/${game.goal}`)),
      fb,
      el("div", { class: "lp-prompt" }, q.k ? el("div", { class: "lv-kind" }, q.k) : null, q.p),
      el("p", { class: "muted small center" }, L("Bạn chỉ thấy một phần đáp án. Bàn với đồng đội: ai giữ đáp án đúng thì bấm!", "You only see some of the answers. Talk to your team — whoever holds the right one taps it!")),
      el("div", { class: "lp-opts" }, mine.map(([o, i]) => el("button", { class: "lp-opt", style: `--oc:${OPT_STYLE[i].color}`, onclick: () => {
        if (sent) return; sent = true;
        liveDb.update(myPath, { tap: { seq: t.seq, opt: i, n: (me.tap?.n || 0) + 1 } }).catch((e) => console.warn(e));
      } }, el("span", { class: "lv-shape" }, OPT_STYLE[i].shape), el("span", {}, o)))),
      el("div", { class: "muted small center" }, L("Đội: ", "Team: "), mates.map((p) => p.name).join(", ")));
  }

  function finished() {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const rank = sorted.findIndex((p) => p.uid === me.uid) + 1;
    const t = myTeam();
    const won = game.mode === "race" && t && String(game.winner) === String(t.id);
    shell(who(), el("div", { class: "card center stack lp-result " + (rank === 1 || won ? "ok" : "") },
      el("div", { class: "lp-big" }, won || rank === 1 ? "🏆" : "🎉"),
      el("h2", {}, game.mode === "race" ? (won ? L("Đội bạn thắng!", "Your team won!") : L("Cuộc đua kết thúc", "Race over")) : L(`Bạn xếp hạng ${rank}/${players.length}`, `You placed ${rank} of ${players.length}`)),
      el("div", { class: "chip chip-xp" }, `${me.score || 0} ${L("điểm", "pts")}`),
      el("button", { class: "btn btn-primary", onclick: () => ctx.go("live") }, L("Xong", "Done"))));
  }

  root.append(el("div", { class: "muted center" }, L("Đang vào phòng…", "Joining…")));
  return root;
}
