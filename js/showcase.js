// KHỐI "VẤN ĐỀ → CÁCH XỬ LÝ" ở trang đăng nhập: ba vấn đề thường gặp khi tự luyện IELTS, mỗi vấn đề đặt cạnh
//  ảnh chụp màn hình thật của web. Ảnh ở img/showcase/ (chụp từ bản chạy thử bằng Playwright, 1030px, JPEG);
//  giao diện đổi nhiều thì chụp lại cho khớp.
import { el, icon } from "./ui.js";
import { L } from "./i18n.js";

const ROWS = [
  {
    img: "img/showcase/exam.jpg",
    alt: L("Màn hình làm bài Reading trên web: bài đọc bên trái, câu hỏi bên phải, nút Chưa chắc, thanh tiến độ", "Reading test screen: passage on the left, questions on the right, Unsure buttons and a progress bar"),
    problem: L("Quen làm đề giấy, vào phòng thi máy thì lúng túng: không biết quản lý giờ, quên câu bỏ trống.",
      "Used to paper tests, then lost on the computer-delivered exam: no sense of time, blank answers forgotten."),
    fix: L("Làm bài y như thi trên máy: bài đọc một bên, câu hỏi một bên, đồng hồ đếm ngược. Câu nào chưa chắc thì bấm đánh dấu, mở Danh sách câu hỏi để xem câu nào còn trống. Bỏ qua câu hay nộp bài khi còn câu trống, web đều hỏi lại.",
      "Practise exactly like the computer test: passage on one side, questions on the other, a countdown timer. Mark the questions you're unsure of and open the question list to see what's still blank. Skip a part or submit with blanks and the site asks you first."),
  },
  {
    img: "img/showcase/review.jpg",
    alt: L("Trang xem lại: câu sai, đáp án đúng, giải thích tiếng Việt và câu dẫn chứng tô trong bài đọc", "Review page: wrong answer, correct answer, explanation and highlighted evidence in the passage"),
    problem: L("Làm xong chỉ biết điểm, không biết sai ở đâu, vì sao sai. Lần sau sai lại đúng kiểu đó.",
      "You get a score but no idea where or why you went wrong, so you make the same mistake next time."),
    fix: L("Nộp bài là xem lại từng câu: đáp án đúng, giải thích bằng tiếng Việt, câu dẫn chứng tô sẵn trong bài đọc. Listening có lời thoại và nút nghe lại đúng đoạn chứa đáp án.",
      "Every question is reviewed after you submit: the right answer, an explanation and the evidence highlighted in the passage. Listening shows the transcript and replays the exact clip with the answer."),
  },
  {
    img: "img/showcase/packs.jpg",
    alt: L("Trang Gói đề theo quý: danh sách đề Writing thật quý IV/2026, đếm số bài đã làm", "Quarterly packs page: list of real Writing questions with a done counter"),
    problem: L("Đề trên mạng nhiều nhưng lộn xộn: không biết đề nào sát kỳ thi, cũng không nhớ mình đã làm tới đâu.",
      "There are tests everywhere online, but it's hard to tell which ones match the current exams or how far you've got."),
    fix: L("Đề gom thành gói theo quý: Speaking Forecast, Writing Real Tests, Reading Forecast. Mỗi gói đếm số bài bạn đã làm trên tổng số, làm xong bài nào là đánh dấu bài đó.",
      "Tests come in quarterly packs: Speaking Forecast, Writing Real Tests, Reading Forecast. Each pack counts how many you've done out of the total and ticks off each one you finish."),
  },
];

export function showcaseSection() {
  return el("section", { class: "showcase" },
    el("div", { class: "section-head" }, el("h2", {}, L("Tự luyện IELTS hay vướng ở đâu, web xử lý thế nào", "Where self-study gets stuck, and how the site helps"))),
    ROWS.map((r, i) => el("div", { class: "showcase-row" + (i % 2 ? " flip" : "") },
      el("div", { class: "showcase-text" },
        el("div", { class: "showcase-problem" }, el("span", { class: "showcase-tag bad" }, L("Vấn đề", "Problem")), el("p", {}, r.problem)),
        el("div", { class: "showcase-arrow" }, icon("arrow")),
        el("div", { class: "showcase-fix" }, el("span", { class: "showcase-tag good" }, L("Cách xử lý", "How we fix it")), el("p", {}, r.fix))),
      el("figure", { class: "showcase-shot" }, el("img", { src: r.img, alt: r.alt, loading: "lazy", width: "1030", height: "820" })))));
}
