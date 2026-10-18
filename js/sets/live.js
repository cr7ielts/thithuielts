// Live game: phần dùng chung, trang tạo phòng (giáo viên) và trang vào phòng (học sinh).
// Dữ liệu: liveGames/<pin> (trạng thái + câu hỏi) · liveGames/<pin>/players/<uid> · liveKeys/<pin> (đáp án, chỉ giáo viên đọc).
import { el, icon, toast, shuffle } from "../ui.js";
import { L } from "../i18n.js";
import { isAdmin } from "../firebase.js";
import { liveDb, listMySets, listTeacherSets } from "./store.js";
import { resolveSet, buildLiveQuestions, DECKS } from "./cards.js";
import { startScanner } from "./qr.js";

export const OPT_STYLE = [
  { color: "#e21b3c", shape: "▲" }, { color: "#1368ce", shape: "◆" },
  { color: "#d89e00", shape: "●" }, { color: "#26890c", shape: "■" },
];
export const TEAM_STYLE = [
  ["Mèo cam", "Orange Cats", "#ff8a2a"], ["Gấu xanh", "Blue Bears", "#1368ce"], ["Thỏ hồng", "Pink Bunnies", "#e0559b"], ["Cú tím", "Purple Owls", "#7c4dcc"],
  ["Cáo đỏ", "Red Foxes", "#e21b3c"], ["Ếch lá", "Green Frogs", "#26890c"], ["Vịt vàng", "Yellow Ducks", "#d89e00"], ["Cá heo", "Dolphins", "#1aa6b7"],
];
export const MODE_INFO = {
  solo: { name: L("Cá nhân – thi tốc độ", "Solo – speed quiz"), desc: L("Ai đúng và nhanh nhất được nhiều điểm nhất.", "The fastest correct answers score most.") },
  teamscore: { name: L("Nhóm – cộng điểm", "Teams – combined score"), desc: L("Chia đội, điểm của từng người cộng thành điểm đội.", "Split into teams; members' scores add up.") },
  race: { name: L("Nhóm – đua kiểu Quizlet Live", "Teams – Quizlet-Live race"), desc: L("Mỗi người giữ một phần đáp án, cả nhóm phải bàn nhau. Sai là về vạch xuất phát.", "Each member holds part of the answers; the team must talk it through. A wrong tap sends the team back to the start.") },
};

export const isTeamMode = (m) => m === "teamscore" || m === "race";
export const teamName = (t) => L(TEAM_STYLE[t.id % 8][0], TEAM_STYLE[t.id % 8][1]);
export const gamePath = (pin) => `liveGames/${pin}`;
export const playerPath = (pin, uid) => `liveGames/${pin}/players/${uid}`;
export const joinUrl = (pin) => `${location.origin}${location.pathname}#live/play/${pin}`;

/** Điểm một câu: đúng được 600–1000 tuỳ tốc độ, cộng thêm thưởng chuỗi đúng */
export function pointsFor(ok, ms, secs, streak) {
  if (!ok) return 0;
  const t = Math.min(ms, secs * 1000) / (secs * 1000);
  return Math.round(600 + 400 * (1 - t) + 50 * Math.min(streak, 4));
}

/** Gọi cb(data) khi tài liệu đổi; tự huỷ khi `node` rời khỏi trang */
export function watchWhile(node, path, cb, col = false) {
  let off = () => {};
  const fn = (d) => { if (!node.isConnected) { off(); return; } cb(d); };
  off = col ? liveDb.watchCol(path, fn) : liveDb.watch(path, fn);
  return () => off();
}

export function bar(pctNum, color) {
  return el("div", { class: "lv-bar" }, el("span", { style: `width:${Math.max(0, Math.min(100, pctNum))}%;background:${color || "var(--copper)"}` }));
}

/** Bảng xếp hạng người chơi; mode đội thì thêm xếp hạng đội */
export function leaderboard(players, game, { limit = 5, meUid = null } = {}) {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top = Math.max(1, sorted[0]?.score || 1);
  const box = el("div", { class: "lv-board" });
  sorted.slice(0, limit).forEach((p, i) => box.append(el("div", { class: "lv-row" + (p.uid === meUid ? " me" : "") },
    el("span", { class: "lv-rank" }, i + 1), el("span", { class: "lv-name" }, p.name), bar(((p.score || 0) / top) * 100), el("b", { class: "lv-score" }, p.score || 0))));
  if (meUid && !sorted.slice(0, limit).some((p) => p.uid === meUid)) {
    const i = sorted.findIndex((p) => p.uid === meUid);
    if (i >= 0) box.append(el("div", { class: "lv-row me" }, el("span", { class: "lv-rank" }, i + 1), el("span", { class: "lv-name" }, sorted[i].name), el("span"), el("b", { class: "lv-score" }, sorted[i].score || 0)));
  }
  return box;
}

export function teamBoard(players, game) {
  const rows = (game.teams || []).map((t) => ({ t, score: players.filter((p) => String(p.team) === String(t.id)).reduce((s, p) => s + (p.score || 0), 0), n: players.filter((p) => String(p.team) === String(t.id)).length }))
    .sort((a, b) => b.score - a.score);
  const top = Math.max(1, rows[0]?.score || 1);
  const box = el("div", { class: "lv-board" });
  rows.forEach((r, i) => box.append(el("div", { class: "lv-row" },
    el("span", { class: "lv-rank" }, i + 1), el("span", { class: "lv-name", style: `color:${TEAM_STYLE[r.t.id % 8][2]}` }, `${teamName(r.t)} (${r.n})`),
    bar((r.score / top) * 100, TEAM_STYLE[r.t.id % 8][2]), el("b", { class: "lv-score" }, r.score))));
  return box;
}

/* ======================= TẠO PHÒNG (GIÁO VIÊN) ======================= */
export function renderLiveSetup(ctx, presetRef = "") {
  const root = el("div", { class: "stack-lg" });
  if (!isAdmin(ctx.user)) {
    root.append(el("div", { class: "notice notice-warn" }, L("Chỉ giáo viên mới tạo được phòng live. Bạn có thể vào phòng bằng mã hoặc quét QR.", "Only teachers can host. You can join a room with a code or QR scan."),
      " ", el("a", { href: "#live", onclick: (e) => { e.preventDefault(); ctx.go("live"); } }, L("Vào phòng", "Join a room"))));
    return root;
  }
  const cfg = { ref: presetRef, mode: "solo", count: 15, secs: 20, goal: 10 };
  const setSel = el("select", {}, el("option", { value: "" }, L("— Chọn học phần —", "— Choose a set —")));
  const addGroup = (label, items) => { if (items.length) setSel.append(el("optgroup", { label }, items.map(([v, t]) => el("option", { value: v }, t)))); };
  addGroup(L("Sổ từ", "Word bank"), [["saved", L("Sổ từ của tôi", "My word bank")], ["learning", L("Từ đang học", "Words in progress")]]);
  const refresh = () => { setSel.value = cfg.ref; if (setSel.value !== cfg.ref) setSel.value = ""; };
  Promise.all([listMySets(ctx.user), listTeacherSets(ctx.user)]).then(([mine, teach]) => {
    const seen = new Set();
    addGroup(L("Học phần của tôi", "My sets"), mine.map((s) => { seen.add(s.id); return [`my:${s.id}`, `${s.title} (${s.count ?? s.cards.length})`]; }));
    addGroup(L("Giáo viên chia sẻ", "Shared by teachers"), teach.filter((s) => !seen.has(s.id)).map((s) => [`my:${s.id}`, `${s.title} (${s.count ?? s.cards.length})`]));
    ["ielts", "evu", "ows"].forEach((series) => addGroup({ ielts: L("IELTS theo chủ đề", "IELTS topics"), evu: "Vocabulary in Use", ows: "Oxford Word Skills" }[series],
      DECKS.filter((d) => d.series === series).map((d) => [`deck:${d.id}`, `${d.title} (${d.words.length})`])));
    refresh();
  });
  setSel.onchange = () => (cfg.ref = setSel.value);

  const seg = (key, choices) => {
    const wrap = el("div", { class: "seg" });
    const paint = () => [...wrap.children].forEach((b) => b.classList.toggle("on", b.dataset.v === String(cfg[key])));
    choices.forEach(([v, t]) => wrap.append(el("button", { type: "button", dataset: { v }, onclick: () => { cfg[key] = typeof choices[0][0] === "number" ? +v : v; paint(); sync(); } }, t)));
    paint(); return wrap;
  };
  const modeBox = el("div", { class: "mode-grid" });
  Object.entries(MODE_INFO).forEach(([id, m]) => {
    const b = el("button", { type: "button", class: "mode-card", dataset: { m: id }, onclick: () => { cfg.mode = id; sync(); } }, el("b", {}, m.name), el("span", { class: "muted small" }, m.desc));
    modeBox.append(b);
  });
  const secsRow = el("div", { class: "setup-row" }, el("div", { class: "setup-label" }, L("Thời gian mỗi câu", "Seconds per question")), el("div", { class: "setup-ctl" }, seg("secs", [[10, "10s"], [20, "20s"], [30, "30s"], [45, "45s"]])));
  const goalRow = el("div", { class: "setup-row" }, el("div", { class: "setup-label" }, L("Đích của cuộc đua", "Race goal")), el("div", { class: "setup-ctl" }, seg("goal", [[8, L("8 câu đúng", "8 correct")], [10, L("10 câu đúng", "10 correct")], [15, L("15 câu đúng", "15 correct")]])));
  const countRow = el("div", { class: "setup-row" }, el("div", { class: "setup-label" }, L("Số câu", "Questions")), el("div", { class: "setup-ctl" }, seg("count", [[10, "10"], [15, "15"], [20, "20"], [30, "30"]])));
  function sync() {
    [...modeBox.children].forEach((b) => b.classList.toggle("sel", b.dataset.m === cfg.mode));
    secsRow.classList.toggle("hidden", cfg.mode === "race");
    countRow.classList.toggle("hidden", cfg.mode === "race");
    goalRow.classList.toggle("hidden", cfg.mode !== "race");
  }
  sync();

  const go = el("button", { class: "btn btn-primary btn-lg", onclick: async () => {
    if (!cfg.ref) { toast(L("Hãy chọn một học phần.", "Choose a set first."), "error"); return; }
    go.disabled = true;
    try {
      const r = await resolveSet(ctx.user, cfg.ref);
      if (!r || r.cards.length < 4) { toast(L("Học phần cần ít nhất 4 thẻ để chơi live.", "A set needs at least 4 cards for live play."), "error"); go.disabled = false; return; }
      const nQ = cfg.mode === "race" ? Math.min(30, r.cards.length) : Math.min(cfg.count, r.cards.length);
      const { qs, key } = buildLiveQuestions(r.cards, nQ);
      let pin = "";
      for (let i = 0; i < 12 && !pin; i++) {
        const p = String(Math.floor(100000 + Math.random() * 900000));
        const old = await liveDb.get(gamePath(p));
        if (!old) pin = p;
        else if (old.hostUid === ctx.user.uid && Date.now() - (old.createdAt || 0) > 6 * 3600e3) { await liveDb.del(gamePath(p)); pin = p; }
      }
      if (!pin) throw new Error("no pin");
      await liveDb.set(`liveKeys/${pin}`, { hostUid: ctx.user.uid, key });
      await liveDb.set(gamePath(pin), {
        pin, hostUid: ctx.user.uid, hostName: ctx.user.displayName || "", title: r.title, mode: cfg.mode, status: "lobby",
        qs, total: qs.length, qIndex: -1, qSecs: cfg.secs, correct: -1, goal: cfg.goal, teams: [], createdAt: Date.now(),
      });
      ctx.go(`live/host/${pin}`);
    } catch (err) {
      console.warn(err); go.disabled = false;
      toast(L("Không tạo được phòng. Kiểm tra kết nối rồi thử lại.", "Couldn't create the room. Check your connection and retry."), "error");
    }
  } }, icon("play"), L("Tạo phòng", "Create room"));

  root.append(
    el("div", { class: "row" }, el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go("sets") }, icon("back"), L("Học phần", "Sets")), el("h1", { style: "margin:0" }, L("Tạo phòng live", "Host a live game"))),
    el("div", { class: "card stack" },
      el("div", { class: "setup-row" }, el("div", { class: "setup-label" }, L("Học phần", "Study set")), el("div", { class: "setup-ctl" }, setSel)),
      el("div", { class: "setup-label" }, L("Chế độ chơi", "Game mode")), modeBox, secsRow, countRow, goalRow, go));
  return root;
}

/* ======================= VÀO PHÒNG (HỌC SINH) ======================= */
export function pinFromText(text) {
  const m = String(text).match(/live\/play\/(\d{6})/) || String(text).match(/\b(\d{6})\b/);
  return m ? m[1] : "";
}

export async function joinGame(ctx, pin) {
  const game = await liveDb.get(gamePath(pin));
  if (!game) { toast(L("Không tìm thấy phòng này. Kiểm tra lại mã 6 số.", "No room with that code. Check the 6 digits."), "error"); return false; }
  if (game.status === "finished") { toast(L("Phòng này đã kết thúc.", "That game has already ended."), "error"); return false; }
  const me = await liveDb.get(playerPath(pin, ctx.user.uid));
  if (!me) {
    await liveDb.set(playerPath(pin, ctx.user.uid), {
      uid: ctx.user.uid, name: (ctx.user.displayName || ctx.user.email || L("Học viên", "Student")).slice(0, 30),
      team: "", score: 0, streak: 0, answers: {}, joinedAt: Date.now(),
    });
  }
  ctx.go(`live/play/${pin}`);
  return true;
}

export function renderLiveJoin(ctx) {
  const root = el("div", { class: "live-join" });
  const input = el("input", { type: "text", inputmode: "numeric", maxlength: 6, class: "pin-input", placeholder: "000000", autocomplete: "off",
    oninput: () => (input.value = input.value.replace(/\D/g, "").slice(0, 6)), onkeydown: (e) => { if (e.key === "Enter") go.click(); } });
  const go = el("button", { class: "btn btn-primary btn-lg", onclick: async () => {
    if (input.value.length !== 6) { toast(L("Mã phòng gồm 6 chữ số.", "Room codes have 6 digits."), "error"); return; }
    go.disabled = true;
    try { if (!(await joinGame(ctx, input.value))) go.disabled = false; }
    catch (err) { console.warn(err); go.disabled = false; toast(L("Không vào được phòng. Thử lại nhé.", "Couldn't join. Try again."), "error"); }
  } }, icon("play"), L("Vào phòng", "Join"));

  const scanBox = el("div", { class: "scan-box hidden" });
  let scanner = null;
  const stopScan = () => { scanner?.stop(); scanner = null; scanBox.classList.add("hidden"); scanBox.innerHTML = ""; };
  const scanBtn = el("button", { class: "btn btn-lg", onclick: async () => {
    if (scanner) { stopScan(); return; }
    try {
      scanBox.classList.remove("hidden");
      scanBox.append(el("div", { class: "muted small" }, L("Đưa mã QR trên màn hình giáo viên vào khung…", "Point the camera at the teacher's QR code…")));
      scanner = await startScanner((text) => {
        const pin = pinFromText(text);
        stopScan();
        if (pin) { input.value = pin; go.click(); } else toast(L("Mã QR này không phải phòng live.", "That QR isn't a live room."), "error");
      });
      scanBox.append(scanner.node);
    } catch (err) {
      console.warn(err); stopScan();
      toast(L("Không mở được camera. Hãy cho phép camera hoặc nhập mã 6 số.", "Couldn't open the camera. Allow camera access or type the 6-digit code."), "error", 5000);
    }
  } }, icon("camera"), L("Quét mã QR", "Scan QR"));
  const stopWhenGone = setInterval(() => { if (!root.isConnected) { clearInterval(stopWhenGone); stopScan(); } }, 1000);

  root.append(el("div", { class: "card join-card" },
    el("div", { class: "eyebrow" }, "Live"),
    el("h1", {}, L("Vào phòng chơi", "Join a game")),
    el("p", { class: "muted" }, L("Nhập mã 6 số trên màn hình giáo viên, hoặc quét mã QR. Bạn chơi với tên: ", "Enter the 6-digit code on the teacher's screen, or scan the QR. You'll play as: "),
      el("b", {}, ctx.user.displayName || ctx.user.email || "")),
    input, el("div", { class: "row wrap", style: "gap:10px;justify-content:center" }, go, scanBtn), scanBox,
    isAdmin(ctx.user) ? el("button", { class: "btn btn-ghost btn-sm", onclick: () => ctx.go("live/new") }, L("Hoặc tạo phòng mới", "Or host a new room")) : null));
  return root;
}
