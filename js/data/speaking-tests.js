// THƯ VIỆN ĐỀ SPEAKING CÓ SẴN — chọn ở form giao bài Homework (loại Speaking → "Chọn đề có sẵn").
//  speaking: cùng định dạng với bài tập Speaking (js/homework/speaking.js):
//    part1 / part3: mỗi phần tử một câu hỏi; dòng bắt đầu bằng "# " là tên chủ đề của các câu sau nó
//    part2: { topic, bullets: ["You should say" từng ý], followUp: câu hỏi kết (rounding-off) }
//  Thêm đề: copy một khối { id, title, ... } rồi sửa nội dung.
//  Đề forecast: tự ghép từ js/data/speaking-forecast.js (xem forecastTests bên dưới), không sửa ở đây.
import { SPEAKING_FORECAST } from "./speaking-forecast.js";

const READY_MADE = [
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

/**
 * Mỗi cue card Part 2 trong forecast thành một đề đầy đủ:
 *   Part 1 = 1 chủ đề mở đầu (Work/Study, Home, Hometown, lần lượt) + 2 chủ đề forecast (xoay vòng) — 12 câu
 *   Part 2 = cue card + câu hỏi kết · Part 3 = 6 câu đi kèm cue card đó
 */
export function forecastTests(f = SPEAKING_FORECAST) {
  const pad = (n) => String(n).padStart(2, "0");
  const block = (t, i) => [`# Topic ${i} — ${t.topic}`, ...t.questions];
  return f.part2.map((card, k) => {
    const p1 = [f.core[k % f.core.length], f.part1[(2 * k) % f.part1.length], f.part1[(2 * k + 1) % f.part1.length]];
    const short = card.topic.replace(/^Describe\s+/i, "").replace(/\.$/, "");
    const title = `Forecast ${f.period} · Đề ${pad(k + 1)} — ${short[0].toUpperCase()}${short.slice(1)}`;
    return {
      id: `fc-${f.period.replace(/\D+/g, "-")}-${card.id}`,
      group: `Forecast ${f.period} (cập nhật ${f.updated.split("-").reverse().join("/")})`,
      title,
      topics: p1.map((t) => t.topic).join(" · "),
      instructions:
        `IELTS Speaking Mock Test — Forecast ${f.period}\n` +
        "Part 1 (4–5 phút): 12 câu, 3 chủ đề × 4 câu.\n" +
        "Part 2 (3–4 phút): 1 phút chuẩn bị, nói 1–2 phút theo cue card, rồi trả lời 1 câu hỏi kết.\n" +
        "Part 3 (4–5 phút): 6 câu, 2 chủ đề × 3 câu.\n" +
        "Trả lời như đang thi thật: nói đủ ý, có lý do và ví dụ.",
      speaking: {
        mode: "parts",
        part1: p1.flatMap((t, i) => block(t, i + 1)),
        part2: { topic: card.topic, bullets: card.bullets, followUp: card.followUp },
        part3: card.part3,
        p1Secs: 45, p2Prep: 60, p2Secs: 120, p3Secs: 60,
      },
    };
  });
}

export const SPEAKING_TESTS = [...READY_MADE.map((t) => ({ group: "Đề có sẵn", ...t })), ...forecastTests()];
