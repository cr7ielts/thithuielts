# Tự động cập nhật đề mỗi quý

Sau khi cài xong 3 bước dưới, mỗi quý bạn chỉ cần **bỏ file vào thư mục `DE MOI`**:

```
C:\Users\Admin\OneDrive\2. IELTS\DE MOI\
  READING\Vol 10 Test 1\      đề (.docx/.pdf) + đáp án (tên có chữ key / dap an / answer)
  LISTENING\Vol 10 Test 1\    đề + đáp án + 4 file audio (Part 1.mp3 … Part 4.mp3)
  FORECAST\2027-Q1\           ảnh / file bảng dự đoán Speaking, Writing, Reading của quý
```

Phần còn lại tự chạy:

| Ai | Khi nào | Làm gì |
|---|---|---|
| Máy bạn (`cap-nhat-de.cmd`) | mỗi tối 21:07 | nhập đề mới, chép bảng dự đoán vào `inbox/`, đẩy lên GitHub |
| Claude (Routine) | 8:52 ngày 1, 8, 15 của tháng 1, 4, 7, 10 | đọc `inbox/`: cập nhật Gói đề quý, viết giải thích đề mới, sửa bài nhập lỗi, đẩy lên GitHub |
| GitHub Actions | mỗi lần có thay đổi | đưa web lên Firebase |

## Bước 1 — Cho máy tự nhập đề mỗi tối
Pull bằng GitHub Desktop, rồi bấm đúp **`cai-tu-dong.cmd`** trong thư mục web. Xong.
Máy cần bật lúc 21:07 (tắt thì Windows chạy bù khi mở lại). Kết quả ghi ở `cap-nhat-de.log`.

## Bước 2 — Cho GitHub tự deploy (làm một lần, ~5 phút)
1. Mở https://console.cloud.google.com/iam-admin/serviceaccounts?project=xamenglish-d8ebd (đăng nhập tài khoản sở hữu Firebase).
2. **Create service account** → tên `github-deploy` → Create and continue.
3. Thêm 2 vai trò: **Firebase Admin** và **Service Account User** → Done.
4. Bấm vào `github-deploy` → tab **Keys** → Add key → Create new key → **JSON** → tải file về.
5. Mở https://github.com/cr7ielts/thithuielts/settings/secrets/actions → **New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: mở file JSON vừa tải bằng Notepad, chép **toàn bộ** nội dung dán vào → Add secret.
6. Xoá file JSON trên máy (đã lưu trên GitHub, không cần giữ). **Không gửi file này cho ai, kể cả Claude.**
7. Kiểm tra: https://github.com/cr7ielts/thithuielts/actions → "Deploy Firebase" → Run workflow. Dấu tích xanh là xong.

Từ đó không cần chạy `deploy.cmd` nữa (vẫn chạy được nếu muốn).

## Bước 3 — Claude đầu quý
Đã cài sẵn Routine trên tài khoản Claude của bạn. Xem / sửa giờ / tắt: claude.ai → Code → Routines.
Mỗi lần chạy trừ vào hạn mức gói Claude.
