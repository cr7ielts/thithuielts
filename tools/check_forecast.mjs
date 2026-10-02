// Kiểm tra js/data/speaking-forecast.js sau khi sửa: node tools/check_forecast.mjs
// Báo lỗi định dạng (thiếu câu, trùng id, Part 3 sai cấu trúc…) và in tóm tắt các đề sẽ hiện trong form giao bài.
import { SPEAKING_FORECAST as f } from "../js/data/speaking-forecast.js";
import { SPEAKING_TESTS, forecastTests } from "../js/data/speaking-tests.js";

const errs = [];
const bad = (msg) => errs.push(msg);
const q = (s) => typeof s === "string" && s.trim().length > 5 && !s.startsWith("#");

for (const k of ["period", "periodEn", "updated"]) if (!f[k]) bad(`thiếu ${k}`);
if (!/^\d{4}-\d\d-\d\d$/.test(f.updated || "")) bad("updated phải dạng YYYY-MM-DD");
if (!Array.isArray(f.sources) || !f.sources.length) bad("thiếu sources");

const topics = new Set();
for (const [name, list, min] of [["core", f.core, 1], ["part1", f.part1, 6]]) {
  if (!Array.isArray(list) || list.length < min) { bad(`${name}: cần ít nhất ${min} chủ đề`); continue; }
  for (const t of list) {
    if (!t.topic) bad(`${name}: chủ đề không có tên`);
    if (topics.has(t.topic)) bad(`${name}: trùng chủ đề “${t.topic}”`);
    topics.add(t.topic);
    if (t.questions?.length !== 4 || !t.questions.every(q)) bad(`${name} “${t.topic}”: cần đúng 4 câu hỏi`);
  }
}

const ids = new Set();
if (!Array.isArray(f.part2) || !f.part2.length) bad("part2 trống");
for (const c of f.part2 || []) {
  const where = `part2 “${c.id}”`;
  if (!/^[a-z0-9-]+$/.test(c.id || "")) bad(`${where}: id chỉ gồm chữ thường, số, gạch nối`);
  if (ids.has(c.id)) bad(`${where}: trùng id`);
  ids.add(c.id);
  if (!/^Describe /.test(c.topic || "")) bad(`${where}: topic phải bắt đầu bằng "Describe "`);
  if (c.bullets?.length !== 4 || !/^and explain/.test(c.bullets.at(-1) || "")) bad(`${where}: cần 4 ý, ý cuối bắt đầu bằng "and explain"`);
  if (!q(c.followUp || "")) bad(`${where}: thiếu followUp`);
  const p3 = c.part3 || [];
  const heads = p3.filter((s) => s.startsWith("# "));
  if (p3.length !== 8 || heads.length !== 2 || !p3[0].startsWith("# ") || !p3[4].startsWith("# ") || p3.filter(q).length !== 6)
    bad(`${where}: part3 cần "# Theme 1 — …" + 3 câu, "# Theme 2 — …" + 3 câu`);
}

const tests = forecastTests();
const all = new Set();
for (const t of SPEAKING_TESTS) {
  if (all.has(t.id)) bad(`trùng id đề ${t.id}`);
  all.add(t.id);
}
for (const t of tests) if (t.speaking.part1.filter(q).length !== 12) bad(`${t.id}: Part 1 không đủ 12 câu`);

if (errs.length) {
  console.error(`✗ ${errs.length} lỗi:\n  - ` + errs.join("\n  - "));
  process.exit(1);
}
console.log(`✓ Forecast ${f.period} (cập nhật ${f.updated}): ${f.part1.length} chủ đề Part 1, ${f.part2.length} cue card → ${tests.length} đề`);
for (const t of tests) console.log(`  ${t.title}\n     Part 1: ${t.topics}`);
