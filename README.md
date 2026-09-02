# 🌏 IELTS Mock Test — Web thi thử IELTS 4 kỹ năng

Web thi thử IELTS đầy đủ Listening / Reading / Writing / Speaking, học sinh đăng nhập
bằng tài khoản riêng, hệ thống ghi lại toàn bộ lịch sử thi và giám sát việc rời khỏi
màn hình trong lúc làm bài.

---

## Tính năng chính

| Nhóm | Chi tiết |
|---|---|
| **Tài khoản** | Học sinh tự đăng ký bằng email, xác nhận qua email. Ba vai trò: `student` / `teacher` / `admin`. |
| **Đề thi** | Thi trọn bộ 4 kỹ năng hoặc luyện riêng từng kỹ năng. **Mỗi kỹ năng có đồng hồ riêng** (L 40′ · R 60′ · W 60′ · S 15′), học sinh được nghỉ giữa các kỹ năng — đồng hồ chỉ chạy khi bấm bắt đầu. |
| **Listening** | Trình phát audio gắn với từng section, upload file mp3 từ trang quản trị. |
| **Reading** | Bài đọc và câu hỏi hiển thị hai cột, cuộn độc lập. |
| **Writing** | Ô soạn bài kèm đếm từ và cảnh báo thiếu số từ. |
| **Speaking** | Thu âm ngay trên trình duyệt, tự chạy Part 1 → 2 → 3, Part 2 có 1 phút chuẩn bị. |
| **Chấm điểm** | Listening & Reading tự động quy đổi band theo bảng Cambridge. Writing được AI chấm nháp theo 4 band descriptor, giáo viên duyệt lại điểm cuối. Speaking do giáo viên nghe và chấm. |
| **Lịch sử thi** | Lưu giờ bắt đầu, giờ nộp bài, tổng thời gian làm, **giờ vào/ra và thời gian dùng của từng kỹ năng**, số lần rời màn hình, band từng kỹ năng. |
| **Chống gian lận** | Bắt buộc toàn màn hình; ghi log khi chuyển tab / mất focus / thoát fullscreen / copy / paste / chuột phải / phím tắt devtools. Cảnh báo đỏ mỗi lần vi phạm, **quá 3 lần bài tự động nộp**. |
| **Quản trị** | Tạo đề, nhập đề tự động từ Word/PDF, upload audio, sửa từng câu hỏi, duyệt điểm Writing & Speaking. |

---

## Cài đặt

### 1. Tạo project Supabase

1. Vào <https://supabase.com> → **New project** (chọn region Singapore cho nhanh).
2. Mở **SQL Editor → New query**, dán toàn bộ nội dung file [`supabase/schema.sql`](supabase/schema.sql) rồi bấm **Run**.
   Lệnh này tạo bảng, chính sách bảo mật (RLS) và hai bucket lưu file.
   > Nếu bạn **đã chạy `schema.sql` từ trước**, chạy thêm
   > [`supabase/migration-02-dong-ho-tung-ky-nang.sql`](supabase/migration-02-dong-ho-tung-ky-nang.sql)
   > để bổ sung bảng đồng hồ riêng cho từng kỹ năng.
3. Vào **Project Settings → API**, copy 3 giá trị:
   - `Project URL`
   - `anon public` key
   - `service_role` key (⚠️ bí mật, chỉ để trên server)

### 2. Cấu hình biến môi trường

```bash
cp .env.local.example .env.local
```

Điền vào `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...      # lấy ở https://console.anthropic.com
ANTHROPIC_MODEL=claude-opus-5
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Không có `ANTHROPIC_API_KEY` web vẫn chạy bình thường — chỉ mất hai tính năng
> *AI chấm nháp Writing* và *nhập đề tự động từ Word/PDF*.

### 3. Chạy web

```bash
npm install
npm run dev
```

Mở <http://localhost:3000>.

### 4. Tự cấp quyền quản trị cho mình

Đăng ký một tài khoản trên web trước, sau đó chạy trong **SQL Editor** của Supabase:

```sql
update public.profiles set role = 'admin' where email = 'email-cua-ban@gmail.com';
```

Đăng nhập lại, menu **🛠️ Quản trị** sẽ hiện ra.

---

## Nhập ngân hàng đề có sẵn

Vào **Quản trị → Tạo đề mới**, thêm phần cho từng kỹ năng, rồi ở mỗi phần bấm
**📥 Nhập từ Word/PDF**:

- **Cách 1** — mở file Word/PDF, bôi đen phần đề (kèm answer key nếu có), copy rồi dán vào ô.
- **Cách 2** — tải thẳng file `.docx` lên.

Claude sẽ tách thành danh sách câu hỏi + đáp án để bạn soát lại trước khi lưu.
Nên nhập **từng phần một** (một passage / một section) để kết quả chính xác nhất.

File nghe Listening upload trực tiếp ở mục **File nghe (mp3 / m4a)** trong từng section.

Đề mới tạo mặc định là **bản nháp**. Bấm nút *“🔒 Bản nháp — bấm để mở”* để học sinh nhìn thấy.

---

## Quy tắc chấm điểm

- **Listening / Reading**: đếm số câu đúng → chuẩn hoá về thang 40 câu → tra bảng quy đổi band
  của Cambridge (`src/lib/ielts.ts`). So khớp đáp án không phân biệt hoa thường và bỏ qua dấu câu;
  nhiều cách viết đúng thì ngăn cách bằng dấu `|` khi nhập đáp án.
- **Writing**: AI chấm theo 4 tiêu chí và đưa nhận xét song ngữ. Các task tính **trọng số bằng nhau**
  (Task 1 và Task 2 trung bình đều). Muốn quay lại cách tính chuẩn IELTS (Task 2 gấp đôi),
  sửa công thức `writingBand` trong `src/app/api/ai-grade/route.ts` và `src/app/api/admin/grade/route.ts`.
- **Speaking**: giáo viên nghe bản ghi âm và chấm trực tiếp trong trang duyệt điểm.
- **Band tổng** chỉ được chốt khi **tất cả** kỹ năng của đề đã có điểm, làm tròn theo quy tắc IELTS
  (`.25 → .5`, `.75 → +1`).

---

## Chống gian lận hoạt động thế nào

Khi học sinh bấm *“Vào phòng thi”*, trình duyệt chuyển sang toàn màn hình và bắt đầu tính giờ.
Các hành vi sau được ghi vào bảng `violations` kèm mốc thời gian:

| Hành vi | Kiểu ghi nhận |
|---|---|
| Chuyển tab / thu nhỏ cửa sổ | `tab_hidden` |
| Cửa sổ mất tiêu điểm | `window_blur` |
| Thoát toàn màn hình | `fullscreen_exit` |
| Sao chép / dán | `copy` / `paste` |
| Chuột phải | `contextmenu` |
| F12, Ctrl+Shift+I, Ctrl+U… | `devtools_key` |

Mỗi lần vi phạm hiện một cảnh báo đỏ giữa màn hình. **Đến lần thứ 3, bài được nộp tự động**
và đánh dấu `auto_submitted = true`. Muốn đổi ngưỡng, sửa `MAX_VIOLATIONS` trong `src/lib/ielts.ts`.

Bài làm được **tự lưu 8 giây một lần**, nên mất mạng hay đóng nhầm tab vẫn không mất bài —
học sinh vào lại sẽ thấy nút *“Tiếp tục bài đang làm”*.

Trong lúc **nghỉ giữa hai kỹ năng**, hệ thống không đếm vi phạm (học sinh chưa nhìn thấy đề của
phần sau). Đồng hồ của kỹ năng tiếp theo chỉ chạy khi học sinh bấm *“Bắt đầu”*, và đã bấm rồi
thì không dừng lại được — vào lại giữa chừng vẫn giữ nguyên mốc hết giờ cũ, không được gia hạn.

---

## Triển khai lên mạng

```bash
npm i -g vercel
vercel
```

Trên Vercel, thêm đủ 5 biến môi trường ở **Settings → Environment Variables**,
đổi `NEXT_PUBLIC_SITE_URL` thành tên miền thật.

Trong Supabase → **Authentication → URL Configuration**, thêm tên miền đó vào
**Site URL** và **Redirect URLs** (`https://ten-mien/auth/callback`) để link xác nhận email chạy đúng.

---

## Cấu trúc mã nguồn

```
src/
├── app/
│   ├── page.tsx                      Trang giới thiệu
│   ├── login/ register/              Đăng nhập, đăng ký
│   ├── dashboard/                    Trang chính của học sinh
│   ├── exams/                        Danh sách & chi tiết đề
│   ├── test/[attemptId]/             Phòng thi
│   ├── history/                      Lịch sử thi và bảng điểm chi tiết
│   ├── admin/                        Quản trị đề + duyệt điểm
│   └── api/
│       ├── attempts/                 Tạo bài thi, lưu tạm, ghi vi phạm, nộp bài
│       ├── ai-grade/                 AI chấm nháp Writing
│       └── admin/                    CRUD đề, nhập đề từ Word/PDF, chốt điểm
├── components/
│   ├── test/                         TestRunner, chống gian lận, thu âm Speaking
│   └── admin/                        Trình soạn đề, nhập đề, chấm bài
└── lib/
    ├── ielts.ts                      Bảng quy đổi band, thời gian, so khớp đáp án
    ├── ai-grader.ts                  Prompt chấm Writing
    ├── exam-parser.ts                Prompt tách đề từ Word/PDF
    └── supabase/                     Client trình duyệt / server / service-role
```

---

## Hệ thống thiết kế

Thư mục `design-system/ielts-mock-test/MASTER.md` là nguồn chân lý về màu, font,
khoảng cách và chuyển động, sinh ra từ skill `ui-ux-pro-max`. Phần **“Ghi đè có chủ đích”**
ở cuối file ghi rõ ba chỗ đã cố ý làm khác khuyến nghị và lý do — đọc trước khi đổi màu hoặc font.

Quy ước đang áp dụng:

- **Không dùng emoji làm icon.** Toàn bộ icon là SVG nội tuyến trong `src/components/Icon.tsx`,
  ăn theo `currentColor` và mặc định `aria-hidden`. Emoji hiển thị khác nhau giữa các hệ điều hành
  và bị trình đọc màn hình đọc thành tên ký tự.
- **Nền đặc có chữ trắng phải từ `brand-700` / `mint-600` trở lên** để đạt tương phản 4.5:1.
- Mọi phần tử tương tác có vòng focus (`:focus-visible`) và `cursor: pointer`.
- Toàn bộ hiệu ứng tự tắt khi hệ điều hành bật “giảm chuyển động”.

---

## Ghi chú bảo mật

- Bảng `questions` chứa cột `correct_answers` nên **bị khoá hoàn toàn với học sinh** ở tầng RLS.
  Trang làm bài đọc câu hỏi ở tầng server bằng service-role và chỉ gửi về trình duyệt
  những cột không phải đáp án.
- Bản ghi âm Speaking nằm trong bucket riêng tư; giáo viên nghe qua signed URL có hạn 6 giờ.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng trong route handler trên server, không bao giờ
  lộ ra trình duyệt.
