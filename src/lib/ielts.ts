import type { ExamMode, Skill } from './types';

/** Thoi gian chuan cua tung ky nang (giay). */
export const SKILL_DURATION: Record<Skill, number> = {
  listening: 40 * 60, // 30' nghe + 10' chuyen dap an
  reading: 60 * 60,
  writing: 60 * 60,
  speaking: 15 * 60,
};

export const SKILL_LABEL: Record<Skill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

export const SKILL_VI: Record<Skill, string> = {
  listening: 'Nghe',
  reading: 'Đọc',
  writing: 'Viết',
  speaking: 'Nói',
};

export const SKILL_ORDER: Skill[] = ['listening', 'reading', 'writing', 'speaking'];

export function skillsOfMode(mode: ExamMode): Skill[] {
  return mode === 'full' ? SKILL_ORDER : [mode];
}

export function totalDuration(mode: ExamMode): number {
  return skillsOfMode(mode).reduce((sum, s) => sum + SKILL_DURATION[s], 0);
}

/**
 * Bang quy doi diem tho -> band cho Listening va Academic Reading (40 cau).
 * Nguon: bang quy doi cong bo trong sach Cambridge IELTS.
 */
const LISTENING_TABLE: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1],
];

const READING_TABLE: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [2, 1.5], [1, 1],
];

function lookup(table: [number, number][], raw: number): number {
  for (const [min, band] of table) if (raw >= min) return band;
  return 0;
}

/** Quy doi diem tho sang band, co chuan hoa neu de khong du 40 cau. */
export function rawToBand(raw: number, totalQuestions: number, skill: 'listening' | 'reading'): number {
  if (!totalQuestions) return 0;
  const scaled = Math.round((raw / totalQuestions) * 40);
  return lookup(skill === 'listening' ? LISTENING_TABLE : READING_TABLE, scaled);
}

/** Lam tron band theo quy tac IELTS: .25 -> .5 ; .75 -> +1 */
export function roundBand(value: number): number {
  const floor = Math.floor(value);
  const frac = value - floor;
  if (frac < 0.25) return floor;
  if (frac < 0.75) return floor + 0.5;
  return floor + 1;
}

export function overallBand(bands: (number | null | undefined)[]): number | null {
  const valid = bands.filter((b): b is number => typeof b === 'number' && !Number.isNaN(b));
  if (!valid.length) return null;
  return roundBand(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/** So sanh dap an HS voi dap an dung (khong phan biet hoa thuong, bo dau cau thua). */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?"'’“”]/g, '')
    .replace(/\s+/g, ' ');
}

export function isAnswerCorrect(response: string, correctAnswers: string[]): boolean {
  if (!response?.trim() || !correctAnswers?.length) return false;
  const given = normalizeAnswer(response);
  // Cau nhieu lua chon (multi_select) luu dang "A|C"
  if (given.includes('|')) {
    const givenSet = given.split('|').map((s) => s.trim()).filter(Boolean).sort();
    const expected = correctAnswers.map((a) => normalizeAnswer(a)).sort();
    return givenSet.length === expected.length && givenSet.every((v, i) => v === expected[i]);
  }
  return correctAnswers.some((ans) => {
    const expected = normalizeAnswer(ans);
    // Dap an co the viet dang "library/the library"
    return expected.split('/').map((s) => s.trim()).includes(given);
  });
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatDateTimeVi(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDurationVi(seconds: number | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m} phút ${s} giây`;
  return `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}

export const MAX_VIOLATIONS = 3;

export const VIOLATION_LABEL: Record<string, string> = {
  tab_hidden: 'Chuyển sang tab/ứng dụng khác',
  window_blur: 'Rời khỏi cửa sổ bài thi',
  fullscreen_exit: 'Thoát chế độ toàn màn hình',
  copy: 'Cố gắng sao chép nội dung',
  paste: 'Cố gắng dán nội dung',
  contextmenu: 'Mở menu chuột phải',
  devtools_key: 'Dùng phím tắt công cụ nhà phát triển',
};

/**
 * Band tong chi duoc chot khi tat ca ky nang cua de da co band.
 * Con thieu ky nang nao (vd Speaking cho giao vien cham) thi tra ve null.
 */
export function finalOverallBand(
  mode: ExamMode,
  bands: { listening?: number | null; reading?: number | null; writing?: number | null; speaking?: number | null }
): number | null {
  const needed = skillsOfMode(mode);
  const values = needed.map((s) => bands[s]);
  if (values.some((v) => v == null)) return null;
  return overallBand(values as number[]);
}
