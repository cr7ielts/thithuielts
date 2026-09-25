# Reading bank — bài chưa đưa lên web

Đã đưa lên: **273** bài. Chưa đưa lên: **28** bài (cần sửa file đáp án hoặc PDF rồi chạy lại).

| Passage | Bài | Lý do |
|---|---|---|
| 1 | A Brief History of Tea | missing answers for [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] |
| 1 | Advertising Needs Attention | missing answers for [8, 9, 10, 11, 12, 13] |
| 1 | Fishbourne Roman Palace | missing answers for [7] |
| 1 | Footprints in the Mud | 6/7 gap answers not in passage (key may belong to another passage) |
| 1 | Neanderthal Technology | missing answers for [39] |
| 1 | Seaweed | missing answers for [12, 13] |
| 1 | The last man who know everything | missing answers for [12] |
| 1 | Traditional Farming in Zambia_s Luapula  Province | missing answers for [3] |
| 1 | Vulcan, the planet that wasn’t there | 3/7 gap answers not in passage (key may belong to another passage) |
| 1 | Why good ideas fail | missing answers for [12, 13] |
| 2 | Babies cry in their mother tongue | missing answers for [20, 21, 22, 23] |
| 2 | Coins – the first form of money | missing answers for [20] |
| 2 | Considerate Technology | missing answers for [25, 26] |
| 2 | Early Approaches to Organisational Design | missing answers for [14, 15] |
| 2 | How to be Happy | only 4 questions detected |
| 2 | Jellyfish – The Dominant Species | only 9 questions detected |
| 2 | New filter promises clean water for millions | missing answers for [15, 17] |
| 2 | The Tasmanian Tiger | missing answers for [18] |
| 2 | The internal body clock | only 0/4 quoted options found in PDF (key may belong to another passage) |
| 2 | Viking Ireland | answer letter outside the range given in the question (groups may be misread) |
| 3 | Ancient Rome_ archaeologists are trying to understand more about the early history of the city | no PDF |
| 3 | Humanities and the health professional | no PDF |
| 3 | Is there such a thing as too much information_ | missing answers for [40] |
| 3 | Learning to be bilingual | no question groups found in PDF |
| 3 | Life on Mars_ | missing answers for [36, 37, 38, 39, 40] |
| 3 | Mark Sumner of the University of Leeds explains the  challenges facing the fashion industry | no PDF |
| 3 | Movement Underwater | missing answers for [34] |
| 3 | The Irish Elk | missing answers for [35] |

# Listening bank

Đã đưa lên: **39 đề** đủ 40 câu — Forecast 1–19, Dự đoán 2023 đề 1–4, **Actual Test Vol 8 (8 đề) và Vol 9 (8 đề)** —
và **149 section lẻ** (156 section, gộp 7 section trùng nhau giữa các đề; web ghi "có trong N đề khác").

Chưa đưa lên:

| Bộ | Lý do |
|---|---|
| Dự đoán 2023 — đề 5–13 | File đáp án chỉ có đáp án Listening cho đề 1–4 |
| VOL HUY BÌNH — đề 1–5 | Đề và đáp án là ảnh scan, không đọc được chữ; đề 5 không có audio |
| VOL 1–7 (ORIGINAL EXAMS) | Thiếu đề hoặc đáp án ở nhiều đề (VOL 7 chỉ có audio + transcript) |
| Cambridge IELTS 17–21 | Sách chính thức (không phải actual test); đáp án nằm trong PDF cả cuốn, audio Cambridge 18–20 không có |
| Đề thi thật gần đây | Đây là đề Reading 3 passage, phần lớn không kèm đáp án |

Cắt audio thành từng section:
- Forecast 14, 15 và toàn bộ VOL 8, VOL 9 chỉ có 1 file audio cả đề → máy tự cắt thành 4 section,
  dựa vào khoảng lặng "30 giây kiểm tra đáp án" cuối mỗi section. VOL 9 có mốc giờ trong transcript nên
  được đối chiếu thêm; VOL 8, Forecast 14, 15 chỉ dựa vào khoảng lặng — nên nghe thử đầu mỗi section một lần.
- Mốc cắt lưu ở `tools/ls/sections.json`, file đã cắt ở `2. LISTENING\_web\<đề>-p1…p4.m4a`.

Tiêu đề section: lấy từ tên file audio (Forecast 1–10) hoặc dòng tiêu đề trong đề; 43 section được đặt tay
trong `tools/section_titles.json` (sửa file này rồi chạy lại `gen_listening.py` để đổi tiêu đề).

Ghi chú:
- Thư mục `2. LISTENING\_web` do máy tạo: đề Word chuyển sang PDF (Forecast 2, 4, 11, 12, 16, 19, VOL 8, VOL 9),
  audio WMA/WAV chuyển sang M4A, và audio section đã cắt. Khi tải file lên, chọn cả thư mục "2. LISTENING" là đủ.
- Forecast 8 và 10: file đề có trang đáp án ở cuối → web chỉ hiện các trang đề.
- Đáp án Forecast 9 câu 38 ghi "lonley" → web chấp nhận cả "lonely".
