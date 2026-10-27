# IELTS practice web (thithuielts)

Vanilla JS (ES modules, không build) + Firebase (Auth, Firestore, Storage, Hosting). Giao diện song ngữ Việt/Anh qua `L(vi, en)` trong `js/i18n.js`.

## Quy trình làm việc
- Chỉ làm trên nhánh **`firebase-app`**. Không push / force-push `main`.
- Không deploy từ cloud. Commit + push lên `firebase-app`; giáo viên tự Fetch → Pull bằng GitHub Desktop rồi chạy `deploy.cmd` (deploy hosting, firestore rules, storage).
- Trả lời người dùng bằng tiếng Việt, ngắn gọn, không vòng vo.
- Thử nhanh không cần Firebase: đổi `apiKey` trong `js/config.js` thành `"PASTE_DEMO"` (bản sao ở thư mục tạm, không commit) → chế độ demo lưu localStorage. Playwright + Chromium có sẵn ở `/opt/pw-browsers`.
- Kiểm tra cú pháp: `node --check <file>`.

## Cấu trúc chính
- `js/app.js`: router (hash), trang chủ, Thi thử (`exams`).
- `js/bank/`: Ngân hàng đề. `bank.js` (danh sách, làm bài, thi thử ghép đề `mockr`/`mockl`), `exam.js` (giao diện làm trên máy, chia theo Part), `review.js` + `listen-review.js` (xem lại, giải thích).
- `js/homework/`: bài tập về nhà theo lớp. `memes.js` = meme nhận xét (40 meme mèo i-melts theo 10 sắc thái + ảnh giáo viên tải lên ở `memes`/Storage `memes/`, gợi ý theo điểm; lưu `teacherMeme` trong bài nộp). `quizdoc.js`/`quizview.js` = bài kiểm tra dựng từ file Word.
- `js/sets/`: Học phần kiểu Quizlet. `store.js` (học phần Firestore `studySets` + `liveDb` realtime, chế độ thử dùng localStorage/BroadcastChannel), `cards.js` (ref `my:<id>`/`deck:<id>`/`saved`, dựng câu hỏi), `modes.js` (Thẻ ghi nhớ, Learn, Write, Spell, Test, Match), `views.js` (thư viện, chi tiết, soạn), `live*.js` (live game: giáo viên host `liveGames/<pin>` + `liveKeys/<pin>` chứa đáp án, học sinh vào bằng mã 6 số / QR; 3 chế độ solo, teamscore, race), `qgen.js` (sinh câu hỏi nhiều mức: nghĩa, điền câu, chính tả, gõ; đáp án bẫy), `mastery.js` (mức thành thạo từng từ của học sinh, localStorage + SRS), `ai-qgen.js` (Gemini soạn câu hỏi riêng; học phần lưu trường `ai`, bộ có sẵn lưu `aiPacks/deck_<id>`; bật/tắt `AI_QUIZ` trong config), `qview.js` (giao diện 1 câu), `qr.js` (tạo QR + quét camera; thư viện ở `js/vendor/qrcode.js`, `jsqr.js`). Giáo viên phải mở tab host suốt trận (trình duyệt giáo viên chấm điểm). Sửa rules phải `deploy.cmd`.
- `js/vocab/`, `js/wordplay/`: Từ vựng (SRS, game), Idioms, Puns.
- `js/news/views.js`: Đọc báo khoa học (`#news`, `#news/<id>`, `#news/words`). Bài soạn sẵn ở `js/data/news.js`; giáo viên dán bài thật vào Firestore `newsArticles`. Bấm từ → tra (bộ từ vựng có sẵn → cache máy → Gemini qua `AI_QUIZ`); highlight, từ đã lưu, ghi chú lưu localStorage theo uid; xuất từ đã lưu thành học phần.
- `firestore.rules`: đáp án (`assignmentKeys`) chỉ đọc được khi đã nộp và (qua hạn hoặc `keyAfterSubmit`; nếu bật `secondAttempt` thì phải nộp xong lần 2).
- Homework "Cho làm lần 2" (`secondAttempt`, bài Reading/Listening/quiz/bank/Speaking): bài nộp có `attempt` 1|2, lần 1 giữ trong `firstAttempt`.

## Dữ liệu
- Reading: `js/data/bank-reading.js`, `bank-vol8.js`, `bank-vol9.js`, `bank-extra.js` (đề sưu tầm).
- Listening: `js/data/bank-listening.js` (`LISTENING_BANK` cả đề, `LISTENING_SECTIONS` từng section).
- Nội dung làm trên máy: `tools/interactive/<id>.json` → `python tools/gen_interactive.py` → `js/data/interactive/` + `bank-interactive.js`. **Sửa ở `tools/interactive`**, sửa thẳng `js/data/interactive` sẽ bị ghi đè.
- Giải thích Reading: `tools/explain/<id>.json` → `python tools/gen_explain.py` (dẫn chứng phải có nguyên văn trong bài).
- Giải thích Listening: transcript `tools/transcripts/` + `tools/explain_listening/` → `gen_explain_listening.py`.
- Từ vựng: `js/data/vocab.js` (bộ IELTS, series `ielts`), `vocab-evu.js` (English Vocabulary in Use, `evu`), `vocab-ows.js` (Oxford Word Skills, `ows`). Mỗi từ `[word, ipa, pos, vi, def, example]`; `def` rỗng thì web dùng nghĩa Việt. Phiên âm 2 bộ sách sinh tự động từ từ điển CMU.
- Dự đoán Reading kỳ hiện tại: `js/data/reading-forecast.js`.

## Việc còn dở
- 10 đề Listening chưa có bản làm trên máy: forecast-06, 08, 10, 13, 16, 17, 18, 19, dudoan-02, vol8-02.
- Transcript forecast-15 section 2–4 rỗng (cần `transcribe.cmd --force forecast-15`).
- 5 bài Reading dự đoán chưa có: The Dunedin study, Dark Chocolate's Health-giving Benefits, IQ Scores, Lawrence Johnston and Hidcote Garden, Neanderthal Technology.
- Phiên âm cặp từ "a / b" trong `vocab-evu.js`/`vocab-ows.js` chỉ có của từ đầu.
- Xem lại đề thi thử Listening ghép (`mockl`) chưa có lời thoại / nghe lại.
