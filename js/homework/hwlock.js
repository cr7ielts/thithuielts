// KHOÁ ĐÁP ÁN ĐẾN HẠN — bài trong ngân hàng đề đang được giao làm homework
//  Trong lúc homework còn mở, học sinh không luyện tự do / xem lại (có đáp án) đúng bài đó, kể cả "anh em" của nó:
//  section Listening và đề đầy đủ chứa section đó là cùng một bài. Mở lại khi:
//    - đã nộp và đã qua hạn, hoặc
//    - chưa nộp, đã qua hạn và bài không cho nộp muộn.
//  Giáo viên không bị khoá.
import { listAssignments, listMyHomework } from "./hwstore.js";
import { myClasses } from "../classes/clstore.js";
import { isAdmin } from "../firebase.js";
import { el, icon, fmtDateTime } from "../ui.js";
import { L } from "../i18n.js";

/** reading:<id> · listening:<đề> — section "forecast-01-s2" thuộc đề "forecast-01" */
export const bankFamily = (kind, id) => (kind === "reading" ? `r:${id}` : `l:${String(id).replace(/-s\d+$/, "")}`);

let cache = null;   // { at, list, mine }
async function load(uid) {
  if (cache && Date.now() - cache.at < 60e3 && cache.uid === uid) return cache;
  const [list, mine] = await Promise.all([
    listAssignments({ admin: false, classIds: myClasses().map((c) => c.id) }).catch(() => []),
    listMyHomework(uid).catch(() => new Map()),
  ]);
  cache = { at: Date.now(), uid, list, mine };
  return cache;
}
export const resetLockCache = () => { cache = null; };

/** Homework đang khoá bài này, hoặc null. → { a, sub } */
export async function bankLock(ctx, kind, id) {
  if (!ctx.user || isAdmin(ctx.user)) return null;
  const fam = bankFamily(kind, id);
  const { list, mine } = await load(ctx.user.uid);
  const now = Date.now();
  for (const a of list) {
    if (a.type !== "bank" || !a.bank || bankFamily(a.bank.kind, a.bank.id) !== fam) continue;
    const sub = mine.get(a.id) || null;
    const open = a.dueAt > now || (!sub && a.allowLate);
    if (open) return { a, sub };
  }
  return null;
}

/** Hộp thông báo thay cho trang luyện / xem lại khi đang bị khoá */
export function lockNotice(ctx, { a, sub }) {
  const due = fmtDateTime(a.dueAt).replace(/:\d\d$/, "");
  return el("div", { class: "card stack" },
    el("div", { class: "row", style: "gap:10px" }, icon("shield"), el("h2", { class: "mb-0" }, L("Bài này đang là bài tập về nhà", "This test is set as homework"))),
    el("p", { class: "mb-0" }, sub
      ? L(`Bạn đã nộp “${a.title}”. Đáp án, phần xem lại và luyện lại bài này mở sau hạn nộp (${due}).`,
          `You've submitted “${a.title}”. Answers, review and practice for this test open after the deadline (${due}).`)
      : L(`Hãy làm bài này ở trang Homework (“${a.title}”, hạn ${due}). Sau hạn nộp bạn mới luyện tự do và xem đáp án được.`,
          `Do this test from the Homework page (“${a.title}”, due ${due}). Free practice and answers open after the deadline.`)),
    el("div", {}, el("button", { class: "btn btn-primary", onclick: () => ctx.go(`homework/${a.id}`) }, icon("homework"), L("Mở bài tập", "Open homework"))));
}

/** Bài nộp (luyện đề) gắn với homework mà chưa tới hạn công bố đáp án */
export const hiddenUntil = (sub, user) => (!isAdmin(user) && sub?.revealAt && new Date(sub.revealAt) > new Date() ? new Date(sub.revealAt) : null);
