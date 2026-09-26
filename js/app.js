// Điều hướng, đăng nhập Google, trang chủ
import { el, toast, fmtDateTime, setExamGuard, icon } from "./ui.js";
import { initFirebase, isConfigured, isAdmin } from "./firebase.js";
import { ensureStudentProfile, listMySubmissions } from "./store.js";
import { DURATION, BRAND, ALLOW_EMAIL_SIGNUP } from "./config.js";
import { createCat, catLogoSVG } from "./cat.js";
import { L, getLang, setLang } from "./i18n.js";
import { currentTheme, toggleTheme } from "./theme.js";
import { mountBackground } from "./bgfloat.js";
import { renderListening } from "./skills/listening.js";
import { renderReading } from "./skills/reading.js";
import { renderWriting } from "./skills/writing.js";
import { renderSpeaking } from "./skills/speaking.js";
import { renderResult, renderHistory, renderAdmin } from "./results.js";
import { initProgress, getStats } from "./vocab/progress.js";
import { renderVocabHub, renderDeck, renderReview, statStrip } from "./vocab/views.js";
import { renderGamesHub, renderGame, GAMES, WORDPLAY_GAMES } from "./vocab/games.js";
import { renderIdioms, renderIdiomGame } from "./wordplay/idioms.js";
import { renderPuns, renderPunGame } from "./wordplay/puns.js";
import { renderHomework, renderHomeworkDetail, renderHomeworkForm, renderHomeworkReview, homeworkWidget } from "./homework/views.js";
import { renderBank, renderBankPractice, renderBankImport } from "./bank/bank.js";
import { loadMyClasses, hasClass, normCode } from "./classes/clstore.js";
import { renderClasses, renderClass, renderJoin, tryJoin } from "./classes/views.js";

const app = document.getElementById("app");
let user = null;
let signOutFn = null;
let pendingName = null; // tên nhập lúc đăng ký email, gắn vào hồ sơ khi tài khoản vừa được tạo

const ctx = {
  get user() { return user; },
  get data() { return routeData; },   // dữ liệu kèm theo lần chuyển trang (vd. bài ngân hàng đề để giao bài tập)
  go,
};

const SKILLS = [
  { id: "listening", name: "Listening",
    meta: L(`40 câu · ${DURATION.listening} phút`, `40 questions · ${DURATION.listening} min`),
    desc: L("4 section hội thoại và bài giảng, nghe một lần như thi thật.", "4 sections of conversations and talks, played once like the real test.") },
  { id: "reading", name: "Reading",
    meta: L(`40 câu · ${DURATION.reading} phút`, `40 questions · ${DURATION.reading} min`),
    desc: L("3 bài đọc học thuật, bài đọc và câu hỏi đặt cạnh nhau.", "3 academic passages with the text and questions side by side.") },
  { id: "writing", name: "Writing",
    meta: L(`2 task · ${DURATION.writing} phút`, `2 tasks · ${DURATION.writing} min`),
    desc: L("Task 1 mô tả biểu đồ, Task 2 nghị luận, đếm từ trực tiếp.", "Task 1 chart report and Task 2 essay, with a live word count.") },
  { id: "speaking", name: "Speaking",
    meta: L(`3 part · ~${DURATION.speaking} phút`, `3 parts · ~${DURATION.speaking} min`),
    desc: L("Trả lời và ghi âm từng câu để giáo viên nghe, chấm điểm.", "Answer and record each question so your teacher can listen and mark.") },
];

/* ===================== Mã lớp chờ vào ===================== */
const PENDING = "ielts:pendingClass";
const pendingCode = {
  get() { try { return sessionStorage.getItem(PENDING) || ""; } catch { return ""; } },
  set(v) { try { v ? sessionStorage.setItem(PENDING, normCode(v)) : sessionStorage.removeItem(PENDING); } catch { /* chế độ riêng tư */ } },
};

/** Sau khi đăng nhập: nạp lớp của học sinh, rồi vào lớp bằng mã đang chờ (nếu có) */
async function afterSignIn(u) {
  await loadMyClasses(isAdmin(u) ? null : u);
  const code = pendingCode.get();
  if (!code || isAdmin(u)) { pendingCode.set(""); return; }
  pendingCode.set("");
  if (route.startsWith("join/")) { route = "home"; history.replaceState(null, "", "#home"); }
  setTimeout(() => tryJoin(ctx, code), 0);
}

/* ===================== Khởi động ===================== */
async function init() {
  if (!isConfigured) {
    const demo = localStorage.getItem("ielts:demoUser");
    user = demo ? JSON.parse(demo) : null;
    signOutFn = async () => { localStorage.removeItem("ielts:demoUser"); user = null; render(); };
    if (user) { await initProgress(user); await loadMyClasses(isAdmin(user) ? null : user); }
    render();
    return;
  }

  const { auth, authMod } = await initFirebase();
  signOutFn = () => authMod.signOut(auth);
  authMod.onAuthStateChanged(auth, async (u) => {
    if (u && !u.displayName && pendingName) {
      try { await authMod.updateProfile(u, { displayName: pendingName }); await u.reload(); u = auth.currentUser; }
      catch (e) { console.warn(e); }
      pendingName = null;
    }
    user = u;
    if (u) {
      try { await ensureStudentProfile(u); } catch (e) { console.warn(e); }
      await initProgress(u);
      await afterSignIn(u);
    }
    render();
  });
}

async function signInWithGoogle() {
  if (!isConfigured) return;
  const { auth, authMod } = await initFirebase();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
      await authMod.signInWithRedirect(auth, provider);
    } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
      toast(L("Đăng nhập thất bại: ", "Sign-in failed: ") + err.message, "err", 6000);
    }
  }
}

/* ---------- Email + mật khẩu ---------- */
function authMessage(err) {
  const map = {
    "auth/email-already-in-use": L("Email này đã có tài khoản — hãy đăng nhập.", "This email already has an account — sign in instead."),
    "auth/invalid-email": L("Email không hợp lệ.", "That email address isn't valid."),
    "auth/weak-password": L("Mật khẩu cần ít nhất 6 ký tự.", "Your password needs at least 6 characters."),
    "auth/invalid-credential": L("Email hoặc mật khẩu không đúng.", "Wrong email or password."),
    "auth/wrong-password": L("Email hoặc mật khẩu không đúng.", "Wrong email or password."),
    "auth/user-not-found": L("Chưa có tài khoản với email này.", "No account uses this email."),
    "auth/missing-password": L("Bạn chưa nhập mật khẩu.", "Please enter your password."),
    "auth/too-many-requests": L("Thử sai quá nhiều lần. Đợi vài phút rồi thử lại.", "Too many attempts. Wait a few minutes and try again."),
    "auth/operation-not-allowed": L("Đăng nhập bằng email chưa được bật trong Firebase Console.", "Email sign-in isn't enabled in the Firebase console yet."),
    "auth/network-request-failed": L("Mất kết nối mạng. Kiểm tra Internet rồi thử lại.", "Network error. Check your connection and try again."),
  };
  if (String(err.code).startsWith("auth/api-key-not-valid")) {
    return L("Cấu hình Firebase chưa đúng: kiểm tra apiKey trong js/config.js.", "Firebase is misconfigured: check apiKey in js/config.js.");
  }
  return map[err.code] || err.message;
}

async function emailSignUp(name, email, password) {
  const { auth, authMod } = await initFirebase();
  pendingName = name;
  try {
    const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
    authMod.sendEmailVerification(cred.user).catch(() => {});
    toast(L("Tạo tài khoản thành công!", "Account created!"), "ok");
  } catch (err) {
    pendingName = null;
    throw err;
  }
}

async function emailSignIn(email, password) {
  const { auth, authMod } = await initFirebase();
  await authMod.signInWithEmailAndPassword(auth, email, password);
}

async function resetPassword(email) {
  const { auth, authMod } = await initFirebase();
  await authMod.sendPasswordResetEmail(auth, email);
}

function emailForm(cat) {
  let mode = "signin";
  const nameIn = el("input", { id: "auth-name", type: "text", autocomplete: "name", placeholder: L("Ví dụ: Nguyễn Văn An", "e.g. Nguyen Van An"), style: "width:100%" });
  const emailIn = el("input", { id: "auth-email", type: "email", autocomplete: "email", placeholder: "you@example.com", style: "width:100%" });
  const passIn = el("input", { id: "auth-pass", type: "password", autocomplete: "current-password", placeholder: L("Ít nhất 6 ký tự", "At least 6 characters"), style: "width:100%" });
  const nameRow = el("div", { class: "hidden" }, el("label", { class: "field-label", for: "auth-name" }, L("Họ và tên", "Full name")), nameIn);
  const error = el("div", { class: "notice notice-error tiny hidden", role: "alert" });
  const submit = el("button", { class: "btn btn-primary btn-lg btn-block", type: "submit" });
  const forgot = el("button", { class: "link-btn", type: "button" }, L("Quên mật khẩu?", "Forgot password?"));
  const tabs = el("div", { class: "auth-tabs", role: "tablist" });

  const setMode = (m) => {
    mode = m;
    [...tabs.children].forEach((t) => t.classList.toggle("on", t.dataset.mode === m));
    nameRow.classList.toggle("hidden", m !== "signup");
    forgot.classList.toggle("hidden", m !== "signin");
    passIn.autocomplete = m === "signup" ? "new-password" : "current-password";
    submit.textContent = m === "signup" ? L("Tạo tài khoản", "Create account") : L("Đăng nhập", "Sign in");
    error.classList.add("hidden");
  };
  tabs.append(
    el("button", { type: "button", dataset: { mode: "signin" }, onclick: () => setMode("signin") }, L("Đăng nhập", "Sign in")),
    el("button", { type: "button", dataset: { mode: "signup" }, onclick: () => setMode("signup") }, L("Tạo tài khoản", "Create account")));

  const showError = (msg) => { error.textContent = msg; error.classList.remove("hidden"); cat.setMood("sad", 1000); };

  forgot.onclick = async () => {
    const email = emailIn.value.trim();
    if (!email) { showError(L("Nhập email trước, rồi bấm “Quên mật khẩu?”.", "Enter your email first, then tap “Forgot password?”.")); emailIn.focus(); return; }
    try {
      await resetPassword(email);
      toast(L("Đã gửi email đặt lại mật khẩu (kiểm tra cả thư rác).", "Password reset email sent (check your spam folder too)."), "ok", 5000);
    } catch (err) { showError(authMessage(err)); }
  };

  const form = el("form", { class: "stack-sm", novalidate: "" },
    tabs, nameRow,
    el("div", {}, el("label", { class: "field-label", for: "auth-email" }, "Email"), emailIn),
    el("div", {},
      el("div", { class: "row", style: "justify-content:space-between" },
        el("label", { class: "field-label", for: "auth-pass" }, L("Mật khẩu", "Password")), forgot),
      passIn),
    error, submit);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameIn.value.trim(), email = emailIn.value.trim(), pass = passIn.value;
    if (mode === "signup" && !name) { showError(L("Hãy nhập họ tên để giáo viên nhận ra bạn.", "Enter your full name so your teacher knows who you are.")); nameIn.focus(); return; }
    submit.disabled = true;
    try {
      if (mode === "signup") await emailSignUp(name, email, pass);
      else await emailSignIn(email, pass);
    } catch (err) {
      showError(authMessage(err));
    } finally { submit.disabled = false; }
  });

  setMode("signin");
  return form;
}

async function demoSignIn(name, teacher = false) {
  const u = {
    uid: "demo-" + btoa(unescape(encodeURIComponent(name))).replace(/=/g, "").slice(0, 16),
    displayName: name, email: "", photoURL: "", demo: true, demoTeacher: teacher,
  };
  localStorage.setItem("ielts:demoUser", JSON.stringify(u));
  user = u;
  await initProgress(u);
  await afterSignIn(u);
  render();
}

/* ===================== Router ===================== */
// #home · #exams · #vocab · #deck/education · #review/due · #games/saved · #game/rain/all
// #idioms · #idioms/play/meaning · #idioms/play/missing · #puns · #puns/play
let route = location.hash.replace("#", "") || "home";
let routeData = null;

function go(r, data = null) {
  route = r;
  routeData = data;
  if (r !== "result") location.hash = r;
  else history.replaceState(null, "", "#result");
  render();
}

window.addEventListener("hashchange", () => {
  const r = location.hash.replace("#", "") || "home";
  if (r !== route) { route = r; routeData = null; render(); }
});

/* ===================== Render ===================== */
function render() {
  setExamGuard(false);
  document.body.classList.remove("hl-on", "hl-erasing");   // tắt bút highlight khi đổi trang
  window.speechSynthesis?.cancel();
  app.innerHTML = "";
  if (!user) {
    if (route.startsWith("join/")) pendingCode.set(route.split("/")[1]);   // link mời: đăng nhập xong tự vào lớp
    app.append(loginView());
    return;
  }

  const [page, a, b, c, d] = route.split("/");
  const main = el("main", { class: "main", id: "main" });
  const { sidebar, header, bottom } = chrome(page);
  app.append(el("div", { class: "shell" }, sidebar, el("div", { class: "shell-body" }, header, main), bottom));

  switch (page) {
    case "listening": main.append(renderListening(ctx)); break;
    case "reading":   main.append(renderReading(ctx)); break;
    case "writing":   main.append(renderWriting(ctx)); break;
    case "speaking":  main.append(renderSpeaking(ctx)); break;
    case "exams":     main.append(examsView()); break;
    case "bank":
      if (a === "import") main.append(renderBankImport(ctx));
      else if (b) main.append(renderBankPractice(ctx, a, b, c === "hw" ? d : null));   // #bank/<loại>/<id>/hw/<bài tập>
      else main.append(renderBank(ctx, a || "reading"));
      break;
    case "vocab":     main.append(renderVocabHub(ctx)); break;
    case "deck":      main.append(renderDeck(ctx, a)); break;
    case "review":    main.append(renderReview(ctx, a || "due")); break;
    case "games":     main.append(renderGamesHub(ctx, a || "all")); break;
    case "game":      main.append(renderGame(ctx, a, b || "all")); break;
    case "idioms":    main.append(a === "play" ? renderIdiomGame(ctx, b) : renderIdioms(ctx)); break;
    case "puns":      main.append(a === "play" ? renderPunGame(ctx) : renderPuns(ctx)); break;
    case "homework":
      main.append(
        a === "new" ? renderHomeworkForm(ctx, null)
        : a === "edit" ? renderHomeworkForm(ctx, b)
        : a === "review" ? renderHomeworkReview(ctx, b)
        : a ? renderHomeworkDetail(ctx, a)
        : renderHomework(ctx));
      break;
    case "classes":   main.append(renderClasses(ctx)); break;
    case "class":     main.append(renderClass(ctx, a, b || "work")); break;       // #class/<id> · #class/<id>/people
    case "join":      main.append(renderJoin(ctx, a || "")); break;              // #join/<MÃ> — link mời
    case "history":   main.append(renderHistory(ctx)); break;
    case "admin":
      if (isAdmin(user)) main.append(renderAdmin(ctx));
      else main.append(el("div", { class: "notice notice-error" }, L("Bạn không có quyền xem trang này.", "You don't have access to this page.")));
      break;
    case "result":
      if (routeData?.submission) main.append(renderResult(ctx, routeData.submission));
      else main.append(homeView());
      break;
    default: main.append(homeView());
  }
  window.scrollTo({ top: 0 });
}

/* ===================== Nút đổi ngôn ngữ ===================== */
function langToggle() {
  const cur = getLang();
  return el("div", { class: "lang-toggle", role: "group", "aria-label": L("Ngôn ngữ", "Language") },
    icon("globe"),
    ["en", "vi"].map((code) =>
      el("button", {
        class: code === cur ? "on" : "", "aria-pressed": String(code === cur),
        title: code === "en" ? "English" : "Tiếng Việt",
        onclick: () => setLang(code),
      }, code.toUpperCase())));
}

/* ===================== Đăng nhập ===================== */
function loginView() {
  const nameInput = el("input", {
    id: "demo-name", type: "text", placeholder: L("Ví dụ: Nguyễn Văn An", "e.g. Nguyen Van An"), style: "width:100%",
    onkeydown: (e) => { if (e.key === "Enter") submitDemo(); },
  });
  const submitDemo = () => {
    const n = nameInput.value.trim();
    if (!n) { toast(L("Nhập họ tên trước đã nhé", "Please enter your name first"), "err"); nameInput.focus(); cat.setMood("sad", 900); return; }
    demoSignIn(n, demoTeacher.checked);
  };
  const demoTeacher = el("input", { type: "checkbox", id: "demo-teacher" });

  const cat = createCat({ size: 170, mood: "idle", say: L("Meo! Mình là i-melts", "Meow! I'm i-melts") });
  nameInput.addEventListener("focus", () => cat.setMood("wow", 1200));

  const body = el("div", { class: "login-body" },
    el("h1", {}, L("Chào mừng bạn", "Welcome")),
    el("p", { class: "muted", style: "margin-bottom:22px" },
      L("Đăng nhập để làm đề thi thử, ôn từ vựng và lưu lại tiến độ của bạn.",
        "Sign in to take mock tests, practise vocabulary and keep track of your progress.")),
    classCodeField());

  if (isConfigured) {
    body.append(
      el("button", { class: "btn btn-google", onclick: signInWithGoogle }, googleIcon(), L("Tiếp tục với Google", "Continue with Google")));
    if (ALLOW_EMAIL_SIGNUP) {
      body.append(el("div", { class: "divider" }, L("hoặc dùng email", "or use email")), emailForm(cat));
    }
    body.append(el("p", { class: "tiny muted center", style: "margin:14px 0 0" },
      L("Tên và email của bạn chỉ dùng để giáo viên nhận ra bài nộp của bạn.",
        "Your name and email are only used so your teacher can see your work.")));
  } else {
    body.append(
      el("button", { class: "btn btn-google", disabled: "", title: L("Cần cấu hình Firebase", "Firebase is not set up") },
        googleIcon(), L("Đăng nhập bằng Google", "Sign in with Google")),
      el("div", {
        class: "notice notice-warn tiny", style: "margin-top:12px",
        html: L("Chưa cấu hình Firebase — mở <code>js/config.js</code> để bật đăng nhập Google.",
                "Firebase isn't set up yet — open <code>js/config.js</code> to turn on Google sign-in."),
      }),
      el("div", { class: "divider" }, L("hoặc dùng thử", "or try the demo")),
      el("label", { class: "field-label", for: "demo-name" }, L("Họ và tên", "Your name")),
      nameInput,
      el("label", { class: "check", style: "margin-top:10px" }, demoTeacher, L("Vào với vai giáo viên (chỉ ở chế độ thử)", "Enter as a teacher (demo only)")),
      el("button", { class: "btn btn-primary btn-lg btn-block", style: "margin-top:16px", onclick: submitDemo },
        L("Vào học cùng i-melts", "Start learning with i-melts"), icon("arrow")));
  }

  return el("div", { class: "login-wrap" },
    el("div", { class: "login-lang" }, langToggle()),
    el("div", { class: "login-stack" },
      el("div", { class: "login-cat" }, cat),
      el("div", { class: "login-card" },
        el("div", { class: "login-brand" },
          el("span", { class: "logo", html: catLogoSVG() }),
          el("span", {}, BRAND.name)),
        body),
      el("div", { class: "login-feats" },
        feat("exam", L("Thi thử 4 kỹ năng", "4-skill mock tests")),
        feat("cards", L("Flashcard nhắc ôn", "Spaced-repetition flashcards")),
        feat("game", L("Trò chơi từ vựng", "Vocabulary games")),
        feat("quote", L("Thành ngữ & chơi chữ", "Idioms & puns")))));
}

const feat = (ic, t) => el("span", { class: "feat" }, icon(ic), t);

/** Ô mã lớp ở trang đăng nhập: đăng nhập / tạo tài khoản xong thì tự vào lớp */
function classCodeField() {
  const inp = el("input", { id: "auth-class", type: "text", class: "mono cl-code-input", maxlength: 12, autocomplete: "off",
    value: pendingCode.get(), placeholder: "ABC234", style: "width:100%", oninput: () => pendingCode.set(inp.value) });
  return el("div", { class: "cl-login-code" },
    el("label", { class: "field-label", for: "auth-class" }, L("Mã lớp (nếu giáo viên đã gửi)", "Class code (if your teacher gave you one)")),
    inp,
    el("div", { class: "tiny muted", style: "margin-top:4px" },
      L("Có mã lớp mới thấy được Bài tập về nhà. Không có thì bỏ trống — vẫn dùng được Từ vựng, Ngân hàng đề, Idioms, Puns.",
        "You need a class code to see Homework. No code? Leave it blank — Vocabulary, the Practice bank, Idioms and Puns still work.")));
}

function googleIcon() {
  const span = el("span", { class: "i" });
  span.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6c1.9-5.6 7.2-10.3 13.6-10.3z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.15-3.2-.43-4.7H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.5z"/>
    <path fill="#FBBC05" d="M10.4 28.2a14.5 14.5 0 010-9.2l-7.8-6a24 24 0 000 21.2l7.8-6z"/>
    <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.4-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.4 0-11.7-4.7-13.6-10.3l-7.8 6C6.5 42.1 14.6 47.5 24 47.5z"/>
  </svg>`;
  return span;
}

/* ===================== Khung trang: menu bên trái · thanh trên · thanh đáy (điện thoại) ===================== */
const SECTION_OF = {
  home: "home", exams: "exams", listening: "exams", reading: "exams", writing: "exams", speaking: "exams", result: "exams",
  vocab: "vocab", deck: "vocab", review: "vocab", games: "games", game: "games",
  idioms: "idioms", puns: "puns", history: "history", admin: "admin", homework: "homework", bank: "bank",
  classes: "classes", class: "classes", join: "classes",
};

/** Các mục menu, chia nhóm. Homework chỉ hiện khi đã vào lớp (giáo viên luôn thấy) */
function navGroups() {
  const teacher = isAdmin(user);
  return [
    { items: [["home", "home", L("Trang chủ", "Home")]] },
    { title: L("Học tập", "Learn"), items: [
      ["classes", "users", L("Lớp học", "Classes")],
      teacher || hasClass() ? ["homework", "homework", L("Bài tập", "Homework")] : null] },
    { title: L("Luyện thi", "Practice"), items: [
      ["exams", "exam", L("Thi thử", "Mock tests")],
      ["bank", "file", L("Ngân hàng đề", "Practice bank")],
      ["history", "history", L("Lịch sử làm bài", "History")]] },
    { title: L("Từ vựng", "Words"), items: [
      ["vocab", "cards", L("Từ vựng", "Vocabulary")],
      ["games", "game", L("Trò chơi", "Games")],
      ["idioms", "quote", "Idioms"],
      ["puns", "laugh", "Puns"]] },
    teacher ? { title: L("Giáo viên", "Teacher"), items: [["admin", "chart", L("Quản lý", "Admin")]] } : null,
  ].filter(Boolean).map((g) => ({ ...g, items: g.items.filter(Boolean) }));
}

function chrome(page) {
  const section = SECTION_OF[page] || "home";
  const s = getStats();
  const name = user.displayName || user.email || L("Học viên", "Student");
  const avatar = () => (user.photoURL
    ? el("img", { class: "avatar", src: user.photoURL, alt: "", referrerpolicy: "no-referrer" })
    : el("div", { class: "avatar avatar-letter" }, (user.displayName || "?").slice(0, 1).toUpperCase()));
  const groups = navGroups();
  const labelOf = Object.fromEntries(groups.flatMap((g) => g.items).map(([r, , t]) => [r, t]));

  const link = (r, ic, label) => el("a", {
    class: "side-link" + (section === r ? " active" : ""), href: `#${r}`, title: label, "aria-current": section === r ? "page" : null,
    onclick: (e) => { e.preventDefault(); go(r); },
  }, el("span", { class: "side-ico" }, icon(ic)), el("span", { class: "side-label" }, label));

  const sidebar = el("aside", { class: "sidebar", "aria-label": L("Menu chính", "Main menu") },
    el("a", { class: "brand", href: "#home", onclick: (e) => { e.preventDefault(); go("home"); } },
      el("span", { class: "logo", html: catLogoSVG() }),
      el("span", { class: "brand-name" }, BRAND.name)),
    el("nav", { class: "side-nav" },
      groups.map((g) => el("div", { class: "side-group" },
        g.title ? el("div", { class: "side-title" }, g.title) : null,
        g.items.map(([r, ic, t]) => link(r, ic, t))))),
    el("div", { class: "side-foot" },
      el("div", { class: "side-level" },
        el("div", { class: "row", style: "justify-content:space-between" },
          el("span", {}, `${L("Cấp", "Level")} ${s.level}`), el("span", { class: "side-xp" }, `${s.xp} XP`)),
        el("div", { class: "side-bar" }, el("span", { style: `width:${s.pct ?? 0}%` })))));

  const themeBtn = el("button", { class: "icon-btn theme-btn", title: currentTheme() === "dark" ? L("Giao diện sáng", "Light mode") : L("Giao diện tối", "Dark mode"),
    "aria-label": L("Đổi giao diện sáng / tối", "Toggle light / dark mode"),
    onclick: () => { toggleTheme(); render(); } }, icon(currentTheme() === "dark" ? "sun" : "moon"));

  const header = el("header", { class: "topbar" },
    el("a", { class: "brand brand-mobile", href: "#home", onclick: (e) => { e.preventDefault(); go("home"); } },
      el("span", { class: "logo", html: catLogoSVG() }), el("span", { class: "brand-name" }, BRAND.name)),
    el("div", { class: "topbar-title" }, labelOf[section] || ""),
    el("div", { class: "spacer" }),
    el("span", { class: "streak-pill", title: L("Chuỗi ngày học liên tiếp", "Day streak") }, icon("flame"), s.streak),
    langToggle(),
    themeBtn,
    el("div", { class: "user-chip" },
      avatar(),
      el("div", { class: "meta" },
        el("div", { class: "name" }, name),
        el("div", { class: "role" }, isAdmin(user) ? L("Giáo viên", "Teacher") : `${L("Cấp", "Level")} ${s.level} · ${s.xp} XP`))),
    el("button", { class: "icon-btn", title: L("Đăng xuất", "Sign out"), "aria-label": L("Đăng xuất", "Sign out"), onclick: () => signOutFn?.() }, icon("logout")));

  // Điện thoại: 4 mục chính + "Thêm" mở bảng đủ các mục
  const main4 = [["home", "home", L("Trang chủ", "Home")],
    isAdmin(user) || hasClass() ? ["homework", "homework", L("Bài tập", "Homework")] : ["classes", "users", L("Lớp học", "Classes")],
    ["bank", "file", L("Luyện đề", "Practice")], ["vocab", "cards", L("Từ vựng", "Words")]];
  const moreOn = !main4.some(([r]) => r === section);
  const sheet = el("div", { class: "more-sheet hidden", role: "dialog", "aria-label": L("Tất cả mục", "All sections") });
  const closeSheet = () => sheet.classList.add("hidden");
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });
  sheet.append(el("div", { class: "more-panel" },
    el("div", { class: "more-grab" }),
    groups.map((g) => el("div", { class: "side-group" },
      g.title ? el("div", { class: "side-title" }, g.title) : null,
      el("div", { class: "more-grid" }, g.items.map(([r, ic, t]) => el("button", { class: "more-item" + (section === r ? " active" : ""),
        onclick: () => { closeSheet(); go(r); } }, el("span", { class: "side-ico" }, icon(ic)), t))))),
    el("div", { class: "row wrap", style: "gap:8px;margin-top:14px" }, langToggle(),
      el("button", { class: "btn btn-sm", onclick: () => { toggleTheme(); render(); } }, icon(currentTheme() === "dark" ? "sun" : "moon"),
        currentTheme() === "dark" ? L("Giao diện sáng", "Light mode") : L("Giao diện tối", "Dark mode")),
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-sm btn-ghost", onclick: () => signOutFn?.() }, icon("logout"), L("Đăng xuất", "Sign out")))));
  const bottom = el("nav", { class: "bottombar", "aria-label": L("Menu", "Menu") },
    main4.map(([r, ic, t]) => el("button", { class: "bb-item" + (section === r ? " active" : ""), onclick: () => go(r) }, icon(ic), el("span", {}, t))),
    el("button", { class: "bb-item" + (moreOn ? " active" : ""), onclick: () => sheet.classList.remove("hidden") }, icon("grid"), el("span", {}, L("Thêm", "More"))),
    sheet);

  return { sidebar, header, bottom };
}

/* ===================== Trang chủ ===================== */
function homeView() {
  const s = getStats();
  const hour = new Date().getHours();
  const greet = hour < 11 ? L("Chào buổi sáng", "Good morning") : hour < 18 ? L("Chào buổi chiều", "Good afternoon") : L("Chào buổi tối", "Good evening");

  const line = s.due
    ? L(`Có ${s.due} từ sắp quên, ôn ngay nhé!`, `${s.due} words are slipping away — review them now!`)
    : s.doneToday ? L("Hôm nay bạn chăm quá, i-melts thưởng một cái nháy mắt!", "You've studied today — i-melts gives you a slow blink!")
    : s.streak ? L(`Giữ chuỗi ${s.streak} ngày nào!`, `Keep your ${s.streak}-day streak going!`)
    : L("Học một chút mỗi ngày là nhớ lâu lắm đó.", "A little every day goes a long way.");
  const cat = createCat({ size: 250, mood: s.due ? "wow" : s.doneToday ? "happy" : "idle", say: line, bubbleSide: "left" });

  const wrap = el("div", { class: "stack-lg" });

  wrap.append(
    el("section", { class: "home-hero" },
      el("div", { class: "home-hero-text" },
        el("div", { class: "eyebrow" }, `${greet}, ${firstName(user.displayName)}`),
        el("h1", {}, L("Hôm nay mình luyện gì nào?", "What shall we practise today?")),
        el("p", { class: "lead" },
          L("Làm đề IELTS có bấm giờ, ôn từ bằng flashcard nhắc đúng lúc sắp quên, rồi chơi vài ván cho nhớ sâu.",
            "Take timed IELTS tests, review words with flashcards that return just before you forget, then play a few games to make them stick.")),
        el("div", { class: "row wrap", style: "gap:10px" },
          s.due
            ? el("button", { class: "btn btn-primary btn-lg", onclick: () => go("review/due") }, icon("refresh"), L(`Ôn ${s.due} từ đến hạn`, `Review ${s.due} due words`))
            : el("button", { class: "btn btn-primary btn-lg", onclick: () => go("vocab") }, icon("cards"), L("Học từ mới", "Learn new words")),
          el("button", { class: "btn btn-lg", onclick: () => go("exams") }, icon("exam"), L("Làm đề thi thử", "Take a mock test")))),
      el("div", { class: "home-hero-cat" }, el("div", { class: "cushion" }), cat)),
    statStrip(s),
    homeworkWidget(ctx));

  wrap.append(
    el("div", { class: "section-head" },
      el("h2", {}, L("Thi thử IELTS", "IELTS mock test")),
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => go("history") }, L("Lịch sử làm bài", "Test history"), icon("arrow"))),
    skillGrid());

  wrap.append(
    el("div", { class: "section-head" },
      el("h2", {}, L("Thành ngữ & chơi chữ", "Idioms & puns")),
      el("span", { class: "muted small" }, L("Học tiếng Anh tự nhiên như người bản xứ", "Sound natural, like a native speaker"))),
    el("div", { class: "wordplay-strip" },
      wordplayTile("idioms", "quote", "Idioms",
        L("30 thành ngữ hay dùng trong Speaking — đọc ví dụ, đoán nghĩa.", "30 idioms for IELTS Speaking — read the example and guess the meaning."), "#e27d6a"),
      wordplayTile("puns", "laugh", "Puns",
        L("22 câu chơi chữ: tìm từ mang hai nghĩa và hiểu vì sao buồn cười.", "22 puns: find the word with two meanings and see why it's funny."), "#5b9bd0")));

  wrap.append(
    el("div", { class: "section-head" },
      el("h2", {}, L("Chơi mà học", "Learn by playing")),
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => go("games") }, L("Tất cả trò chơi", "All games"), icon("arrow"))),
    el("div", { class: "game-strip" },
      [...GAMES.map((g) => ({ ...g, route: `game/${g.id}/all` })), ...WORDPLAY_GAMES].map((g) =>
        el("button", { class: "game-mini", style: `--game:${g.color}`, onclick: () => go(g.route) },
          el("span", { class: "game-ico" }, icon(g.icon)),
          el("span", { class: "gm-name" }, g.name)))));

  const recent = el("div", { class: "card card-flush" }, el("div", { class: "muted small pad" }, L("Đang tải…", "Loading…")));
  wrap.append(el("div", { class: "section-head" }, el("h2", {}, L("Lần nộp gần đây", "Recent submissions"))), recent);

  listMySubmissions(user.uid).then((list) => {
    recent.innerHTML = "";
    if (!list.length) {
      recent.append(el("div", { class: "muted small pad" }, L("Chưa có bài nộp nào — chọn một kỹ năng ở trên để làm bài đầu tiên.", "No submissions yet — pick a skill above to take your first test.")));
      return;
    }
    list.slice(0, 5).forEach((sub) => {
      recent.append(
        el("div", { class: "recent-row" },
          el("span", { class: `skill-tag ${sub.skill}` }, cap(sub.skill)),
          el("span", { class: "small muted" }, fmtDateTime(sub.submittedAt)),
          el("div", { class: "spacer" }),
          el("span", { class: "small strong" },
            (sub.skill === "listening" || sub.skill === "reading")
              ? `${sub.raw}/${sub.total} · Band ${Number(sub.band).toFixed(1)}`
              : (sub.teacherBand != null ? `Band ${Number(sub.teacherBand).toFixed(1)}` : L("chờ chấm", "awaiting mark"))),
          el("button", { class: "btn btn-sm", onclick: () => go("result", { submission: sub }) }, L("Xem", "View"))));
    });
  }).catch(() => {
    recent.innerHTML = "";
    recent.append(el("div", { class: "muted small pad" }, L("Chưa đọc được dữ liệu.", "Couldn't load your submissions.")));
  });

  return wrap;
}

function wordplayTile(routeName, ic, title, desc, color) {
  return el("button", { class: "wordplay-tile", style: `--game:${color}`, onclick: () => go(routeName) },
    el("span", { class: "game-ico" }, icon(ic)),
    el("span", { class: "wp-body" },
      el("span", { class: "wp-title" }, title),
      el("span", { class: "muted small" }, desc)),
    icon("arrow"));
}

function skillGrid() {
  return el("div", { class: "skill-grid" },
    SKILLS.map((k) =>
      el("button", { class: `skill-card ${k.id}`, onclick: () => go(k.id) },
        el("span", { class: "skill-ico" }, icon(k.id)),
        el("h3", {}, k.name),
        el("p", { class: "muted small" }, k.desc),
        el("span", { class: "skill-meta" }, k.meta, icon("arrow")))));
}

function examsView() {
  const cat = createCat({ size: 130, mood: "think", say: L("Chọn kỹ năng, i-melts bấm giờ cho!", "Pick a skill — i-melts will keep time!"), bubbleSide: "left" });
  return el("div", { class: "stack-lg" },
    el("section", { class: "games-hero" },
      el("div", { style: "flex:1;min-width:260px" },
        el("div", { class: "eyebrow" }, L("Đề thi thử số 01", "Mock test 01")),
        el("h1", {}, L("Thi thử IELTS Academic", "IELTS Academic mock test")),
        el("p", { class: "lead" },
          L("Mỗi kỹ năng có đồng hồ riêng và tự nộp khi hết giờ. Thời điểm nộp được ghi lại cho từng bài.",
            "Each skill has its own timer and submits automatically when time runs out. Every submission time is recorded."))),
      el("div", { class: "games-hero-cat" }, cat)),
    skillGrid(),
    el("button", { class: "card bank-promo", onclick: () => go("bank") },
      el("div", { class: "skill-ico reading" }, icon("file")),
      el("div", { style: "flex:1" },
        el("h3", { class: "mb-0" }, L("Ngân hàng đề", "Practice bank")),
        el("div", { class: "muted small" }, L("Luyện từng passage Reading và từng đề Listening, chấm điểm ngay.", "Practise single Reading passages and full Listening tests with instant marking."))),
      icon("arrow")));
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }

function firstName(full) {
  if (!full) return L("bạn", "there");
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1];
}

/* Chạy sau cùng, khi mọi biến trong module đã sẵn sàng */
mountBackground();
init();
