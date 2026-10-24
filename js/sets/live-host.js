// Live game — màn hình giáo viên (chiếu lên bảng)
import { el, icon, toast, shuffle, confirmDialog } from "../ui.js";
import { L } from "../i18n.js";
import { liveDb } from "./store.js";
import { qrSvg } from "./qr.js";
import {
  OPT_STYLE, TEAM_STYLE, MODE_INFO, isTeamMode, teamName, gamePath, playerPath, joinUrl, pointsFor,
  watchWhile, bar, leaderboard, teamBoard,
} from "./live.js";

export function renderLiveHost(ctx, pin) {
  const root = el("div", { class: "live-host" });
  let game = null, players = [], key = null, ending = false, nTeams = 0;
  const inflight = new Set();
  const view = { timer: null, answered: null };

  liveDb.get(`liveKeys/${pin}`).then((k) => { key = k?.key || null; paint(); });
  watchWhile(root, gamePath(pin), (g) => { game = g; onGame(); });
  watchWhile(root, `${gamePath(pin)}/players`, (ps) => { players = ps.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)); onPlayers(); }, true);
  const tick = setInterval(() => {
    if (!root.isConnected) { clearInterval(tick); return; }
    if (game?.status === "question" && game.mode !== "race") {
      const left = Math.max(0, (game.qEndsAt - Date.now()) / 1000);
      if (view.timer) { view.timer.textContent = Math.ceil(left); view.timer.parentElement.classList.toggle("low", left <= 5); }
      if (left <= 0) endQuestion();
    }
  }, 250);

  const update = (patch) => liveDb.update(gamePath(pin), patch);

  function onGame() {
    if (game && game.hostUid !== ctx.user.uid) { root.innerHTML = ""; root.append(el("div", { class: "notice notice-error" }, L("Phòng này không phải của bạn.", "This room belongs to someone else."))); game = null; return; }
    paint();
  }

  function onPlayers() {
    if (!game) return;
    // người vào muộn khi đã chia đội: xếp vào đội ít người nhất
    if (isTeamMode(game.mode) && game.teams?.length) {
      const loose = players.filter((p) => p.team === "" || p.team === undefined).filter((p) => !inflight.has(p.uid));
      const sizes = game.teams.map((t) => players.filter((p) => String(p.team) === String(t.id)).length);
      loose.forEach((p) => {
        const i = sizes.indexOf(Math.min(...sizes)); sizes[i]++;
        inflight.add(p.uid);
        liveDb.update(playerPath(pin, p.uid), { team: game.teams[i].id }).finally(() => inflight.delete(p.uid));
      });
    }
    if (game.status === "question" && game.mode === "race") processTaps();
    else if (game.status === "question" && players.length && players.every((p) => p.answers?.[game.qIndex])) endQuestion();
    paint();
  }

  /* ---------- Điều khiển ---------- */
  async function assignTeams(k) {
    const n = players.length;
    if (game.mode === "race") k = Math.max(k, Math.ceil(n / 4));
    k = Math.max(2, Math.min(8, k));
    if (n < 2) { toast(L("Cần ít nhất 2 người chơi để chia đội.", "You need at least 2 players to make teams."), "error"); return; }
    const teams = [...Array(k)].map((_, id) => ({ id, progress: 0, seq: 0, ln: 0, last: null, order: shuffle([...Array(game.total).keys()]) }));
    const ups = shuffle(players).map((p, i) => [playerPath(pin, p.uid), { team: i % k }]);
    await liveDb.updateMany([...ups, [gamePath(pin), { teams }]]);
  }

  async function start() {
    if (!key) { toast(L("Đang tải đáp án, thử lại sau giây lát.", "Answers still loading, try again in a moment."), "error"); return; }
    if (isTeamMode(game.mode) && !game.teams?.length) { toast(L("Hãy chia đội trước.", "Make the teams first."), "error"); return; }
    if (game.mode === "race") await update({ status: "question", qStartAt: Date.now() });
    else await startQuestion(0);
  }
  async function startQuestion(i) {
    ending = false;
    const now = Date.now();
    await update({ status: "question", qIndex: i, qStartAt: now, qEndsAt: now + game.qSecs * 1000, correct: -1, counts: null });
  }

  async function endQuestion() {
    if (ending || !key || game.status !== "question") return;
    ending = true;
    const qi = game.qIndex, right = key[qi];
    const counts = game.qs[qi].o.map(() => 0);
    const ups = players.map((p) => {
      const a = p.answers?.[qi];
      const ok = !!a && a.c === right;
      if (a && counts[a.c] !== undefined) counts[a.c]++;
      const pts = pointsFor(ok, a?.ms ?? 0, game.qSecs, p.streak || 0);
      return [playerPath(pin, p.uid), { score: (p.score || 0) + pts, streak: ok ? (p.streak || 0) + 1 : 0, last: { q: qi, ok, pts, c: a ? a.c : -1 } }];
    });
    try { await liveDb.updateMany([...ups, [gamePath(pin), { status: "reveal", correct: right, counts }]]); }
    catch (err) { console.warn(err); ending = false; toast(L("Không chốt được câu hỏi, thử bấm lại.", "Couldn't close the question; try again."), "error"); }
  }

  function processTaps() {
    if (!key || !game.teams?.length) return;
    for (const p of players) {
      const tap = p.tap;
      if (!tap || tap.n <= (p.tapDone || 0)) continue;
      const id = `${p.uid}:${tap.n}`;
      if (inflight.has(id)) continue;
      inflight.add(id);
      const t = game.teams.find((x) => String(x.id) === String(p.team));
      const patch = { tapDone: tap.n };
      const gamePatch = {};
      if (t && tap.seq === t.seq) {
        const ok = tap.opt === key[t.order[t.seq % game.total]];
        t.progress = ok ? t.progress + 1 : 0;
        t.seq += 1; t.ln = (t.ln || 0) + 1; t.last = { ok, by: p.name, n: t.ln };
        if (ok) { patch.score = (p.score || 0) + 100; patch.right = (p.right || 0) + 1; }
        gamePatch.teams = game.teams;
        if (t.progress >= game.goal) { gamePatch.status = "finished"; gamePatch.winner = t.id; }
      }
      const list = [[playerPath(pin, p.uid), patch]];
      if (Object.keys(gamePatch).length) list.push([gamePath(pin), gamePatch]);
      liveDb.updateMany(list).catch((e) => console.warn(e)).finally(() => inflight.delete(id));
    }
  }

  async function closeRoom() {
    if (!(await confirmDialog({ title: L("Đóng phòng?", "Close the room?"), body: L("Người chơi sẽ bị đưa ra khỏi phòng và kết quả bị xoá.", "Players will be removed and results deleted."), okText: L("Đóng phòng", "Close room"), danger: true }))) return;
    await Promise.all(players.map((p) => liveDb.del(playerPath(pin, p.uid)).catch(() => {})));
    await liveDb.del(gamePath(pin)).catch(() => {});
    await liveDb.del(`liveKeys/${pin}`).catch(() => {});
    ctx.go("sets");
  }

  /* ---------- Giao diện ---------- */
  const head = () => el("div", { class: "lv-head" },
    el("div", {}, el("div", { class: "eyebrow" }, game.title), el("div", { class: "muted small" }, MODE_INFO[game.mode].name)),
    el("div", { class: "spacer" }),
    el("div", { class: "lv-pin-mini" }, "PIN ", el("b", {}, pin)),
    el("button", { class: "btn btn-sm btn-danger", onclick: closeRoom }, icon("x"), L("Đóng phòng", "Close room")));

  function paint() {
    if (!game) { if (!root.childElementCount) root.append(el("div", { class: "muted" }, L("Đang tải phòng…", "Loading room…"))); return; }
    root.innerHTML = "";
    view.timer = view.answered = null;
    root.append(head());
    ({ lobby, question, reveal, finished }[game.status] || lobby)();
  }

  function playerChips() {
    return el("div", { class: "lv-chips" }, players.map((p) => {
      const t = game.teams?.find((x) => String(x.id) === String(p.team));
      return el("span", { class: "lv-chip", style: t ? `--tc:${TEAM_STYLE[t.id % 8][2]}` : null },
        p.name, el("button", { class: "lv-kick", title: L("Mời ra", "Remove"), "aria-label": L("Mời ra", "Remove"), onclick: () => liveDb.del(playerPath(pin, p.uid)) }, "×"));
    }));
  }

  function lobby() {
    const qr = el("div", { class: "qr-slot" });
    qrSvg(joinUrl(pin), 240).then((n) => qr.append(n)).catch(() => qr.append(el("div", { class: "muted small" }, L("Không tạo được mã QR.", "QR unavailable."))));
    const team = isTeamMode(game.mode);
    if (!nTeams) nTeams = Math.max(2, Math.min(6, Math.ceil(players.length / 3) || 2));
    const startBtn = el("button", { class: "btn btn-primary btn-lg", disabled: players.length && key && (!team || game.teams?.length) ? null : "", onclick: start },
      icon("play"), L("Bắt đầu", "Start"));
    const teamBox = team ? el("div", { class: "card stack-sm" },
      el("div", { class: "row wrap", style: "gap:10px" },
        el("b", {}, L("Chia đội", "Teams")),
        el("input", { type: "number", min: 2, max: 8, value: nTeams, class: "num-input", "aria-label": L("Số đội", "Number of teams"), oninput: (e) => (nTeams = +e.target.value || 2) }),
        el("button", { class: "btn btn-sm", onclick: () => assignTeams(nTeams) }, icon("refresh"), game.teams?.length ? L("Chia lại", "Reshuffle") : L("Chia ngẫu nhiên", "Randomise")),
        game.mode === "race" ? el("span", { class: "muted small" }, L("Mỗi đội tối đa 4 người là hợp lý.", "Teams of up to 4 work best.")) : null),
      game.teams?.length ? el("div", { class: "lv-teams" }, game.teams.map((t) => el("div", { class: "lv-team", style: `--tc:${TEAM_STYLE[t.id % 8][2]}` },
        el("b", {}, teamName(t)), el("div", { class: "muted small" }, players.filter((p) => String(p.team) === String(t.id)).map((p) => p.name).join(", ") || "—")))) : null) : null;

    root.append(el("div", { class: "lv-lobby" },
      el("div", { class: "card lv-join-card" },
        el("div", { class: "muted" }, L("Vào web, mở mục “Vào phòng live” rồi nhập mã", "Open the site, choose “Join a live game” and enter")),
        el("div", { class: "lv-pin" }, pin), qr,
        el("div", { class: "muted small" }, L("Hoặc quét mã QR bằng camera điện thoại", "Or scan the QR code with a phone camera")),
        el("code", { class: "lv-url" }, joinUrl(pin))),
      el("div", { class: "stack" },
        el("div", { class: "card stack-sm" }, el("div", { class: "row" }, el("h3", { style: "margin:0" }, L("Người chơi", "Players")), el("span", { class: "chip" }, players.length)),
          players.length ? playerChips() : el("p", { class: "muted" }, L("Chưa có ai. Đang chờ học sinh vào…", "Nobody yet. Waiting for students…"))),
        teamBox, startBtn)));
  }

  function optTiles(q, { correct = -1, counts = null } = {}) {
    const total = counts ? Math.max(1, counts.reduce((a, b) => a + b, 0)) : 1;
    return el("div", { class: "lv-opts" }, q.o.map((o, i) => el("div", { class: "lv-opt" + (correct >= 0 ? (i === correct ? " right" : " dim") : ""), style: `--oc:${OPT_STYLE[i].color}` },
      el("span", { class: "lv-shape" }, OPT_STYLE[i].shape), el("span", { class: "lv-opt-t" }, o),
      counts ? el("span", { class: "lv-count" }, counts[i], el("small", {}, ` (${Math.round((counts[i] / total) * 100)}%)`)) : null)));
  }

  function question() {
    if (game.mode === "race") return race();
    const q = game.qs[game.qIndex];
    const answered = players.filter((p) => p.answers?.[game.qIndex]).length;
    view.timer = el("b", {}, Math.max(0, Math.ceil((game.qEndsAt - Date.now()) / 1000)));
    root.append(el("div", { class: "lv-stage" },
      el("div", { class: "row wrap", style: "gap:12px" },
        el("span", { class: "chip" }, L(`Câu ${game.qIndex + 1}/${game.total}`, `Question ${game.qIndex + 1}/${game.total}`)),
        el("div", { class: "spacer" }),
        el("span", { class: "chip" }, icon("users"), `${answered}/${players.length}`),
        el("div", { class: "score-pill timer-pill" }, icon("clock"), view.timer)),
      el("div", { class: "lv-prompt" }, q.k ? el("div", { class: "lv-kind" }, q.k) : null, q.p),
      optTiles(q),
      el("div", { class: "row", style: "justify-content:center" }, el("button", { class: "btn", onclick: endQuestion }, L("Kết thúc câu này", "End this question")))));
  }

  function reveal() {
    const q = game.qs[game.qIndex];
    const last = game.qIndex + 1 >= game.total;
    root.append(el("div", { class: "lv-stage" },
      el("div", { class: "row wrap" }, el("span", { class: "chip" }, L(`Câu ${game.qIndex + 1}/${game.total}`, `Question ${game.qIndex + 1}/${game.total}`)), el("div", { class: "spacer" }),
        el("button", { class: "btn btn-primary btn-lg", onclick: () => (last ? update({ status: "finished" }) : startQuestion(game.qIndex + 1)) },
          last ? L("Xem kết quả", "See results") : L("Câu tiếp theo", "Next question"), icon("arrow"))),
      el("div", { class: "lv-prompt" }, q.k ? el("div", { class: "lv-kind" }, q.k) : null, q.p),
      optTiles(q, { correct: game.correct, counts: game.counts }),
      el("div", { class: "grid grid-2" },
        el("div", { class: "card" }, el("h3", {}, L("Bảng xếp hạng", "Leaderboard")), leaderboard(players, game, { limit: 5 })),
        isTeamMode(game.mode) ? el("div", { class: "card" }, el("h3", {}, L("Các đội", "Teams")), teamBoard(players, game)) : null)));
  }

  function race() {
    const goal = game.goal;
    root.append(el("div", { class: "lv-stage" },
      el("div", { class: "row wrap" }, el("span", { class: "chip" }, L(`Đích: ${goal} câu đúng liên tiếp`, `Goal: ${goal} correct in a row`)), el("div", { class: "spacer" }),
        el("button", { class: "btn", onclick: () => update({ status: "finished", winner: [...game.teams].sort((a, b) => b.progress - a.progress)[0]?.id ?? -1 }) }, L("Kết thúc cuộc đua", "End the race"))),
      el("div", { class: "lv-race" }, game.teams.map((t) => {
        const c = TEAM_STYLE[t.id % 8][2];
        return el("div", { class: "lv-lane", style: `--tc:${c}` },
          el("div", { class: "lv-lane-name" }, teamName(t), el("small", {}, ` · ${players.filter((p) => String(p.team) === String(t.id)).length}`)),
          el("div", { class: "lv-track" }, el("span", { class: "lv-run", style: `width:${Math.min(100, (t.progress / goal) * 100)}%` }), el("span", { class: "lv-flag" }, "🏁")),
          el("div", { class: "lv-lane-n" }, `${t.progress}/${goal}`),
          t.last ? el("span", { class: "chip " + (t.last.ok ? "chip-ok" : "chip-bad") }, t.last.ok ? "✓" : L("Sai – về vạch xuất phát", "Missed – back to start")) : null);
      }))));
  }

  function finished() {
    const win = game.mode === "race" && game.winner >= 0 ? game.teams.find((t) => String(t.id) === String(game.winner)) : null;
    root.append(el("div", { class: "lv-stage" },
      win ? el("div", { class: "lv-winner", style: `--tc:${TEAM_STYLE[win.id % 8][2]}` }, icon("trophy"), L("Đội thắng: ", "Winning team: "), el("b", {}, teamName(win))) : el("h2", { class: "center" }, L("Kết quả cuối cùng", "Final results")),
      el("div", { class: "grid grid-2" },
        el("div", { class: "card" }, el("h3", {}, L("Cá nhân", "Players")), leaderboard(players, game, { limit: 10 })),
        isTeamMode(game.mode) ? el("div", { class: "card" }, el("h3", {}, L("Các đội", "Teams")),
          game.mode === "race" ? el("div", { class: "lv-board" }, [...game.teams].sort((a, b) => b.progress - a.progress).map((t, i) => el("div", { class: "lv-row" },
            el("span", { class: "lv-rank" }, i + 1), el("span", { class: "lv-name", style: `color:${TEAM_STYLE[t.id % 8][2]}` }, teamName(t)), bar((t.progress / game.goal) * 100, TEAM_STYLE[t.id % 8][2]), el("b", { class: "lv-score" }, `${t.progress}/${game.goal}`))))
            : teamBoard(players, game)) : null),
      el("div", { class: "row wrap", style: "gap:10px;justify-content:center" },
        el("button", { class: "btn btn-primary", onclick: closeRoom }, L("Đóng phòng", "Close room")),
        el("button", { class: "btn", onclick: () => ctx.go("sets") }, L("Về học phần", "Back to sets")))));
  }

  paint();
  return root;
}
