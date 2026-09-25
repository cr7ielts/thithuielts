// =====================================================================
//  CẤU HÌNH — sửa file này trước khi dùng thật
// =====================================================================
// 1. Vào https://console.firebase.google.com → tạo project
// 2. Project settings → Your apps → Web app → copy đoạn firebaseConfig
// 3. Dán đè vào object bên dưới
// Nếu chưa cấu hình, web vẫn chạy ở CHẾ ĐỘ THỬ (demo): đăng nhập giả lập,
// bài làm lưu tạm trong trình duyệt.

export const firebaseConfig = {
  apiKey: "AIzaSyAOZdnWBNIX0WAFN1yQWhvRsj0c54V7E4w",
  authDomain: "xamenglish-d8ebd.firebaseapp.com",
  projectId: "xamenglish-d8ebd",
  storageBucket: "xamenglish-d8ebd.firebasestorage.app",
  messagingSenderId: "422070502829",
  appId: "1:422070502829:web:1f32997d1718a98c8c0d24",
  measurementId: "G-BDQLB9S6WS",
};

// Email của giáo viên / quản trị — những tài khoản này xem được bài nộp và danh sách
// TẤT CẢ học sinh. Nhớ khai báo trùng trong firestore.rules.
// Chỉ có hiệu lực khi email đã được xác minh (tài khoản Google luôn đã xác minh).
export const ADMIN_EMAILS = [
  "nguyennhatkha812@gmail.com",
];

// Cho phép học sinh tự tạo tài khoản bằng email + mật khẩu (ngoài đăng nhập Google).
// Cần bật "Email/Password" trong Firebase Console → Authentication → Sign-in method.
export const ALLOW_EMAIL_SIGNUP = true;

// Tải file ghi âm Speaking lên Firebase Storage để giáo viên nghe lại.
// Cloud Storage cần gói Blaze (trả theo mức dùng, vẫn có hạn mức miễn phí).
// Đang ở gói Spark miễn phí thì để false: hệ thống vẫn ghi nhận thời lượng nói.
export const ENABLE_AUDIO_UPLOAD = true;

// Dung lượng tối đa mỗi file nộp bài tập (MB) — phải khớp với storage.rules
export const HOMEWORK_MAX_MB = 50;

// AI chấm Speaking homework (Firebase AI Logic → Gemini Developer API).
// Đang TẮT: học sinh ghi âm, giáo viên nghe và chấm 4 tiêu chí ở trang Review.
// Muốn bật: nạp tín dụng Gemini ở https://ai.studio/projects (gói Prepay) rồi đổi thành true và deploy.
export const AI_SPEAKING = {
  enabled: false,
  model: "gemini-3.8-flash",
  feedbackLang: "vi",   // "vi": giải thích bằng tiếng Việt · "en": tiếng Anh
};

// App Check (reCAPTCHA Enterprise) — chặn người ngoài dùng trộm Storage / Gemini của project.
// Firebase Console → Security → App Check → Apps → web app → reCAPTCHA Enterprise → dán "site key" vào đây.
// Để trống "" thì web không gửi mã App Check (khi đó đừng bật Enforce cho API nào).
export const APP_CHECK_SITE_KEY = "6Lfyp8ItAAAAAPQd_cIgTFCZOJH_7CnYHSm2vWAf";
export const APP_CHECK_PROVIDER = "enterprise"; // "enterprise" = reCAPTCHA Enterprise · "v3" = reCAPTCHA v3

// Thời gian làm bài (phút) — theo chuẩn IELTS
export const DURATION = {
  listening: 32,   // 30 phút nghe + 2 phút chuyển đáp án
  reading: 60,
  writing: 60,
  speaking: 14,
};

// Tên hiển thị trên logo, thanh trên cùng và trang đăng nhập
export const BRAND = {
  name: "IELTS Mock",   // tên đầy đủ — chữ sau dấu cách cuối được tô màu olive
  short: "IM",          // 2 chữ trong ô logo
  tagline: "Thi thử IELTS 4 kỹ năng",
};
