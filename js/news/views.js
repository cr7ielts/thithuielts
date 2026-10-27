// ĐỌC BÁO KHOA HỌC: danh sách bài · trang đọc (bấm vào từ để tra, tô highlight, lưu từ + ghi chú) · sổ từ đọc báo
//  Bài: js/data/news.js (soạn sẵn) + Firestore newsArticles (giáo viên dán bài báo thật, có link nguồn).
//  Tra từ: bộ từ vựng có sẵn của web → bộ nhớ đệm trên máy → Gemini (Firebase AI Logic, dùng chung cấu hình AI_QUIZ).
//  Highlight, từ đã lưu, ghi chú, bài đã đọc: lưu trong trình duyệt theo từng tài khoản.
import { el, icon, toast, speakText, confirmDialog } from "../ui.js";
import { L, isVi } from "../i18n.js";
import { NEWS, NEWS_TOPICS } from "../data/news.js";
import { ALL_WORDS } from "../data/vocab.js";
import { initFirebase, initAI, isConfigured, isAdmin } from "../firebase.js";
import { AI_QUIZ } from "../config.js";
import { createHighlighter, attachHtmlHighlighter } from "../highlight.js";
import { saveSet } from "../sets/store.js";

const LEVELS = ["B1", "B2", "C1", "C2"];
const topicName = (t) => (NEWS_TOPICS[t] ? L(...NEWS_TOPICS[t]) : t || "");

/* ---------------- lưu trên máy ---------------- */
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* đầy / riêng tư */ } };
const K = {
  words: (u) => `ielts:news:words:${u}`,        // { [key]: { word, ipa, pos, level, vi, def, colloc[], note, sentence, articleId, title, savedAt } }
  hl: (u, id) => `ielts:news:hl:${u}:${id}`,    // { [paraIndex]: [[start, end, color]] }
  read: (u) => `ielts:news:read:${u}`,          // { [articleId]: time }
  dict: "ielts:news:dict",                       // bộ nhớ đệm tra từ dùng chung trên máy
};
const wkey = (w) => String(w).toLowerCase().replace(/[^a-z' -]/g, "").trim();

/* ---------------- bài báo ---------------- */
const LS_ART = "ielts:news:articles";   // chế độ thử: bài giáo viên thêm
async function teacherArticles() {
  if (!isConfigured) return lsGet(LS_ART, []);
  try {
    const { db, dbMod } = await initFirebase();
    const snap = await dbMod.getDocs(dbMod.collection(db, "newsArticles"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), mine: true }));
  } catch (err) { console.warn("newsArticles", err); return []; }
}
async function allArticles() {
  const extra = await teacherArticles();
  return [...extra.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), ...NEWS];
}
async function saveArticle(a) {
  const body = { title: a.title, topic: a.topic, level: a.level, minutes: a.minutes, summary: a.summary, source: a.source, url: a.url,
    license: a.license || "", paras: a.paras, createdAt: Date.now() };
  if (!isConfigured) {
    const list = lsGet(LS_ART, []);
    const id = "t" + Date.now().toString(36);
    list.push({ id, ...body, mine: true });
    lsSet(LS_ART, list);
    return id;
  }
  const { db, dbMod } = await initFirebase();
  return (await dbMod.addDoc(dbMod.collection(db, "newsArticles"), body)).id;
}
async function deleteArticle(id) {
  if (!isConfigured) { lsSet(LS_ART, lsGet(LS_ART, []).filter((a) => a.id !== id)); return; }
  const { db, dbMod } = await initFirebase();
  await dbMod.deleteDoc(dbMod.doc(db, "newsArticles", id));
}

/* ======================= DANH SÁCH ======================= */
export function renderNews(ctx, tab = "all") {
  const uid = ctx.user.uid;
  const wrap = el("div", { class: "stack-lg" });
  wrap.append(el("section", { class: "games-hero news-hero" },
    el("div", { style: "flex:1;min-width:260px" },
      el("div", { class: "eyebrow" }, L("Đọc báo khoa học", "Science reading")),
      el("h1", {}, L("Đọc bài báo, học từ ngay trong ngữ cảnh", "Read real-world science, learn words in context")),
      el("p", { class: "lead" }, L("Bấm vào bất kỳ từ nào để xem phiên âm, nghĩa, level và collocation; bôi đen cả cụm để tra cụm từ. Tô highlight, lưu từ và ghi chú như đọc báo giấy.",
        "Click any word for its pronunciation, meaning, level and collocations; select a phrase to look it up. Highlight, save words and add notes as you read.")))));
  const tabs = el("div", { class: "row wrap", style: "gap:8px" },
    el("button", { class: "chip-btn" + (tab !== "words" ? " on" : ""), onclick: () => ctx.go("news") }, icon("globe"), L("Bài báo", "Articles")),
    el("button", { class: "chip-btn" + (tab === "words" ? " on" : ""), onclick: () => ctx.go("news/words") }, icon("bookmark"),
      L(`Từ đã lưu (${Object.keys(lsGet(K.words(uid), {})).length})`, `Saved words (${Object.keys(lsGet(K.words(uid), {})).length})`)),
    isAdmin(ctx.user) ? el("button", { class: "btn btn-sm", style: "margin-left:auto", onclick: () => wrap.replaceChildren(articleForm(ctx)) }, icon("plus"), L("Thêm bài báo", "Add an article")) : null);
  wrap.append(tabs);
  if (tab === "words") { wrap.append(savedWordsView(ctx)); return wrap; }

  const read = lsGet(K.read(uid), {});
  let topic = "all", level = "all";
  const search = el("input", { type: "search", class: "deck-search", placeholder: L("Tìm bài theo tiêu đề, chủ đề…", "Search articles…") });
  const topics = el("div", { class: "row wrap", style: "gap:6px" });
  const levels = el("div", { class: "row wrap", style: "gap:6px" });
  const grid = el("div", { class: "news-grid" }, el("div", { class: "muted" }, L("Đang tải…", "Loading…")));
  let list = [];
  const paint = () => {
    const q = search.value.trim().toLowerCase();
    const ds = list.filter((a) => (topic === "all" || a.topic === topic) && (level === "all" || a.level === level)
      && (!q || `${a.title} ${a.summary || ""} ${topicName(a.topic)}`.toLowerCase().includes(q)));
    topics.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.t === topic));
    levels.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.l === level));
    grid.replaceChildren(...(ds.length ? ds.map((a) => el("button", { class: "news-card", onclick: () => ctx.go(`news/${a.id}`) },
      el("div", { class: "row wrap", style: "gap:6px" },
        el("span", { class: "chip" }, topicName(a.topic)), el("span", { class: "chip chip-lv" }, a.level || "B2"),
        el("span", { class: "tiny muted" }, L(`${a.minutes || 5} phút đọc`, `${a.minutes || 5} min read`)),
        read[a.id] ? el("span", { class: "chip chip-ok", style: "margin-left:auto" }, icon("check"), L("Đã đọc", "Read")) : null),
      el("h3", {}, a.title),
      a.summary ? el("p", { class: "muted small mb-0" }, a.summary) : null,
      el("div", { class: "tiny muted" }, a.source ? `${L("Nguồn", "Source")}: ${a.source}` : L("Bài biên soạn kiểu IELTS Reading", "IELTS-style article"))))
      : [el("p", { class: "muted" }, L("Không có bài nào khớp.", "No articles match."))]));
  };
  [["all", L("Tất cả chủ đề", "All topics")], ...Object.keys(NEWS_TOPICS).map((k) => [k, topicName(k)])]
    .forEach(([k, n]) => topics.append(el("button", { type: "button", class: "chip-btn", dataset: { t: k }, onclick: () => { topic = k; paint(); } }, n)));
  [["all", L("Mọi level", "All levels")], ...LEVELS.map((l) => [l, l])]
    .forEach(([k, n]) => levels.append(el("button", { type: "button", class: "chip-btn", dataset: { l: k }, onclick: () => { level = k; paint(); } }, n)));
  search.oninput = paint;
  wrap.append(el("div", { class: "stack-sm" }, search, topics, levels), grid);
  allArticles().then((a) => { list = a; paint(); });
  return wrap;
}

/* ----- giáo viên: dán bài báo thật ----- */
function articleForm(ctx) {
  const f = {
    title: el("input", { type: "text", style: "width:100%", placeholder: L("Tiêu đề bài báo", "Article title") }),
    source: el("input", { type: "text", style: "width:100%", placeholder: L("Tên báo / tạp chí, vd. The Conversation", "Publisher, e.g. The Conversation") }),
    url: el("input", { type: "url", style: "width:100%", placeholder: "https://…" }),
    license: el("input", { type: "text", style: "width:100%", placeholder: L("Giấy phép, vd. CC BY-ND 4.0 (tuỳ chọn)", "Licence, e.g. CC BY-ND 4.0 (optional)") }),
    topic: el("select", { class: "pick" }, Object.keys(NEWS_TOPICS).map((k) => el("option", { value: k }, topicName(k)))),
    level: el("select", { class: "pick" }, LEVELS.map((l) => el("option", { value: l, selected: l === "B2" ? "" : null }, l))),
    summary: el("input", { type: "text", style: "width:100%", placeholder: L("Tóm tắt 1 câu (tuỳ chọn)", "One-line summary (optional)") }),
    text: el("textarea", { style: "width:100%;min-height:260px", placeholder: L("Dán nội dung bài báo. Mỗi đoạn cách nhau một dòng trống.", "Paste the article. Leave a blank line between paragraphs.") }),
  };
  const save = el("button", { class: "btn btn-primary" }, icon("check"), L("Lưu bài", "Save article"));
  save.onclick = async () => {
    const paras = f.text.value.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!f.title.value.trim() || paras.length < 2) { toast(L("Cần tiêu đề và ít nhất 2 đoạn.", "A title and at least two paragraphs are needed."), "err"); return; }
    if (!f.url.value.trim()) { toast(L("Hãy ghi link nguồn của bài báo.", "Please add the source link."), "err"); return; }
    save.disabled = true;
    try {
      const words = paras.join(" ").split(/\s+/).length;
      const id = await saveArticle({ title: f.title.value.trim(), source: f.source.value.trim(), url: f.url.value.trim(), license: f.license.value.trim(),
        topic: f.topic.value, level: f.level.value, summary: f.summary.value.trim(), paras, minutes: Math.max(2, Math.round(words / 180)) });
      toast(L("Đã lưu bài", "Article saved"), "ok");
      ctx.go(`news/${id}`);
    } catch (err) { save.disabled = false; toast(err.message, "err", 6000); }
  };
  const row = (label, node) => el("div", {}, el("label", { class: "field-label" }, label), node);
  return el("div", { class: "card stack" },
    el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("news", { t: Date.now() }) }, icon("back"), L("Đọc báo", "Science reading")),
    el("h2", { class: "mb-0" }, L("Thêm bài báo", "Add an article")),
    el("div", { class: "notice notice-info small" }, L("Chỉ dán bài được phép đăng lại, ví dụ bài có giấy phép Creative Commons (The Conversation: CC BY-ND — giữ nguyên văn, ghi tác giả và link) hoặc tài liệu của cơ quan nhà nước như NASA, NOAA. Học sinh luôn thấy tên nguồn và link gốc.",
      "Only paste articles you may republish, e.g. Creative Commons licensed pieces (The Conversation: CC BY-ND — unchanged, credited, linked) or public-domain material such as NASA or NOAA. Students always see the source and link.")),
    row(L("Tiêu đề", "Title"), f.title),
    el("div", { class: "grid grid-2" }, row(L("Nguồn", "Source"), f.source), row(L("Link gốc", "Original link"), f.url)),
    el("div", { class: "grid grid-2" }, row(L("Chủ đề", "Topic"), f.topic), row("Level", f.level)),
    row(L("Giấy phép", "Licence"), f.license), row(L("Tóm tắt", "Summary"), f.summary), row(L("Nội dung", "Text"), f.text),
    el("div", {}, save));
}

/* ======================= TRANG ĐỌC ======================= */
export function renderArticle(ctx, id) {
  const wrap = el("div", { class: "stack-lg" },
    el("button", { class: "btn btn-ghost btn-sm back", onclick: () => ctx.go("news") }, icon("back"), L("Đọc báo", "Science reading")));
  const body = el("div", { class: "card muted" }, L("Đang tải…", "Loading…"));
  wrap.append(body);
  allArticles().then((list) => {
    const a = list.find((x) => x.id === id);
    if (!a) { body.replaceWith(el("div", { class: "notice notice-error" }, L("Không tìm thấy bài này.", "Article not found."))); return; }
    body.replaceWith(reader(ctx, a));
  });
  return wrap;
}

function reader(ctx, a) {
  const uid = ctx.user.uid;
  const hl = createHighlighter();
  const hlKey = K.hl(uid, a.id);
  const saved = lsGet(hlKey, {});
  let size = lsGet("ielts:news:size", 1.06);

  const paraEls = a.paras.map((t, i) => {
    const p = el("p", { class: "news-para", dataset: { i } });
    paintPara(p, t, saved[i] || []);
    return p;
  });
  const article = el("article", { class: "news-article", style: `--fs:${size}rem` },
    el("div", { class: "row wrap", style: "gap:6px" }, el("span", { class: "chip" }, topicName(a.topic)), el("span", { class: "chip chip-lv" }, a.level || "B2"),
      el("span", { class: "tiny muted" }, L(`${a.minutes || 5} phút đọc`, `${a.minutes || 5} min read`))),
    el("h1", {}, a.title),
    a.summary ? el("p", { class: "news-standfirst" }, a.summary) : null,
    ...paraEls,
    sourceBlock(a));

  // lưu highlight sau mỗi lần tô / tẩy
  const persist = () => { const out = {}; paraEls.forEach((p, i) => { const r = readMarks(p); if (r.length) out[i] = r; }); lsSet(hlKey, out); };
  attachHtmlHighlighter(article, hl);
  hl.onClear(() => setTimeout(() => lsSet(hlKey, {}), 0));
  article.addEventListener("mouseup", () => setTimeout(persist, 30));
  article.addEventListener("touchend", () => setTimeout(persist, 300));
  article.addEventListener("click", () => setTimeout(persist, 30));

  // tra từ: bấm vào một từ, hoặc bôi đen cả cụm (khi không cầm bút highlight)
  const pop = el("div", { class: "word-pop hidden", role: "dialog" });
  const onPick = (e) => {
    if (hl.state.color || hl.state.erase) return;
    if (e.target.closest(".word-pop, a, button")) return;
    const sel = window.getSelection();
    let text = "", rect = null, para = e.target.closest(".news-para");
    if (sel && !sel.isCollapsed && para && para.contains(sel.anchorNode)) {
      text = sel.toString().trim();
      if (text.split(/\s+/).length > 6) return;   // đoạn dài: để học sinh tô / copy, không tra
      rect = sel.getRangeAt(0).getBoundingClientRect();
    } else if (para) {
      const w = wordAt(e.clientX, e.clientY);
      if (!w) return;
      text = w.text; rect = w.rect;
    } else return;
    text = text.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    if (!text || !/[A-Za-z]/.test(text)) return;
    showPop(ctx, a, pop, text, sentenceOf(para.textContent, text), rect);
  };
  article.addEventListener("mouseup", (e) => setTimeout(() => onPick(e), 10));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.classList.add("hidden"); });

  const fontBtn = (d, label) => el("button", { class: "hl-tool", title: L("Cỡ chữ", "Text size"), onclick: () => {
    size = Math.min(1.5, Math.max(0.9, +(size + d).toFixed(2))); article.style.setProperty("--fs", `${size}rem`); lsSet("ielts:news:size", size);
  } }, label);
  const readBtn = el("button", { class: "btn btn-sm" }, icon("check"), L("Đánh dấu đã đọc", "Mark as read"));
  const markRead = () => { const r = lsGet(K.read(uid), {}); r[a.id] = Date.now(); lsSet(K.read(uid), r); readBtn.disabled = true; readBtn.lastChild.textContent = L("Đã đọc", "Read"); };
  readBtn.onclick = markRead;
  if (lsGet(K.read(uid), {})[a.id]) { readBtn.disabled = true; readBtn.lastChild.textContent = L("Đã đọc", "Read"); }

  const bar = el("div", { class: "news-bar" }, hl.toolbar, el("div", { class: "row", style: "gap:4px" }, fontBtn(-0.06, "A−"), fontBtn(0.06, "A+")),
    el("div", { class: "spacer" }), readBtn,
    isAdmin(ctx.user) && a.mine ? el("button", { class: "btn btn-sm btn-ghost", onclick: async () => {
      if (!(await confirmDialog({ title: L("Xoá bài này?", "Delete this article?"), body: a.title, danger: true }))) return;
      await deleteArticle(a.id); ctx.go("news");
    } }, icon("trash")) : null);
  const tip = el("div", { class: "notice notice-info small" }, L("Mẹo: bấm vào một từ để tra · bôi đen 2–6 từ để tra cụm từ / collocation · chọn màu bút rồi bôi đen để tô highlight (bấm lại màu để tắt bút).",
    "Tip: click a word to look it up · select 2–6 words for a phrase or collocation · pick a pen colour and select text to highlight (click the colour again to stop)."));
  return el("div", { class: "stack" }, bar, tip, el("div", { class: "news-layout" }, article, pop), savedInArticle(ctx, a));
}

function sourceBlock(a) {
  if (a.url) return el("div", { class: "news-source" }, L("Nguồn: ", "Source: "), el("a", { href: a.url, target: "_blank", rel: "noopener" }, a.source || a.url),
    a.license ? ` · ${a.license}` : "");
  return el("div", { class: "news-source" },
    L("Bài do i-melts biên soạn theo văn phong IELTS Reading, tổng hợp từ kiến thức khoa học phổ biến. Đọc thêm: ", "Written by i-melts in IELTS Reading style from widely reported science. Further reading: "),
    ...(a.refs || []).flatMap((r, i) => [i ? " · " : "", el("a", { href: r.url, target: "_blank", rel: "noopener" }, r.name)]));
}

/* ----- highlight: lưu theo vị trí chữ trong đoạn ----- */
function paintPara(p, text, marks) {
  p.replaceChildren();
  let pos = 0;
  for (const [s, e, c] of [...marks].sort((x, y) => x[0] - y[0])) {
    if (s < pos || e > text.length) continue;
    if (s > pos) p.append(text.slice(pos, s));
    p.append(el("mark", { class: `hl hl-${c}` }, text.slice(s, e)));
    pos = e;
  }
  if (pos < text.length) p.append(text.slice(pos));
}
function readMarks(p) {
  const out = [];
  let pos = 0;
  const walk = (n) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) pos += c.nodeValue.length;
      else if (c.matches?.("mark.hl")) {
        const len = c.textContent.length;
        const col = (c.className.match(/hl-([a-z])/) || [])[1] || "y";
        const last = out[out.length - 1];
        if (last && last[1] === pos && last[2] === col) last[1] += len; else out.push([pos, pos + len, col]);
        pos += len;
      } else walk(c);
    }
  };
  walk(p);
  return out;
}

/* ----- tìm từ dưới con trỏ ----- */
function wordAt(x, y) {
  let node, off;
  if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); if (!c) return null; node = c.offsetNode; off = c.offset; }
  else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (!r) return null; node = r.startContainer; off = r.startOffset; }
  if (!node || node.nodeType !== 3) return null;
  const t = node.nodeValue;
  const isW = (ch) => /[A-Za-z'\-]/.test(ch || "");
  let s = off, e = off;
  while (s > 0 && isW(t[s - 1])) s--;
  while (e < t.length && isW(t[e])) e++;
  if (e <= s) return null;
  const range = document.createRange();
  range.setStart(node, s); range.setEnd(node, e);
  return { text: t.slice(s, e).replace(/^'+|'+$/g, ""), rect: range.getBoundingClientRect() };
}
function sentenceOf(paraText, word) {
  const ss = paraText.match(/[^.!?]+[.!?]+["')]*\s*/g) || [paraText];
  return (ss.find((s) => s.toLowerCase().includes(word.toLowerCase())) || "").trim();
}

/* ======================= TRA TỪ ======================= */
const aiOn = () => isConfigured && AI_QUIZ.enabled;
const stem = (w) => {
  const x = wkey(w);
  const c = [x];
  if (x.endsWith("ies")) c.push(x.slice(0, -3) + "y");
  if (x.endsWith("es")) c.push(x.slice(0, -2));
  if (x.endsWith("s")) c.push(x.slice(0, -1));
  if (x.endsWith("ed")) c.push(x.slice(0, -2), x.slice(0, -1));
  if (x.endsWith("ing")) c.push(x.slice(0, -3), x.slice(0, -3) + "e");
  if (x.endsWith("ly")) c.push(x.slice(0, -2));
  return c;
};
let BY_WORD = null;
function localEntry(text) {
  if (!BY_WORD) {
    BY_WORD = new Map();
    for (const w of ALL_WORDS) { const k = wkey(w.word); if (k && !BY_WORD.has(k)) BY_WORD.set(k, w); }
  }
  for (const k of stem(text)) {
    const w = BY_WORD.get(k);
    if (w) return { word: w.word, ipa: w.ipa || "", pos: w.pos || "", vi: w.vi || "", def: w.def || "", example: w.example || "", colloc: [], level: "", local: true };
  }
  return null;
}

let _model = null;
async function aiLookup(text, sentence) {
  const { aiMod, ai } = await initAI();
  if (!_model) {
    const S = aiMod.Schema;
    _model = aiMod.getGenerativeModel(ai, {
      model: AI_QUIZ.model,
      systemInstruction: "You are a precise English–Vietnamese learner's dictionary for IELTS students. Use British English IPA. Return JSON only.",
      generationConfig: {
        responseMimeType: "application/json", temperature: 0.2,
        responseSchema: S.object({ properties: {
          lemma: S.string(), ipa: S.string(), pos: S.string(), level: S.string(),
          vi: S.string(), def: S.string(), collocations: S.array({ items: S.string() }), usage: S.string(),
        } }),
      },
    });
  }
  const prompt = `Word or phrase: "${text}"\nSentence: "${sentence}"\n` +
    "Give: lemma (dictionary form), ipa (British, with slashes), pos (n./v./adj./adv./phrase…), level (CEFR A1–C2), " +
    "vi (short Vietnamese meaning that fits THIS sentence), def (short English definition), collocations (4–6 common collocations useful for IELTS, e.g. 'pose a threat'), " +
    "usage (one short Vietnamese note on usage or a common mistake).";
  const r = JSON.parse((await _model.generateContent(prompt)).response.text());
  return { word: r.lemma || text, ipa: r.ipa || "", pos: r.pos || "", level: r.level || "", vi: r.vi || "", def: r.def || "",
    colloc: (r.collocations || []).slice(0, 6), usage: r.usage || "", ai: true };
}

async function lookup(text, sentence) {
  const k = wkey(text);
  const cache = lsGet(K.dict, {});
  if (cache[k]) return cache[k];
  const local = localEntry(text);
  if (aiOn()) {
    try {
      const r = await aiLookup(text, sentence);
      const merged = { ...r, ipa: r.ipa || local?.ipa || "", vi: r.vi || local?.vi || "" };
      const keys = Object.keys(cache);
      if (keys.length > 2000) delete cache[keys[0]];
      cache[k] = merged; lsSet(K.dict, cache);
      return merged;
    } catch (err) { console.warn("tra từ AI", err); if (local) return local; throw err; }
  }
  if (local) return local;
  return null;
}

function showPop(ctx, a, pop, text, sentence, rect) {
  const uid = ctx.user.uid;
  pop.classList.remove("hidden");
  // đặt cạnh từ được bấm (trên điện thoại: dạng tấm trượt dưới màn hình — xem CSS)
  const top = rect ? Math.min(rect.bottom + 8, window.innerHeight - 260) : 120;
  const left = rect ? Math.min(Math.max(12, rect.left - 20), window.innerWidth - 372) : 20;
  pop.style.top = `${top}px`; pop.style.left = `${left}px`;
  const close = el("button", { class: "icon-btn word-pop-x", title: L("Đóng", "Close"), onclick: () => pop.classList.add("hidden") }, icon("x"));
  pop.replaceChildren(close, el("div", { class: "word-pop-head" }, el("strong", {}, text)), el("div", { class: "muted small" }, L("Đang tra…", "Looking up…")));
  lookup(text, sentence).then((d) => {
    if (!d) {
      pop.replaceChildren(close, el("div", { class: "word-pop-head" }, el("strong", {}, text),
        el("button", { class: "icon-btn", title: L("Nghe", "Listen"), onclick: () => speakText(text) }, icon("volume"))),
        el("p", { class: "small muted" }, L("Chưa có trong từ điển của web (AI tra từ đang tắt). Bạn vẫn lưu được từ kèm ghi chú.", "Not in the built-in dictionary (AI lookup is off). You can still save it with a note.")),
        saveBox(ctx, a, { word: text, sentence }));
      return;
    }
    pop.replaceChildren(...[close,
      el("div", { class: "word-pop-head" },
        el("strong", {}, d.word), d.ipa ? el("span", { class: "ipa" }, d.ipa) : null,
        el("button", { class: "icon-btn", title: L("Nghe", "Listen"), onclick: () => speakText(d.word) }, icon("volume"))),
      el("div", { class: "row wrap", style: "gap:6px" }, d.pos ? el("span", { class: "pos" }, d.pos) : null,
        d.level ? el("span", { class: "chip chip-lv" }, d.level) : null,
        d.ai ? el("span", { class: "tiny muted" }, L("· AI tra theo ngữ cảnh", "· AI, in context")) : null),
      d.vi ? el("div", { class: "word-pop-vi" }, d.vi) : null,
      d.def ? el("div", { class: "small muted" }, d.def) : null,
      d.colloc?.length ? el("div", { class: "stack-sm" }, el("div", { class: "tiny strong" }, "Collocations"),
        el("div", { class: "row wrap", style: "gap:5px" }, d.colloc.map((c) => el("span", { class: "word-chip" }, c)))) : null,
      d.usage ? el("div", { class: "tiny", style: "color:var(--ink-2)" }, "💡 ", d.usage) : null,
      sentence ? el("div", { class: "word-pop-ctx" }, sentence) : null,
      saveBox(ctx, a, { ...d, sentence })].filter(Boolean));
  }).catch((err) => {
    pop.replaceChildren(close, el("div", { class: "word-pop-head" }, el("strong", {}, text)),
      el("div", { class: "notice notice-error small" }, L("Không tra được: ", "Lookup failed: ") + String(err?.message || err).slice(0, 160)),
      saveBox(ctx, a, { word: text, sentence }));
  });
}

/** ô ghi chú + nút lưu vào sổ từ đọc báo */
function saveBox(ctx, a, d) {
  const uid = ctx.user.uid;
  const k = wkey(d.word);
  const all = lsGet(K.words(uid), {});
  const note = el("textarea", { class: "word-pop-note", rows: 2, placeholder: L("Ghi chú của bạn: collocation, ví dụ tự đặt…", "Your note: collocations, your own example…") });
  note.value = all[k]?.note || "";
  const btn = el("button", { class: "btn btn-sm " + (all[k] ? "" : "btn-primary") }, icon("bookmark"), all[k] ? L("Đã lưu · cập nhật", "Saved · update") : L("Lưu từ", "Save word"));
  btn.onclick = () => {
    const cur = lsGet(K.words(uid), {});
    cur[k] = { word: d.word, ipa: d.ipa || "", pos: d.pos || "", level: d.level || "", vi: d.vi || "", def: d.def || "", colloc: d.colloc || [],
      note: note.value.trim(), sentence: d.sentence || "", articleId: a.id, title: a.title, savedAt: cur[k]?.savedAt || Date.now() };
    lsSet(K.words(uid), cur);
    btn.className = "btn btn-sm"; btn.lastChild.textContent = L("Đã lưu · cập nhật", "Saved · update");
    toast(L(`Đã lưu “${d.word}”`, `Saved “${d.word}”`), "ok");
    document.dispatchEvent(new CustomEvent("news-words"));
  };
  return el("div", { class: "stack-sm", style: "margin-top:6px" }, note, el("div", {}, btn));
}

/* ----- từ đã lưu từ bài đang đọc ----- */
function savedInArticle(ctx, a) {
  const box = el("div", { class: "card stack-sm" });
  const paint = () => {
    const ws = Object.values(lsGet(K.words(ctx.user.uid), {})).filter((w) => w.articleId === a.id);
    box.classList.toggle("hidden", !ws.length);
    box.replaceChildren(el("div", { class: "card-title" }, icon("bookmark"), el("h3", {}, L(`Từ đã lưu từ bài này (${ws.length})`, `Words saved from this article (${ws.length})`))),
      el("div", { class: "word-chips" }, ws.map((w) => el("span", { class: "word-chip", title: w.vi }, w.word))));
  };
  document.addEventListener("news-words", paint);
  paint();
  return box;
}

/* ======================= SỔ TỪ ĐỌC BÁO ======================= */
function savedWordsView(ctx) {
  const uid = ctx.user.uid;
  const box = el("div", { class: "stack" });
  const paint = () => {
    const all = lsGet(K.words(uid), {});
    const ws = Object.entries(all).sort((x, y) => y[1].savedAt - x[1].savedAt);
    if (!ws.length) {
      box.replaceChildren(el("div", { class: "card muted" }, L("Chưa lưu từ nào. Mở một bài báo, bấm vào từ rồi chọn “Lưu từ”.", "No saved words yet. Open an article, click a word and choose “Save word”.")));
      return;
    }
    const toSet = el("button", { class: "btn btn-primary btn-sm" }, icon("cards"), L("Tạo học phần để ôn", "Make a study set"));
    toSet.onclick = async () => {
      toSet.disabled = true;
      try {
        const id = await saveSet(ctx.user, { title: L("Từ đọc báo khoa học", "Science reading words"), desc: L("Lưu từ mục Đọc báo", "Saved while reading"),
          cards: ws.map(([, w]) => ({ t: w.word, d: [w.vi || w.def, w.ipa].filter(Boolean).join(" · ") || w.note || "—" })) });
        toast(L("Đã tạo học phần", "Study set created"), "ok");
        ctx.go(`set/my:${id}`);
      } catch (err) { toSet.disabled = false; toast(err.message, "err", 6000); }
    };
    box.replaceChildren(
      el("div", { class: "row wrap", style: "gap:10px" }, el("span", { class: "muted small", style: "flex:1" },
        L(`${ws.length} từ · lưu trên trình duyệt này`, `${ws.length} words · saved in this browser`)), toSet),
      el("div", { class: "card card-flush" }, el("div", { class: "word-list" }, ws.map(([k, w]) => {
        const note = el("textarea", { class: "word-pop-note", rows: 2 });
        note.value = w.note || "";
        note.onchange = () => { const cur = lsGet(K.words(uid), {}); if (cur[k]) { cur[k].note = note.value.trim(); lsSet(K.words(uid), cur); toast(L("Đã lưu ghi chú", "Note saved"), "ok", 1500); } };
        return el("div", { class: "word-row" },
          el("button", { class: "icon-btn", title: L("Nghe", "Listen"), onclick: () => speakText(w.word) }, icon("volume")),
          el("div", { class: "word-main stack-sm" },
            el("div", { class: "row wrap", style: "gap:8px" }, el("strong", { class: "word" }, w.word), w.ipa ? el("span", { class: "ipa" }, w.ipa) : null,
              w.pos ? el("span", { class: "pos" }, w.pos) : null, w.level ? el("span", { class: "chip chip-lv" }, w.level) : null),
            w.vi ? el("div", { class: "vi" }, w.vi) : null,
            w.colloc?.length ? el("div", { class: "row wrap", style: "gap:5px" }, w.colloc.map((c) => el("span", { class: "word-chip" }, c))) : null,
            w.sentence ? el("div", { class: "word-pop-ctx" }, w.sentence, " ", el("a", { href: `#news/${w.articleId}` }, `— ${w.title}`)) : null,
            note),
          el("button", { class: "icon-btn", title: L("Xoá", "Delete"), onclick: () => { const cur = lsGet(K.words(uid), {}); delete cur[k]; lsSet(K.words(uid), cur); paint(); } }, icon("trash")));
      }))));
  };
  paint();
  return box;
}
