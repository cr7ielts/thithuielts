# tools — sinh ngân hàng đề (chạy trên máy giáo viên, không đưa lên web)

Cần: Python 3, `pdftotext` (có sẵn trong Git for Windows), Word (chỉ để chuyển đề .docx sang PDF).

Reading (thư mục `2. IELTS\5. READING IN PASSAGES`, mỗi bài một thư mục gồm PDF đề + key.docx):

    python extract.py          # đọc PDF + key.docx -> rd/all.json
    python parse_reading.py    # đọc đáp án, kiểm tra -> rd/parsed.json
    python gen_reading.py      # -> ../js/data/bank-reading.js + ../bank-report.md

Listening (thư mục `2. IELTS\2. LISTENING`):

    python dump_listening.py                    # trích chữ các PDF/DOCX -> ls/
    powershell -File convert_listening.ps1      # Word -> PDF, WMA/WAV -> M4A vào "2. LISTENING\_web"
    python dump_vol.py                          # đáp án + đề VOL 8, VOL 9 -> ls/vol.json
    powershell -File convert_vol.ps1            # đề VOL (Word) -> PDF vào "_web"
    python find_sections.py                     # dò mốc Section 2/3/4 trong audio cả đề -> ls/sections.json
    python split_audio.py                       # cắt audio cả đề thành 4 section vào "_web"
    python gen_listening.py [--titles]          # -> ../js/data/bank-listening.js (đề + section)

Tiêu đề section đặt tay: `section_titles.json`.

Đáp án Listening được chép tay trong `listening_keys.py` (nhiều file đáp án là ảnh).
Thêm đề mới: thêm đáp án vào `listening_keys.py` và một dòng trong danh sách TESTS của `gen_listening.py`.
Sau khi sinh lại: deploy, rồi vào Ngân hàng đề → Tải file đề lên để tải file mới.

## Bóc đề sang dạng làm bài tương tác

| Script | Việc |
|---|---|
| `extract_interactive.py <id> [--save]` | bóc một bài, in JSON và dòng "kiểm tra: ĐẠT/không đạt" |
| `batch_interactive.py <reading\|listening\|section> [part] [--save]` | bóc cả nhóm, liệt kê bài không đạt |
| `audit_interactive.py <kind> [part]` | cảnh báo mềm về chất lượng nội dung đã bóc |
| `gen_interactive.py` | `interactive/*.json` -> `js/data/interactive/*.json` + danh sách id |
| `dump_text.py [--force]` | xuất văn bản mọi đề ra `txt/<id>.txt` để máy không có tài liệu gốc vẫn bóc được |
| `examtest.html?id=<id>` | xem thử giao diện làm bài, không cần đăng nhập |

Thứ tự lấy văn bản đề: file gốc trong `2. IELTS\…` → nếu máy không có thì `txt/<id>.txt`.
