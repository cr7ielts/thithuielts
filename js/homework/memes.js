// Meme nhận xét homework: kho meme mèo i-melts dựng sẵn (SVG, không dính bản quyền) theo sắc thái cảm xúc,
// cộng ảnh meme giáo viên tự tải lên (Firestore `memes` + Storage `memes/`). Khi chấm, web gợi ý meme theo điểm.
// Bài nộp lưu teacherMeme = { kind: "cat", id, top, bottom } | { kind: "img", id, url, caption }.
import { el, icon, toast, confirmDialog } from "../ui.js";
import { createCat } from "../cat.js";
import { L } from "../i18n.js";
import { initFirebase, isConfigured } from "../firebase.js";

/* ======================= SẮC THÁI ======================= */
export const TONES = [
  { id: "wow",      vi: "Xuất sắc",        en: "Outstanding",  color: "#f5b301" },
  { id: "good",     vi: "Làm tốt",         en: "Well done",    color: "#16a870" },
  { id: "improve",  vi: "Tiến bộ",         en: "Improving",    color: "#1aa6b7" },
  { id: "ok",       vi: "Tạm ổn",          en: "Not bad",      color: "#5aa6d6" },
  { id: "push",     vi: "Cố lên",          en: "Keep going",   color: "#7c8cf0" },
  { id: "sad",      vi: "Báo động",        en: "Uh-oh",        color: "#e5484d" },
  { id: "careless", vi: "Cẩu thả",         en: "Careless",     color: "#ff8a2a" },
  { id: "lazy",     vi: "Làm sơ sài",      en: "Too little",   color: "#8792a8" },
  { id: "late",     vi: "Nộp muộn",        en: "Late",         color: "#a35bd6" },
  { id: "fun",      vi: "Vui vẻ",          en: "Just for fun", color: "#e0559b" },
];
export const toneOf = (id) => TONES.find((t) => t.id === id) || TONES[TONES.length - 1];
export const toneName = (t) => L(t.vi, t.en);

/* ======================= KHO MEME MÈO =======================
   [id, sắc thái, biểu cảm mèo (idle|happy|sad|think|sleep|wow), đạo cụ emoji, chữ trên (vi, en), chữ dưới (vi, en)] */
const RAW = [
  ["wow-1", "wow", "happy", "👑", ["Bài này", "This essay"], ["chấm 10 còn thấy thiếu", "deserves more than full marks"]],
  ["wow-2", "wow", "wow", "🤯", ["Cô đọc xong", "Me after reading this"], ["phải đứng dậy vỗ tay", "standing ovation"]],
  ["wow-3", "wow", "happy", "🔥", ["Từ vựng xịn thế này", "Vocabulary this good"], ["giám khảo cũng phải xin bí kíp", "the examiner wants your secret"]],
  ["wow-4", "wow", "happy", "🏆", ["Band 9 đang gọi tên", "Band 9 is calling"], ["nhớ bắt máy nhé", "pick up the phone"]],
  ["wow-5", "wow", "wow", "✨", ["Không một lỗi sai", "Zero mistakes"], ["mèo kiểm tra lại 3 lần", "the cat checked three times"]],

  ["good-1", "good", "happy", "👍", ["Ổn áp lắm", "Solid work"], ["giữ phong độ này nha", "keep this up"]],
  ["good-2", "good", "happy", "😎", ["Làm bài kiểu", "Doing homework like"], ["chuyện nhỏ như con thỏ", "it's no big deal"]],
  ["good-3", "good", "idle", "💪", ["Nền tảng chắc rồi", "Strong foundations"], ["giờ lên level thôi", "time to level up"]],
  ["good-4", "good", "happy", "🌟", ["Cô hài lòng", "Teacher is pleased"], ["mèo cũng hài lòng", "so is the cat"]],

  ["improve-1", "improve", "wow", "📈", ["Tuần trước:  🐢", "Last week: 🐢"], ["Tuần này: 🚀", "This week: 🚀"]],
  ["improve-2", "improve", "happy", "🌱", ["Từng chút một", "Little by little"], ["mà tiến bộ thấy rõ", "and it really shows"]],
  ["improve-3", "improve", "wow", "🆙", ["Ơ kìa", "Wait a minute"], ["ai lên tay nhanh vậy?", "who levelled up so fast?"]],
  ["improve-4", "improve", "happy", "🧗", ["Đang leo dốc", "Climbing the hill"], ["sắp tới đỉnh rồi", "the top is close"]],

  ["ok-1", "ok", "think", "🤔", ["Ý tưởng có rồi", "The ideas are there"], ["giờ chăm chút câu chữ nữa", "now polish the language"]],
  ["ok-2", "ok", "idle", "🙂", ["Không tệ", "Not bad"], ["nhưng em làm được hơn thế", "but you can do better"]],
  ["ok-3", "ok", "think", "🧩", ["Gần đủ mảnh ghép rồi", "Almost all the pieces"], ["thiếu xíu thôi", "just a few missing"]],
  ["ok-4", "ok", "idle", "⚖️", ["Đúng một nửa", "Half right"], ["nửa còn lại để tuần sau nhé", "the other half next week"]],

  ["push-1", "push", "think", "🔋", ["Năng lượng đang 30%", "Battery at 30%"], ["sạc thêm từ vựng nhé", "charge up on vocabulary"]],
  ["push-2", "push", "idle", "🐾", ["Mèo tin em", "The cat believes in you"], ["lần sau sẽ khác", "next time will be different"]],
  ["push-3", "push", "think", "📚", ["Ôn lại bài cũ", "Review the old lessons"], ["rồi mình chiến tiếp", "then we go again"]],
  ["push-4", "push", "happy", "🥊", ["Ngã thì đứng dậy", "Fall down"], ["phủi bụi rồi làm lại", "get up, try again"]],

  ["sad-1", "sad", "sad", "😭", ["Cô chấm bài này", "Me marking this"], ["mà nước mắt rơi", "with tears in my eyes"]],
  ["sad-2", "sad", "sad", "🚨", ["Báo động đỏ", "Red alert"], ["gặp cô sau giờ học nhé", "see me after class"]],
  ["sad-3", "sad", "wow", "😱", ["Khi điểm số", "When the score"], ["còn thấp hơn nhiệt độ phòng", "is lower than room temperature"]],
  ["sad-4", "sad", "sad", "🫠", ["Mèo tan chảy", "The cat is melting"], ["vì buồn chứ không phải vì nóng", "from sadness, not heat"]],

  ["careless-1", "careless", "wow", "🔍", ["Lỗi chính tả", "Spelling mistakes"], ["trốn kỹ quá cô tìm mỏi mắt", "hiding everywhere"]],
  ["careless-2", "careless", "think", "🙈", ["Biết làm nhưng", "You knew it but"], ["đọc đề vội quá", "read the question too fast"]],
  ["careless-3", "careless", "wow", "🤦", ["Đáp án đúng ngay đó", "The answer was right there"], ["mà em lướt qua mất", "and you scrolled past it"]],
  ["careless-4", "careless", "think", "✍️", ["Kiểm tra lại trước khi nộp", "Check before you submit"], ["30 giây cứu cả bài", "30 seconds saves the day"]],

  ["lazy-1", "lazy", "sleep", "💤", ["Bài làm ngắn đến mức", "Answer so short"], ["mèo đọc chưa kịp ngáp", "the cat didn't finish yawning"]],
  ["lazy-2", "lazy", "think", "🧐", ["250 từ", "250 words"], ["chứ không phải 25 từ nha", "not 25"]],
  ["lazy-3", "lazy", "sleep", "🛋️", ["Làm cho có", "Doing it just to finish"], ["thì điểm cũng cho có thôi", "gets a just-to-finish mark"]],
  ["lazy-4", "lazy", "idle", "🐌", ["Viết thêm chút nữa", "Write a bit more"], ["giám khảo không đọc được suy nghĩ", "examiners can't read minds"]],

  ["late-1", "late", "sleep", "⏰", ["Hạn nộp: hôm qua", "Deadline: yesterday"], ["Em: vẫn bình tĩnh", "You: totally calm"]],
  ["late-2", "late", "think", "🕰️", ["Muộn còn hơn không", "Better late than never"], ["nhưng đúng giờ thì hơn nữa", "but on time is better"]],
  ["late-3", "late", "wow", "🏃", ["Chạy deadline", "Racing the deadline"], ["và deadline thắng", "and the deadline won"]],
  ["late-4", "late", "sleep", "📅", ["Lần sau đặt báo thức", "Set an alarm next time"], ["mèo nhắc giùm cho", "the cat will remind you"]],

  ["fun-1", "fun", "happy", "🧋", ["Làm xong bài", "Homework done"], ["thưởng một ly trà sữa", "treat yourself to bubble tea"]],
  ["fun-2", "fun", "idle", "☕", ["Cô chấm bài lúc 2 giờ sáng", "Marking at 2 a.m."], ["mèo vẫn thức cùng", "the cat stayed up too"]],
  ["fun-3", "fun", "think", "🐟", ["Mèo hỏi", "The cat asks"], ["em có mang cá không?", "did you bring fish?"]],
  ["fun-4", "fun", "happy", "🎉", ["Hết bài rồi", "No more homework"], ["… cho đến tuần sau", "… until next week"]],
];
export const CAT_MEMES = RAW.map(([id, tone, mood, prop, top, bottom]) => ({ id, tone, mood, prop, top: L(...top), bottom: L(...bottom) }));
const catById = (id) => CAT_MEMES.find((m) => m.id === id);

/* ======================= GỢI Ý THEO ĐIỂM ======================= */
/** "8/10" · "Band 6.5" · "7" · "85" · "85%" → tỉ lệ 0–1, không đọc được thì null */
export function scoreRatio(text) {
  const s = String(text || "").replace(",", ".");
  let m = s.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (m && +m[2] > 0) return Math.min(1, +m[1] / +m[2]);
  m = s.match(/band\s*(\d(?:\.\d)?)/i);
  if (m) return Math.min(1, +m[1] / 9);
  m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) return Math.min(1, +m[1] / 100);
  m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const v = +m[1];
  return v <= 9 && /band/i.test(s) ? v / 9 : v <= 10 ? v / 10 : v <= 100 ? v / 100 : null;
}

/** Các sắc thái hợp với bài: theo điểm và nộp muộn */
export function suggestTones({ score, late }) {
  const r = scoreRatio(score);
  const out = [];
  if (late) out.push("late");
  if (r == null) out.push("good", "push", "fun");
  else if (r >= 0.9) out.push("wow", "good");
  else if (r >= 0.75) out.push("good", "improve");
  else if (r >= 0.6) out.push("ok", "improve", "careless");
  else if (r >= 0.4) out.push("push", "careless", "lazy");
  else out.push("sad", "push", "lazy");
  return out;
}

/* ======================= MEME GIÁO VIÊN TẢI LÊN ======================= */
const LS = "ielts:memes";
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; } };
let customCache = null;

export async function listCustomMemes(force = false) {
  if (customCache && !force) return customCache;
  if (!isConfigured) customCache = lsRead();
  else {
    const { db, dbMod } = await initFirebase();
    const snap = await dbMod.getDocs(dbMod.collection(db, "memes"));
    customCache = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return customCache;
}

/** Thu nhỏ ảnh (tối đa 720px) → Blob JPEG; GIF giữ nguyên để còn chuyển động */
async function shrink(file) {
  if (file.type === "image/gif") return file;
  const img = await createImageBitmap(file);
  const k = Math.min(1, 720 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
}

export async function addCustomMeme(file, { caption, tone }) {
  if (!file.type.startsWith("image/")) throw new Error(L("Chỉ nhận file ảnh.", "Images only."));
  const blob = await shrink(file);
  if (blob.size > 5 * 1024 * 1024) throw new Error(L("Ảnh quá 5 MB.", "Image is over 5 MB."));
  const rec = { caption: caption.trim().slice(0, 140), tone, createdAt: Date.now() };
  if (!isConfigured) {
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
    const list = lsRead();
    const m = { ...rec, id: "m" + Date.now().toString(36), url, path: "" };
    list.unshift(m);
    try { localStorage.setItem(LS, JSON.stringify(list)); } catch { throw new Error(L("Bộ nhớ trình duyệt đầy.", "Browser storage is full.")); }
    customCache = list;
    return m;
  }
  const { db, dbMod, storage, stMod } = await initFirebase();
  const ext = blob.type === "image/gif" ? "gif" : "jpg";
  const path = `memes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const ref = stMod.ref(storage, path);
  await stMod.uploadBytes(ref, blob, { contentType: blob.type || "image/jpeg" });
  const url = await stMod.getDownloadURL(ref);
  const doc = await dbMod.addDoc(dbMod.collection(db, "memes"), { ...rec, url, path });
  const m = { ...rec, id: doc.id, url, path };
  customCache = [m, ...(customCache || [])];
  return m;
}

export async function deleteCustomMeme(m) {
  if (!isConfigured) {
    const list = lsRead().filter((x) => x.id !== m.id);
    localStorage.setItem(LS, JSON.stringify(list));
    customCache = list;
    return;
  }
  const { db, dbMod, storage, stMod } = await initFirebase();
  await dbMod.deleteDoc(dbMod.doc(db, "memes", m.id));
  if (m.path) stMod.deleteObject(stMod.ref(storage, m.path)).catch(() => {});
  customCache = (customCache || []).filter((x) => x.id !== m.id);
}

/* ======================= VẼ MEME ======================= */
/** Giá trị lưu vào bài nộp */
export const memeValue = (m) => (m.kind === "img"
  ? { kind: "img", id: m.id, url: m.url, caption: m.caption || "", tone: m.tone }
  : { kind: "cat", id: m.id, top: m.top, bottom: m.bottom, tone: m.tone });

/** Vẽ một meme (từ kho hoặc từ giá trị đã lưu trong bài nộp). size: "sm" (ô chọn) | "lg" (học sinh xem) */
export function memeCard(v, size = "lg") {
  if (!v) return null;
  if (v.kind === "img") {
    return el("figure", { class: `meme meme-img ${size}`, style: `--tone:${toneOf(v.tone).color}` },
      el("img", { src: v.url, alt: v.caption || "meme", loading: "lazy" }),
      v.caption ? el("figcaption", { class: "meme-cap" }, v.caption) : null);
  }
  const m = catById(v.id) || { mood: "idle", prop: "", tone: v.tone };
  const top = v.top ?? m.top, bottom = v.bottom ?? m.bottom;
  const cat = createCat({ size: size === "sm" ? 74 : 150, mood: m.mood, track: false });
  return el("figure", { class: `meme meme-cat ${size}`, style: `--tone:${toneOf(m.tone || v.tone).color}`, role: "img", "aria-label": `${top} — ${bottom}` },
    el("div", { class: "meme-top" }, top),
    el("div", { class: "meme-art" }, cat, m.prop ? el("span", { class: "meme-prop" }, m.prop) : null),
    el("div", { class: "meme-bottom" }, bottom));
}

/* ======================= Ô CHỌN MEME KHI CHẤM ======================= */
/**
 * picker({ initial, getContext }) → { node, value() }
 * getContext() trả { score, late } để gợi ý lại mỗi lần điểm thay đổi.
 */
export function memePicker({ initial = null, getContext }) {
  let chosen = initial;
  let tone = "suggest";
  let customs = [];
  const preview = el("div", { class: "meme-chosen" });
  const grid = el("div", { class: "meme-grid" });
  const tabs = el("div", { class: "meme-tabs" });
  const body = el("div", { class: "meme-body hidden" }, tabs, grid);

  const all = () => [...CAT_MEMES.map((m) => ({ ...m, kind: "cat" })), ...customs.map((m) => ({ ...m, kind: "img" }))];
  const same = (a, b) => a && b && a.kind === b.kind && a.id === b.id;

  function paintPreview() {
    preview.innerHTML = "";
    if (!chosen) { preview.append(el("span", { class: "muted small" }, L("Chưa gắn meme", "No meme attached"))); return; }
    preview.append(memeCard(chosen, "sm"), el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { chosen = null; paintPreview(); paintGrid(); } }, icon("x"), L("Bỏ meme", "Remove")));
  }

  function paintTabs() {
    tabs.innerHTML = "";
    const tab = (id, label, color) => el("button", { type: "button", class: "meme-tab" + (tone === id ? " on" : ""), style: color ? `--tone:${color}` : null,
      onclick: () => { tone = id; paintTabs(); paintGrid(); } }, label);
    tabs.append(tab("suggest", L("✨ Gợi ý", "✨ Suggested")), ...TONES.map((t) => tab(t.id, toneName(t), t.color)), tab("mine", L("Ảnh của tôi", "My uploads")));
  }

  function paintGrid() {
    grid.innerHTML = "";
    let list;
    if (tone === "suggest") {
      const tones = suggestTones(getContext());
      list = all().filter((m) => tones.includes(m.tone)).sort((a, b) => tones.indexOf(a.tone) - tones.indexOf(b.tone));
    } else if (tone === "mine") list = customs.map((m) => ({ ...m, kind: "img" }));
    else list = all().filter((m) => m.tone === tone);
    if (tone === "mine") grid.append(uploader());
    if (!list.length && tone !== "mine") grid.append(el("p", { class: "muted small" }, L("Chưa có meme nào ở mục này.", "Nothing here yet.")));
    list.forEach((m) => {
      const v = memeValue(m);
      const cell = el("button", { type: "button", class: "meme-pick" + (same(chosen, v) ? " on" : ""), title: m.kind === "img" ? m.caption : `${m.top} — ${m.bottom}`,
        onclick: () => { chosen = v; paintPreview(); paintGrid(); } }, memeCard(v, "sm"));
      if (m.kind === "img" && tone === "mine") {
        grid.append(el("div", { class: "meme-mine" }, cell, el("button", { type: "button", class: "icon-btn", title: L("Xoá", "Delete"), onclick: async () => {
          if (!(await confirmDialog({ title: L("Xoá meme này?", "Delete this meme?"), body: L("Bài đã gắn meme này vẫn giữ ảnh.", "Already-marked work keeps it."), danger: true, okText: L("Xoá", "Delete") }))) return;
          await deleteCustomMeme(m); customs = customs.filter((x) => x.id !== m.id); paintGrid();
        } }, icon("trash"))));
      } else grid.append(cell);
    });
  }

  function uploader() {
    const file = el("input", { type: "file", accept: "image/*", class: "hidden" });
    const cap = el("input", { type: "text", maxlength: 140, placeholder: L("Chú thích (không bắt buộc)", "Caption (optional)") });
    const sel = el("select", {}, TONES.map((t) => el("option", { value: t.id }, toneName(t))));
    const btn = el("button", { type: "button", class: "btn btn-sm", onclick: () => file.click() }, icon("upload"), L("Tải meme lên", "Upload a meme"));
    file.onchange = async () => {
      const f = file.files[0]; if (!f) return;
      btn.disabled = true;
      try {
        const m = await addCustomMeme(f, { caption: cap.value, tone: sel.value });
        customs = [m, ...customs.filter((x) => x.id !== m.id)];
        chosen = memeValue({ ...m, kind: "img" });
        toast(L("Đã thêm meme.", "Meme added."), "ok");
        paintPreview(); paintGrid();
      } catch (err) { toast(err.message || String(err), "err"); btn.disabled = false; }
    };
    return el("div", { class: "meme-upload" }, cap, sel, btn, file);
  }

  const toggle = el("button", { type: "button", class: "btn btn-sm", onclick: () => {
    const open = body.classList.toggle("hidden") === false;
    if (open) paintGrid();
  } }, "😹 ", L("Chọn meme", "Pick a meme"));

  listCustomMemes().then((l) => { customs = l; if (!body.classList.contains("hidden")) paintGrid(); }).catch(() => {});
  paintTabs(); paintPreview();
  return {
    node: el("div", { class: "meme-picker" }, el("div", { class: "row wrap", style: "gap:10px" }, el("span", { class: "field-label mb-0" }, L("Meme nhận xét", "Feedback meme")), toggle, preview), body),
    value: () => chosen,
    refresh: () => { if (!body.classList.contains("hidden") && tone === "suggest") paintGrid(); },
  };
}
