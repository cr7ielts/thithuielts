// Tâm trạng lớp: đổi màu dải đầu lớp, biểu cảm và câu nói của Mochi trong trang lớp.
// mood: một trong các biểu cảm của Mochi (js/cat.js): idle, happy, sad, think, sleep, wow
import { L } from "../i18n.js";

export const THEMES = [
  { id: "vui",       label: L("Vui vẻ", "Cheerful"),       bg: "linear-gradient(135deg, #f7b733, #fc9842)", mood: "happy",
    say: L("Hôm nay lớp mình vui ghê!", "Such a happy class today!") },
  { id: "phankhich", label: L("Phấn khích", "Excited"),    bg: "linear-gradient(135deg, #f857a6, #ff9a44)", mood: "wow",
    say: L("Sẵn sàng bứt phá chưa nào?!", "Ready to smash it?!") },
  { id: "quyettam",  label: L("Quyết tâm", "Determined"),  bg: "linear-gradient(135deg, #e5484d, #f08c2e)", mood: "think",
    say: L("Cố lên, band mục tiêu đang chờ!", "Keep going — your target band is waiting!") },
  { id: "taptrung",  label: L("Tập trung", "Focused"),     bg: "linear-gradient(135deg, #4b6cd8, #7c8cf0)", mood: "think",
    say: L("Suỵt… cả lớp đang tập trung.", "Shh… everyone's focusing.") },
  { id: "binhyen",   label: L("Bình yên", "Calm"),         bg: "linear-gradient(135deg, #2fa38a, #6fcf97)", mood: "idle",
    say: L("Học chậm mà chắc nhé.", "Slow and steady.") },
  { id: "metmoi",    label: L("Mệt mỏi", "Tired"),         bg: "linear-gradient(135deg, #8e86c9, #b7a8d9)", mood: "sleep",
    say: L("Mệt thì nghỉ chút rồi học tiếp…", "Take a short break, then carry on…") },
  { id: "buon",      label: L("Buồn", "Sad"),              bg: "linear-gradient(135deg, #5d7896, #8fa6bd)", mood: "sad",
    say: L("Buồn thì mình học nhẹ nhàng thôi.", "Feeling down? Let's go gently today.") },
  { id: "thatvong",  label: L("Thất vọng", "Disappointed"), bg: "linear-gradient(135deg, #5b5f6e, #8b8fa0)", mood: "sad",
    say: L("Không sao, lần sau mình làm tốt hơn.", "It's okay — we'll do better next time.") },
];

export const DEFAULT_THEME = "vui";
export const themeOf = (c) => THEMES.find((t) => t.id === c?.theme) || null;
