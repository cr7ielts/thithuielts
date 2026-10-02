// THƯ VIỆN ĐỀ SPEAKING CÓ SẴN — chọn ở form giao bài Homework (loại Speaking → "Chọn đề có sẵn").
//  speaking: cùng định dạng với bài tập Speaking (js/homework/speaking.js):
//    part1 / part3: mỗi phần tử một câu hỏi; dòng bắt đầu bằng "# " là tên chủ đề của các câu sau nó
//    part2: { topic, bullets: ["You should say" từng ý], followUp: câu hỏi kết (rounding-off) }
//  Thêm đề: copy một khối { id, title, ... } rồi sửa nội dung.
export const SPEAKING_TESTS = [
  {
    id: "cum3-getting-around-money",
    title: "IELTS Speaking Mock Test — Cụm 3: Getting Around & Money",
    topics: "Public transport · Bikes · Roads & streets · Street markets · Shopping · Money & saving · Advertisements · Borrowing & lending",
    instructions:
      "IELTS Speaking Mock Test — Cụm 3: Getting Around & Money\n" +
      "Part 1 (4–5 phút): 12 câu, 3 chủ đề × 4 câu.\n" +
      "Part 2 (3–4 phút): 1 phút chuẩn bị, nói 1–2 phút theo cue card, rồi trả lời 1 câu hỏi kết.\n" +
      "Part 3 (4–5 phút): 6 câu, 2 chủ đề × 3 câu.\n" +
      "Tổng thời gian khoảng 11–14 phút. Trả lời như đang thi thật: nói đủ ý, có lý do và ví dụ.",
    speaking: {
      mode: "parts",
      part1: [
        "# Topic 1 — Work or studies",
        "Do you work or are you a student?",
        "How do you usually get to your school or workplace?",
        "How long does it take you to get there?",
        "Would you like to live closer to your school or workplace? Why / why not?",
        "# Topic 2 — Public transport",
        "How often do you take public transport?",
        "Which form of public transport is most popular where you live?",
        "Did you use public transport much when you were a child?",
        "What would make more people in your city take the bus?",
        "# Topic 3 — Money & saving",
        "Are you good at saving money?",
        "What do you usually spend most of your money on?",
        "Do you think children should get pocket money?",
        "Do you usually pay by cash or by card? Why?",
      ],
      part2: {
        topic: "Describe something you bought at a really good price.",
        bullets: ["what it was", "where you bought it", "how you got it at a good price", "and explain how you felt about buying it."],
        followUp: "Do you often buy things on sale?",
      },
      part3: [
        "# Theme 1 — Shopping and advertising",
        "Why do some people still prefer traditional markets to supermarkets?",
        "How has online shopping changed the way people in your country spend money?",
        "Do you think advertisements make people buy things they don't really need?",
        "# Theme 2 — Money and young people",
        "At what age should children start learning how to manage money?",
        "Why do some young people find it difficult to save money nowadays?",
        "Is it a good idea for friends to lend each other money? Why / why not?",
      ],
      p1Secs: 45, p2Prep: 60, p2Secs: 120, p3Secs: 60,
    },
  },
];
