// Khởi tạo Firebase (SDK modular, nạp thẳng từ CDN — không cần build tool)
import { firebaseConfig, ADMIN_EMAILS, APP_CHECK_SITE_KEY, APP_CHECK_PROVIDER } from "./config.js";

const CDN = "https://www.gstatic.com/firebasejs/12.19.0";

export const isConfigured = !String(firebaseConfig.apiKey).startsWith("PASTE_");

let _app = null, _auth = null, _db = null, _storage = null, _mods = null;
let _ai = null;

let _initPromise = null;

export function initFirebase() {
  if (!isConfigured) return Promise.resolve(null);
  // Chỉ khởi tạo một lần, kể cả khi nhiều nơi gọi cùng lúc
  if (!_initPromise) _initPromise = doInit().catch((err) => { _initPromise = null; throw err; });
  return _initPromise;
}

async function doInit() {

  const [appMod, authMod, dbMod, stMod] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
    import(`${CDN}/firebase-storage.js`),
  ]);

  _app = appMod.initializeApp(firebaseConfig);
  // App Check phải khởi tạo ngay sau app, trước khi dùng Storage / AI Logic
  if (APP_CHECK_SITE_KEY) {
    try {
      const acMod = await import(`${CDN}/firebase-app-check.js`);
      acMod.initializeAppCheck(_app, {
        provider: APP_CHECK_PROVIDER === "v3"
          ? new acMod.ReCaptchaV3Provider(APP_CHECK_SITE_KEY)
          : new acMod.ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn("App Check không khởi tạo được:", err);
    }
  }
  _auth = authMod.getAuth(_app);
  _db = dbMod.getFirestore(_app);
  _storage = stMod.getStorage(_app);
  _mods = { authMod, dbMod, stMod };

  return { app: _app, auth: _auth, db: _db, storage: _storage, ..._mods };
}

/** Firebase AI Logic (Gemini Developer API) — chỉ nạp khi cần chấm Speaking bằng AI */
export async function initAI() {
  if (!isConfigured) return null;
  if (_ai) return _ai;
  const { app } = await initFirebase();
  const aiMod = await import(`${CDN}/firebase-ai.js`);
  _ai = { aiMod, ai: aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() }) };
  return _ai;
}

export function isAdmin(user) {
  // Chế độ thử (chưa cấu hình Firebase): chọn vai giáo viên ở trang đăng nhập
  if (user?.demo) return !!user.demoTeacher;
  // Bắt buộc email đã xác minh — tránh việc ai đó tự đăng ký tài khoản email trùng email giáo viên
  if (!user?.email || !user.emailVerified) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(user.email.toLowerCase());
}
