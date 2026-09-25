# Web thi thử IELTS — 4 kỹ năng

Trang thi thử IELTS Academic chạy hoàn toàn bằng HTML/CSS/JavaScript thuần (không cần build),
đăng nhập bằng tài khoản Google, lưu bài nộp và **thời điểm nộp bài** trên Firebase.

| Kỹ năng | Nội dung | Chấm điểm |
|---|---|---|
| 🎧 Listening | 4 section · 40 câu · 32 phút | Tự động + quy đổi band |
| 📖 Reading | 3 passage · 40 câu · 60 phút | Tự động + quy đổi band |
| ✍️ Writing | Task 1 (biểu đồ) + Task 2 · 60 phút | Giáo viên chấm |
| 🎙️ Speaking | Part 1/2/3 · 12 lượt nói, có ghi âm | Giáo viên chấm |

## Mochi & từ vựng

Linh vật **Mochi** là mèo Anh lông ngắn màu xám, vẽ bằng SVG trong [`js/cat.js`](js/cat.js). Mochi chớp mắt, vẫy
đuôi, nhìn theo con trỏ và đổi cảm xúc (`idle`, `happy`, `sad`, `think`, `sleep`, `wow`) khi học sinh trả lời.

| Phần | Nội dung |
|---|---|
| Bộ từ | 14 bộ, 210 từ có phiên âm (gồm AI & đời sống số, Khí hậu, Công việc thời nay, Đô thị, Du lịch, Sức khoẻ tinh thần, ngôn ngữ Writing Task 2, cụm từ nói Speaking), nghĩa, câu ví dụ, phát âm — [`js/data/vocab.js`](js/data/vocab.js) |
| Flashcard | Ôn ngắt quãng: Quên → hỏi lại sau 1 phút, Khó → 10 phút, Nhớ → 1 ngày, Dễ → 4 ngày, khoảng cách tăng dần. Phím tắt Space / 1–4 / P |
| Sổ từ | Lưu từ bất kỳ để ôn hoặc chơi riêng |
| Trò chơi | Ghép cặp · Mưa chữ · Đánh vần · Trắc nghiệm tốc độ · Đoán chữ — chọn chơi với tất cả từ, sổ từ, từ đang học hoặc từng bộ |
| Động lực | XP, cấp độ, chuỗi ngày học liên tiếp, kỷ lục từng trò, bảng xếp hạng |

Tiến độ từ vựng lưu trong trình duyệt; khi đã cấu hình Firebase thì đồng bộ lên Firestore (`vocab/{uid}`) và bảng
xếp hạng (`leaderboard/{uid}` — chỉ có tên, ảnh, XP, không có email).

Thêm bộ từ: mở `js/data/vocab.js`, copy một khối `{ id, title, en, icon, color, words: [...] }`. Icon dùng được:
`cap`, `leaf`, `chip`, `heart`, `briefcase`, `chart`, `star`, `paw`.

## Ngôn ngữ giao diện (EN / VI)

Mặc định giao diện là **tiếng Anh**; nút **EN / VI** trên thanh điều hướng (và góc trang đăng nhập) đổi sang tiếng Việt.
Lựa chọn được nhớ trong trình duyệt. Chuỗi giao diện viết song ngữ ngay trong code bằng `L("tiếng Việt", "English")`
([`js/i18n.js`](js/i18n.js)). Đề thi luôn bằng tiếng Anh như đề IELTS thật; từ vựng hiện định nghĩa Anh–Anh ở chế độ EN
và nghĩa tiếng Việt ở chế độ VI (bên còn lại hiện nhỏ bên cạnh).

## Idioms & Puns

| Mục | Nội dung |
|---|---|
| **Idioms** | 64 thành ngữ dùng được trong IELTS Speaking, lọc theo chủ đề, ghi rõ thân mật/trung tính. Thẻ chỉ hiện câu ví dụ — đoán trước rồi mới lật nghĩa. Trò chơi: **Idiom Guess** (đoán nghĩa từ ngữ cảnh) và **Missing Word** (điền từ còn thiếu) — [`js/data/idioms.js`](js/data/idioms.js) |
| **Puns** | 40 câu chơi chữ chia 3 loại: một từ hai nghĩa, đồng âm, ghép từ. Bấm “Get it?” để tô sáng từ khoá và xem hai nghĩa + giải thích tiếng Việt. Trò chơi: **Pun Detective** (tìm từ tạo nên câu đùa) — [`js/data/puns.js`](js/data/puns.js) |

Thêm câu chơi chữ: `key` phải xuất hiện nguyên văn trong `text`, và `decoys` là 3 từ khác cũng có trong câu.

## Homework (bài tập về nhà)

Tab **Homework** — giáo viên giao bài có hạn nộp, học sinh nộp ngay trên web.

| Loại bài | Giáo viên chuẩn bị | Học sinh làm | Chấm |
|---|---|---|---|
| **Reading / Listening** | Upload đề (PDF, ảnh, audio) hoặc dán link Drive/YouTube + nhập đáp án | Xem đề, điền phiếu trả lời | Tự động, xem được đáp án sau khi nộp. Nộp **một lần** |
| **Writing** | Dán đề bài vào ô hướng dẫn (có thể kèm ảnh biểu đồ) | Gõ bài, có đếm từ, có thể đính kèm file | Giáo viên nhập band + nhận xét |
| **Speaking** | Soạn câu hỏi theo **Part 1 / 2 / 3** (cue card, thời gian chuẩn bị, giới hạn giây mỗi câu) hoặc **một đề tự do** | Ghi âm từng câu ngay trên web, nghe lại, ghi lại | Giáo viên nghe và chọn band **4 tiêu chí** (FC, LR, GRA, P) — band tổng tự tính. AI chấm thử đang tắt (xem mục 5) |
| **Ngân hàng đề** | Chọn 1 passage Reading, 1 đề Listening hoặc 1 section Listening trong Ngân hàng đề (hoặc bấm **Giao làm bài tập** ngay trong trang bài đó) | Làm trên giao diện luyện đề (PDF + audio + đồng hồ), nộp **một lần** | Tự động theo đáp án ngân hàng đề; giáo viên xem từng câu, chỉnh điểm/nhận xét |
| **Nộp file** | Hướng dẫn + tài liệu tuỳ ý | Upload ảnh/PDF/Word/audio/video (≤ 50 MB/file) hoặc **ghi âm trực tiếp** trên web | Giáo viên nhập điểm + nhận xét |

- Đáp án nhập mỗi dòng một câu (`1. TRUE`, `2. B`, `3. hen / a hen`); nhiều đáp án đúng ngăn bằng `/`.
- Hạn nộp do giáo viên đặt; tick “Accept late work” thì học sinh vẫn nộp được sau hạn và bị đánh dấu *late*.
- Bỏ tick “Visible to students” để lưu nháp, học sinh chưa thấy.
- Writing / Speaking / nộp file được **nộp lại** trước hạn, cho tới khi giáo viên chấm.
- Speaking: tick “Show the AI feedback to students” nếu muốn học sinh xem nhận xét AI ngay sau khi nộp
  (mặc định chỉ giáo viên xem). AI lỗi thì bài vẫn được nộp, giáo viên chấm tay.
- Đáp án lưu riêng (`assignmentKeys`) — học sinh chỉ đọc được sau khi đã nộp bài của mình.
- Trang **Review** của mỗi bài: ai đã nộp / chưa nộp / nộp muộn, điểm tự động, file đính kèm, ô chấm điểm.

Cần **Firebase Storage** (gói Blaze) để upload file — xem mục 4 bên dưới.

## Ngân hàng đề (Reading passage + Listening)

Menu **Ngân hàng đề / Practice bank**: học sinh làm **từng passage Reading** (20 phút), **từng đề Listening** (40 câu, có audio)
hoặc **từng section Listening** (10 câu, 10 phút — xếp theo Section 1–4 và theo tiêu đề bài nghe),
đề PDF hiện bên trái, phiếu trả lời bên phải, chấm ngay và lưu vào Lịch sử. Listening đủ 40 câu thì quy ra band.

- Đáp án nằm trong `js/data/bank-reading.js` (273 bài) và `js/data/bank-listening.js` (39 đề, 149 section — gồm Actual Test Vol 8, 9) — sinh tự động từ thư mục tài liệu,
  bài nào đáp án có vấn đề được liệt kê trong `bank-report.md`.
- File đề/audio nằm trên Firebase Storage (`bank/…`, chỉ người đã đăng nhập mới xem được).
  Giáo viên tải lên **một lần**: Ngân hàng đề → **Tải file đề lên** → chọn thư mục `5. READING IN PASSAGES`, bấm Tải lên;
  rồi chọn thư mục `2. LISTENING`, bấm Tải lên (≈ 1 GB, nên để máy chạy tới khi xong). File đã có sẽ được bỏ qua.
- PDF hiển thị bằng PDF.js nên xem được trên cả điện thoại.

### Làm bài tương tác (giống thi trên máy)

Bài nào đã được **bóc nội dung** (có tên trong `js/data/bank-interactive.js`, nội dung ở `js/data/interactive/<id>.json`)
thì học sinh làm thẳng trên web như thi máy thật (giống British Council / IDP computer-delivered), **không cần mở PDF**.
Hiện đã chuyển **262/273 bài Reading** (Passage 1: 83/84 · Passage 2: 85/89 · Passage 3: 94/100) và 1 section Listening.
11 bài Reading còn lại vẫn làm bằng PDF vì đề gốc có lỗi không bóc an toàn được: sơ đồ chỉ là ảnh không có chữ,
số câu in trùng hoặc lệch so với đáp án, bài đọc in 2 cột.

- Reading: bài đọc cột trái (cuộn riêng, đánh dấu đoạn A, B, C…), câu hỏi cột phải.
- Listening: audio ghim trên đầu, câu hỏi chạy hết bề ngang.
- Chọn đáp án bằng nút (A/B/C, TRUE/FALSE/NOT GIVEN, i–ix, nối với đoạn A–H), điền từ gõ ngay vào chỗ trống trong câu.
- Dạng điền vào ghi chú / bảng / sơ đồ giữ nguyên bố cục gạch đầu dòng, ô nhập nằm đúng chỗ trống;
  bấm vào **số câu** in trước ô trống để đánh dấu xem lại.
- Dạng tóm tắt chọn từ khung A–K dùng hộp chọn ngay tại chỗ trống; dạng flow-chart chọn chữ cái thì chữ cái hiện vào ô trống.
- Thanh **số câu** dưới đáy: xanh = đã trả lời, gạch vàng = đang đánh dấu (nút cờ ở mỗi câu), bấm số để nhảy tới câu.
- Khi bấm Nộp bài, hộp xác nhận nêu rõ còn bao nhiêu câu trống và những câu đang đánh dấu xem lại.
- Tô màu (highlight) dùng được cả trên bài đọc lẫn phần câu hỏi.

Bài chưa bóc nội dung vẫn giữ cách cũ (PDF + phiếu trả lời), nên có thể chuyển dần từng bài.

**Bóc một bài mới:**

```bash
cd tools
python extract_interactive.py <id-bài> --save   # một bài: in JSON + dòng "kiểm tra: ĐẠT"
python batch_interactive.py reading 1 --save    # cả nhóm: reading 1|2|3, listening, section 1-4
python audit_interactive.py reading 1           # soi nội dung: câu cụt, đề bài lẫn nội dung, bài đọc thiếu…
python gen_interactive.py                       # -> js/data/interactive/*.json + danh sách id
```

Các script trên đọc văn bản đề theo thứ tự: **file gốc** trong `2. IELTS\…` nếu máy có, **không có thì lấy
`tools/txt/<id>.txt`** — bản văn bản đã xuất sẵn và commit kèm repo (454 bài, 3.9 MB). Nhờ vậy máy khác
(máy thứ hai, cloud session) vẫn bóc và sửa đề được dù không có thư mục tài liệu gốc.
Khi thêm đề mới vào ngân hàng, chạy `python dump_text.py` ở máy có tài liệu để xuất thêm văn bản
(`--force` để xuất lại hết). Bảy bài `forecast-06*`, `forecast-08-s4`, `forecast-10-s1` là PDF scan
nên không rút được chữ — những bài này luôn ở chế độ PDF.

Chỉ lưu khi dòng kiểm tra báo **ĐẠT**: đủ câu, đủ phương án, không có phương án trống, số câu khớp đáp án,
đáp án đúng nằm trong các lựa chọn hiện ra, không có câu hỏi lọt vào phần đề bài, đề không in thừa câu mà đáp án không có,
đoạn văn không nuốt mốc đoạn sau, bài đọc không in 2 cột. `batch_interactive.py --save` chỉ ghi bài đạt, **không xoá**
bài cũ đã lưu mà nay không đạt — xoá tay `tools/interactive/<id>.json` rồi chạy lại `gen_interactive.py`.
`audit_interactive.py` là cảnh báo mềm — đọc để biết bài nào nên xem lại bằng mắt.
Xem thử giao diện không cần đăng nhập: chạy một web server tĩnh ở thư mục gốc rồi mở
`tools/examtest.html?id=<id-bài>`.

### Bật CORS cho Firebase Storage (để web đọc được file PDF)

Trang làm bài đọc file PDF bằng mã lệnh (PDF.js) nên Storage phải cho phép trang web đọc. Nếu chưa bật, học sinh gặp
lỗi **“Không mở được đề — Failed to fetch”** (audio vẫn phát được, vì thẻ audio không cần CORS). Nút tải bản ghi
Speaking cũng cần CORS.

Làm một lần, trong trình duyệt, không cần cài gì:

1. Mở https://console.cloud.google.com/ → chọn project `xamenglish-d8ebd` → bấm biểu tượng **Cloud Shell** (`>_`) ở góc trên phải.
2. Dán nguyên khối lệnh sau rồi Enter:

```bash
cat > cors.json <<'EOF'
[{"origin":["https://xamenglish-d8ebd.web.app","https://xamenglish-d8ebd.firebaseapp.com"],"method":["GET","HEAD"],"responseHeader":["Content-Type","Content-Length","Content-Range","Accept-Ranges","Range","ETag"],"maxAgeSeconds":3600}]
EOF
gcloud storage buckets update gs://xamenglish-d8ebd.firebasestorage.app --cors-file=cors.json
gcloud storage buckets describe gs://xamenglish-d8ebd.firebasestorage.app --format="default(cors_config)"
```

3. Lệnh cuối in ra cấu hình vừa đặt là xong. Vào web tải lại trang (Ctrl+F5) rồi mở lại bài.

Nội dung cấu hình cũng có sẵn ở [`tools/cors.json`](tools/cors.json). Thêm tên miền riêng thì thêm vào danh sách `origin`.

## Ghi nhận thời gian nộp bài

- Thời điểm nộp lấy từ **đồng hồ máy chủ Firestore** (`serverTimestamp`), học sinh chỉnh giờ
  máy tính cũng không đổi được. Giờ trên máy học sinh vẫn được lưu riêng ở trường
  `clientSubmittedAt` để đối chiếu.
- Mỗi bài nộp còn lưu: thời điểm bắt đầu (`startedAt`), tổng thời gian làm (`durationSec`),
  và cờ `autoSubmitted` cho biết học sinh chủ động nộp hay hệ thống tự nộp khi hết giờ.
- Luật bảo mật Firestore chặn sửa/xoá bài sau khi đã nộp (chỉ giáo viên được cập nhật điểm chấm).

## Chạy thử ngay (chưa cần Firebase)

```bash
python -m http.server 8000
```

Mở http://localhost:8000 — vì chưa có cấu hình Firebase, trang sẽ bật **chế độ dùng thử**:
nhập tên là vào thi được, bài nộp lưu tạm trong `localStorage` của trình duyệt.

## Publish lên mạng (Firebase — gói Spark miễn phí)

Sau khi làm xong, học sinh vào link dạng `https://TEN-PROJECT.web.app`, tự tạo tài khoản (Google hoặc email +
mật khẩu), làm bài; giáo viên đăng nhập bằng email trong `ADMIN_EMAILS` sẽ thấy menu **Admin** với tab
**Submissions** (mọi bài nộp) và **Students** (mọi học sinh đã đăng ký, số bài, XP từ vựng).

### 1. Tạo project Firebase
1. Vào https://console.firebase.google.com → **Create a project** → đặt tên (vd. `ielts-mochi`) → có thể tắt Google Analytics.
2. **Build → Authentication → Get started → Sign-in method**, bật:
   - **Google** (chọn email hỗ trợ → Save)
   - **Email/Password** (bật dòng đầu, không cần “Email link”) → Save
3. **Build → Firestore Database → Create database** → location `asia-southeast1 (Singapore)` → **Start in production mode**.
4. **Project settings (⚙) → General → Your apps → biểu tượng Web `</>`** → đặt tên app → **Register app**
   (không cần tick Firebase Hosting ở bước này) → copy đoạn `firebaseConfig`.

### 2. Sửa 2 file cấu hình
- [`js/config.js`](js/config.js): dán đè `firebaseConfig`; thay `teacher@example.com` trong `ADMIN_EMAILS` bằng email giáo viên.
- [`firestore.rules`](firestore.rules): thay `teacher@example.com` trong hàm `isAdmin()` bằng **cùng** email đó
  (rules mới là nơi thực sự chặn quyền). Nhiều giáo viên: `['a@gmail.com', 'b@gmail.com']`.

Email giáo viên phải **đã xác minh**: tài khoản Google luôn đạt; nếu giáo viên dùng email + mật khẩu thì phải bấm link
xác minh Firebase gửi về hộp thư. Điều này chặn người lạ tự đăng ký tài khoản trùng email giáo viên.

### 3. Deploy (Windows PowerShell)

Cần Node.js (đã có sẵn trên máy). Cài công cụ Firebase:

```bash
npm install -g firebase-tools
```

Nếu PowerShell báo *running scripts is disabled*, dùng `firebase.cmd` thay cho `firebase` ở các lệnh dưới.

```bash
firebase login
```

Mở thư mục dự án rồi gắn với project vừa tạo (chọn project trong danh sách, đặt alias `default`):

```bash
firebase use --add
```

Đẩy web, luật bảo mật và index lên:

```bash
firebase deploy --only hosting,firestore
```

Xong sẽ hiện `Hosting URL: https://TEN-PROJECT.web.app` — gửi link này cho học sinh. Sửa code/đề/bộ từ xong thì chạy
lại đúng lệnh deploy trên; học sinh tải lại trang là thấy bản mới, dữ liệu cũ vẫn giữ nguyên.

Domain `TEN-PROJECT.web.app` và `TEN-PROJECT.firebaseapp.com` được Firebase tự cho phép đăng nhập. Nếu gắn tên miền
riêng, thêm nó ở **Authentication → Settings → Authorized domains**.

### 4. Bật Storage cho Homework và ghi âm Speaking (cần gói Blaze)

Từ 10/2024 Cloud Storage for Firebase yêu cầu gói **Blaze** (trả theo mức dùng; lớp nhỏ thường gần như 0đ).
1. Firebase Console → nút **Upgrade** (góc dưới trái) → chọn **Blaze** → gắn tài khoản thanh toán.
2. Đặt cảnh báo chi phí: Google Cloud Console → **Billing → Budgets & alerts → Create budget** (vd. 50.000đ/tháng).
3. **Databases & Storage → Storage → Get started** → chọn vùng `US-CENTRAL1` (có hạn mức miễn phí 5 GB)
   → **Start in production mode**.
4. Bấm đúp `deploy.cmd` (đã gồm cả `storage`), hoặc:

```bash
firebase deploy --only hosting,firestore,storage
```

`js/config.js`: `ENABLE_AUDIO_UPLOAD = true` (lưu ghi âm Speaking), `HOMEWORK_MAX_MB = 50` (khớp `storage.rules`).
Email giáo viên phải giống nhau ở **ba** nơi: `js/config.js`, `firestore.rules`, `storage.rules`.

### 5. (Tuỳ chọn, đang tắt) AI chấm Speaking (Firebase AI Logic → Gemini)

Đang tắt (`AI_SPEAKING.enabled = false`). Muốn bật: nạp tín dụng Gemini tại https://ai.studio/projects (gói Prepay, tối thiểu $5), đổi `enabled` thành `true`, deploy.

1. Firebase Console → **AI Services → AI Logic → Get started** → chọn **Gemini Developer API** → làm theo hướng dẫn
   (Firebase tự tạo API key Gemini gắn với project, không cần dán key vào code).
2. **App Check** (chặn người ngoài dùng trộm hạn mức): Security → App Check → **Apps** → web app → **reCAPTCHA Enterprise**
   → tạo site key cho domain `xamenglish-d8ebd.web.app` và `xamenglish-d8ebd.firebaseapp.com` → dán site key vào
   `APP_CHECK_SITE_KEY` trong `js/config.js` → deploy. **Chưa có site key thì đừng để API nào ở trạng thái Enforced**,
   nếu không web sẽ bị Firebase từ chối.
3. `js/config.js` → `AI_SPEAKING`: `enabled` (bật/tắt), `model` (mặc định `gemini-3.8-flash`),
   `feedbackLang` (`"vi"` giải thích tiếng Việt, `"en"` tiếng Anh).

Mỗi câu trả lời là một lần gọi Gemini (nghe audio → chép lời, lỗi, cách sửa), cộng một lần tổng hợp band 4 tiêu chí
(Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation). Band tổng làm tròn theo quy tắc
IELTS. Đây là **ước lượng** để giáo viên tham khảo — giáo viên vẫn là người chốt điểm.

### Hạn mức miễn phí (Spark)
Firestore cho 50.000 lượt đọc và 20.000 lượt ghi mỗi ngày — đủ cho vài lớp học. Hosting 10 GB lưu trữ,
360 MB băng thông/ngày.

### Lưu ý bảo mật
- Học sinh chỉ đọc được bài của chính mình, không sửa/xoá bài đã nộp, không tự điền điểm giáo viên.
- Điểm Listening/Reading và XP được tính trên trình duyệt, nên một học sinh rành kỹ thuật vẫn có thể gửi điểm giả
  qua API. Với thi thử trong lớp thường không đáng lo; nếu cần chấm chống gian lận tuyệt đối phải chuyển phần chấm
  sang Cloud Functions (gói Blaze).

## Cấu trúc thư mục

```
index.html              trang duy nhất, nạp module ES
css/styles.css          toàn bộ giao diện (light theme)
js/config.js            ⚙ CẤU HÌNH: firebaseConfig, email giáo viên, thời gian làm bài
js/firebase.js          nạp Firebase SDK từ CDN, kiểm tra quyền giáo viên
js/store.js             ghi/đọc bài nộp, upload file ghi âm
js/engine.js            dựng câu hỏi + chấm điểm + quy đổi band
js/ui.js                nút, modal, toast, đồng hồ đếm ngược, biểu đồ SVG
js/app.js               đăng nhập, điều hướng, trang chủ
js/cat.js               🐱 linh vật Mochi (SVG + hoạt ảnh)
js/vocab/progress.js    lịch ôn ngắt quãng, sổ từ, XP, chuỗi ngày
js/vocab/views.js       trang Từ vựng, chi tiết bộ từ, flashcard
js/vocab/games.js       5 trò chơi từ vựng
js/data/vocab.js        📚 BỘ TỪ VỰNG
js/data/idioms.js       💬 THÀNH NGỮ
js/data/puns.js         😹 CHƠI CHỮ
js/wordplay/*.js        trang Idioms & Puns + 3 trò chơi chữ
js/i18n.js              chuyển ngôn ngữ EN / VI
js/homework/*.js        tab Homework: giao bài, nộp bài, chấm bài
js/results.js           trang kết quả, lịch sử, bảng điều khiển giáo viên
js/skills/*.js          4 kỹ năng
js/data/test01.js       📄 NỘI DUNG ĐỀ THI
```

## Gắn file audio thật cho Listening

Mặc định phần Listening dùng giọng đọc của trình duyệt (Web Speech API) để đọc transcript —
đủ để luyện tập, nhưng không giống thi thật. Để dùng audio thật:

1. Bỏ file mp3 vào thư mục `audio/`.
2. Mở `js/data/test01.js`, điền đường dẫn vào từng section:

```js
{ id: "s1", title: "Section 1", audioUrl: "audio/test01-s1.mp3", ... }
```

Khi có `audioUrl`, nút phát sẽ dùng file đó và **chỉ cho phát một lần**.

## Thêm đề mới

Copy `js/data/test01.js` thành `test02.js`, sửa nội dung, rồi mở `js/data/current.js` và đổi
đúng **một dòng**:

```js
export { TEST, BAND_LISTENING, BAND_READING } from "./test02.js";
```

Định dạng từng loại câu hỏi được ghi chú ngay đầu file `test01.js`:

- `gap` — điền từ (dấu `____` trong `text` là vị trí ô nhập)
- `mcq` / `mcq-multi` — trắc nghiệm
- `tfng` / `ynng` — True/False/Not Given, Yes/No/Not Given
- `matching` — nối tiêu đề, nối thông tin, chọn từ khung cho sẵn

Trường `answer` là **mảng các đáp án được chấp nhận**; hệ thống bỏ qua hoa/thường, dấu câu và
mạo từ thừa ở đầu.

## Dành cho giáo viên

Đăng nhập bằng email nằm trong `ADMIN_EMAILS` sẽ thấy thêm menu **Quản lý**:

- Danh sách toàn bộ bài nộp, sắp theo thời điểm nộp mới nhất trước.
- Thống kê: tổng bài nộp, số học sinh, số bài chờ chấm, số bài bị tự động nộp.
- Nhập band + nhận xét cho Writing/Speaking (nghe được file ghi âm ngay trong trang).
- Xuất CSV để mở bằng Excel.

## Giới hạn đã biết

- Band Listening/Reading là bảng quy đổi tham khảo, không phải thang chính thức của IDP/BC.
- Writing/Speaking không chấm tự động — cần giáo viên.
- Ghi âm dùng `MediaRecorder` (Chrome, Edge, Firefox, Safari 14.1+); trên iOS Safari cũ có thể
  không ghi được, khi đó hệ thống vẫn ghi nhận thời gian nói.
- Bài chỉ có một đề (`test-01`); học sinh làm lại sẽ tạo bài nộp mới chứ không ghi đè.
