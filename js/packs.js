// GÓI ĐỀ THEO QUÝ — gom đề có sẵn thành gói, mỗi gói đếm số bài học sinh đã làm / tổng số bài.
//  #packs              danh sách gói
//  #packs/<gói>        các bài trong gói (đã làm: điểm / chờ chấm)
//  #pack/<gói>/<bài>   làm một bài Speaking / Writing của gói (Reading mở thẳng bài trong Ngân hàng đề)
//  Dữ liệu: Speaking từ js/data/speaking-tests.js (forecast), Writing từ js/data/writing-real.js,
//  Reading từ js/data/reading-forecast.js. Bài đã làm = có bài nộp trùng testId.
import { el, icon } from "./ui.js";
import { L } from "./i18n.js";
import { listMySubmissions } from "./store.js";
import { forecastTests } from "./data/speaking-tests.js";
import { SPEAKING_FORECAST } from "./data/speaking-forecast.js";
import { WRITING_REAL } from "./data/writing-real.js";
import { READING_FORECAST } from "./data/reading-forecast.js";
import { renderSpeaking } from "./skills/speaking.js";
import { renderWriting } from "./skills/writing.js";
import { loadBanks } from "./bank/bank.js";
import { createCat } from "./cat.js";

const QUARTER = WRITING_REAL.quarter;          // "Quý IV/2026"
const QUARTER_EN = WRITING_REAL.quarterEn;

/* ---------- đổi đề sang định dạng của trang thi Speaking / Writing ---------- */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const stripTopics = (lines) => (lines || []).filter((l) => !/^#/.test(String(l).trim()));
function speakingTest(t, testId) {
  const sp = t.speaking;
  return { id: testId, speaking: { parts: [
    { id: "sp1", title: "Part 1 — Introduction and interview", prepSeconds: 0, speakSeconds: sp.p1Secs || 45, questions: stripTopics(sp.part1) },
    { id: "sp2", title: "Part 2 — Individual long turn", prepSeconds: sp.p2Prep || 60, speakSeconds: sp.p2Secs || 120,
      cue: { topic: sp.part2.topic, bullets: sp.part2.bullets }, questions: [], followUp: sp.part2.followUp || "" },
    { id: "sp3", title: "Part 3 — Two-way discussion", prepSeconds: 0, speakSeconds: sp.p3Secs || 60, questions: stripTopics(sp.part3) },
  ] } };
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function writingTest(w, testId) {
  return { id: testId, writing: { tasks: [{ id: "t2", title: "Writing Task 2", minutes: 40, minWords: 250,
    prompt: `${esc(w.prompt)}<br><br><strong>${esc(w.ask)}</strong><br><br>` +
      "Give reasons for your answer and include any relevant examples from your own knowledge or experience.<br><br>" +
      "Write at least <strong>250 words</strong>." }] } };
}
const fmtDay = (d) => (d.length === 7 ? `${L("tháng", "")} ${d.slice(5)}/${d.slice(0, 4)}`.trim() : d.split("-").reverse().join("/"));

/* ---------- các gói ---------- */
let _packs = null;
async function loadPacks() {
  if (_packs) return _packs;
  const banks = await loadBanks().catch(() => ({ reading: [] }));
  const byId = new Map(banks.reading.map((i) => [i.id, i]));
  const spId = "speaking-forecast-2026q4", wrId = "writing-real-2026q4", rdId = "reading-forecast-2026q4";
  _packs = [
    { id: spId, skill: "speaking", title: `Speaking Forecast ${QUARTER}`, titleEn: `Speaking Forecast ${QUARTER_EN}`,
      desc: L(`Đề thi thử đủ 3 part theo các chủ đề dự đoán kỳ ${SPEAKING_FORECAST.period}: ghi âm từng câu, giáo viên nghe và chấm.`,
        `Full 3-part mock tests on the forecast topics for ${SPEAKING_FORECAST.periodEn}: record every answer, your teacher listens and marks.`),
      items: forecastTests().map((t, k) => {
        const testId = `pack:${spId}:${t.id}`;
        return { id: t.id, testId, title: cap(t.speaking.part2.topic.replace(/^Describe\s+/i, "").replace(/\.$/, "")),
          label: L(`Đề ${k + 1}`, `Test ${k + 1}`), meta: t.topics, test: speakingTest(t, testId) };
      }) },
    { id: wrId, skill: "writing", title: `Writing Real Tests ${QUARTER}`, titleEn: `Writing Real Tests ${QUARTER_EN}`,
      desc: L(`Đề Task 2 thí sinh báo lại sau khi thi tháng ${WRITING_REAL.period}. Mỗi bài 40 phút, giáo viên chấm.`,
        `Task 2 questions reported by candidates after their test (${WRITING_REAL.period}). 40 minutes each, marked by your teacher.`),
      note: L("Đề do thí sinh nhớ lại nên câu chữ có thể khác đề gốc đôi chút.", "Questions are recalled by candidates, so the wording may differ slightly from the real paper."),
      items: WRITING_REAL.tests.map((w) => {
        const testId = `pack:${wrId}:${w.id}`;
        return { id: w.id, testId, title: w.prompt.length > 110 ? w.prompt.slice(0, 108) + "…" : w.prompt,
          label: fmtDay(w.date), meta: w.where || "", test: writingTest(w, testId) };
      }) },
    { id: rdId, skill: "reading", title: `Reading Forecast ${QUARTER}`, titleEn: `Reading Forecast ${QUARTER_EN}`,
      desc: L(`Các passage dự đoán kỳ ${READING_FORECAST.period}, làm như thi trên máy, chấm điểm ngay.`,
        `Forecast passages for ${READING_FORECAST.period}, computer-delivered style with instant marking.`),
      items: READING_FORECAST.ids.map((id) => byId.get(id)).filter(Boolean).sort((a, b) => a.part - b.part || a.title.localeCompare(b.title))
        .map((i) => ({ id: i.id, testId: `bank:reading:${i.id}`, title: i.title, label: `Passage ${i.part}`, href: `bank/reading/${i.id}` })) },
  ];
  return _packs;
}

/** testId -> bài nộp tốt nhất / mới nhất */
async function myProgress(uid) {
  const subs = await listMySubmissions(uid, 500).catch(() => []);
  const best = new Map();
  for (const s of subs) {
    const prev = best.get(s.testId);
    const score = (x) => (x.teacherBand != null ? x.teacherBand : x.raw != null ? x.raw : -1);
    if (!prev || score(s) > score(prev)) best.set(s.testId, s);
  }
  return best;
}
const doneCount = (p, best) => p.items.filter((i) => best.has(i.testId)).length;
const resultText = (s) => (s.raw != null && s.total ? `${s.raw}/${s.total}` : s.teacherBand != null ? `Band ${Number(s.teacherBand).toFixed(1)}` : L("chờ chấm", "awaiting mark"));

function meter(done, total) {
  return el("div", { class: "pack-meter" },
    el("span", { class: "pack-meter-bar" }, el("span", { class: "pack-meter-fill", style: `width:${total ? Math.round((done / total) * 100) : 0}%` })),
    el("span", { class: "pack-meter-text" }, L(`Đã làm ${done}/${total}`, `${done}/${total} done`)));
}

/* ---------- #packs ---------- */
export function renderPacks(ctx) {
  const wrap = el("div", { class: "stack-lg" });
  const cat = createCat({ size: 120, mood: "think", bubbleSide: "left", say: L("Làm hết một gói là tự tin vào phòng thi!", "Finish a pack and walk in confident!") });
  wrap.append(el("section", { class: "games-hero" },
    el("div", { style: "flex:1;min-width:240px" },
      el("div", { class: "eyebrow" }, L("Gói đề theo quý", "Quarterly packs")),
      el("h1", {}, L(`Đề mới nhất ${QUARTER}`, `Latest tests, ${QUARTER_EN}`)),
      el("p", { class: "lead mb-0" }, L("Đề dự đoán và đề thật gần đây gom theo quý, có đếm số bài bạn đã làm.",
        "Forecast and recent real tests grouped by quarter, with a count of how many you've done."))),
    el("div", { class: "games-hero-cat" }, cat)));
  const grid = el("div", { class: "pack-grid" }, el("div", { class: "card muted" }, L("Đang tải…", "Loading…")));
  wrap.append(grid);
  Promise.all([loadPacks(), myProgress(ctx.user.uid)]).then(([packs, best]) => {
    grid.replaceChildren(...packs.map((p) => packCard(ctx, p, best)));
  }).catch((err) => grid.replaceChildren(el("div", { class: "notice notice-error" }, err.message)));
  return wrap;
}

function packCard(ctx, p, best) {
  const done = doneCount(p, best);
  return el("button", { class: `card pack-card ${p.skill}`, onclick: () => ctx.go(`packs/${p.id}`) },
    el("div", { class: "row", style: "gap:12px" },
      el("span", { class: `skill-ico ${p.skill}` }, icon(p.skill)),
      el("div", { style: "flex:1;min-width:0;text-align:left" },
        el("h3", { class: "mb-0" }, L(p.title, p.titleEn)),
        el("div", { class: "tiny muted" }, L(`${p.items.length} bài`, `${p.items.length} tests`)))),
    el("p", { class: "small muted", style: "text-align:left;margin:10px 0" }, p.desc),
    meter(done, p.items.length));
}

/* ---------- #packs/<gói> ---------- */
export function renderPack(ctx, packId) {
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("packs") }, icon("back"), L("Gói đề theo quý", "Quarterly packs")));
  const body = el("div", { class: "card muted" }, L("Đang tải…", "Loading…"));
  wrap.append(body);
  Promise.all([loadPacks(), myProgress(ctx.user.uid)]).then(([packs, best]) => {
    const p = packs.find((x) => x.id === packId);
    if (!p) throw new Error(L("Không tìm thấy gói đề này.", "Pack not found."));
    let filter = "all";
    const list = el("div", { class: "pack-items" });
    const chips = el("div", { class: "row wrap", style: "gap:6px" });
    const paint = () => {
      const todo = p.items.filter((i) => !best.has(i.testId)).length;
      chips.replaceChildren(...[["all", L("Tất cả", "All"), p.items.length], ["todo", L("Chưa làm", "To do"), todo], ["done", L("Đã làm", "Done"), p.items.length - todo]]
        .map(([k, t, n]) => el("button", { class: "chip-btn" + (filter === k ? " on" : ""), onclick: () => { filter = k; paint(); } }, `${t} (${n})`)));
      list.replaceChildren(...p.items.filter((i) => filter === "all" || (filter === "done") === best.has(i.testId)).map((i, k) => {
        const s = best.get(i.testId);
        return el("button", { class: "pack-item" + (s ? " done" : ""), onclick: () => ctx.go(i.href || `pack/${p.id}/${i.id}`) },
          el("span", { class: "pack-item-tick" }, s ? icon("check") : String(p.items.indexOf(i) + 1)),
          el("span", { class: "pack-item-body" },
            el("span", { class: "pack-item-title" }, i.title),
            el("span", { class: "tiny muted" }, [i.label, i.meta].filter(Boolean).join(", "))),
          el("span", { class: "pack-item-res" }, s ? resultText(s) : L("Làm bài", "Start")));
      }));
    };
    paint();
    body.replaceWith(el("div", { class: "stack" },
      el("div", { class: "card stack-sm" },
        el("div", { class: "row", style: "gap:12px" }, el("span", { class: `skill-ico ${p.skill}` }, icon(p.skill)),
          el("div", { style: "flex:1" }, el("h1", { class: "mb-0" }, L(p.title, p.titleEn)), el("div", { class: "muted small" }, p.desc))),
        meter(doneCount(p, best), p.items.length),
        p.note ? el("div", { class: "tiny muted" }, p.note) : null),
      chips, list));
  }).catch((err) => body.replaceWith(el("div", { class: "notice notice-error" }, err.message)));
  return wrap;
}

/* ---------- #pack/<gói>/<bài> ---------- */
export function renderPackItem(ctx, packId, itemId) {
  const view = el("div", {}, el("div", { class: "card muted" }, L("Đang tải…", "Loading…")));
  loadPacks().then((packs) => {
    const p = packs.find((x) => x.id === packId);
    const i = p?.items.find((x) => x.id === itemId);
    if (!i?.test) throw new Error(L("Không tìm thấy bài này.", "Test not found."));
    const opt = { title: `${L(p.title, p.titleEn)}, ${i.label}`, testTitle: i.title, packTitle: L(p.title, p.titleEn), back: [`packs/${p.id}`, L(p.title, p.titleEn)] };
    view.replaceChildren(p.skill === "speaking" ? renderSpeaking(ctx, i.test, opt) : renderWriting(ctx, i.test, opt));
  }).catch((err) => view.replaceChildren(el("div", { class: "notice notice-error" }, err.message)));
  return view;
}

/** Ô nhỏ cho trang chủ / Thi thử: các gói kèm tiến độ */
export function packsStrip(ctx) {
  const box = el("div", { class: "pack-strip" });
  Promise.all([loadPacks(), myProgress(ctx.user.uid)]).then(([packs, best]) => {
    box.replaceChildren(...packs.map((p) => el("button", { class: `pack-mini ${p.skill}`, onclick: () => ctx.go(`packs/${p.id}`) },
      el("span", { class: `skill-ico ${p.skill}` }, icon(p.skill)),
      el("span", { class: "pack-mini-body" }, el("strong", {}, L(p.title, p.titleEn)), meter(doneCount(p, best), p.items.length)))));
  }).catch(() => box.remove());
  return box;
}
