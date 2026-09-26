// Trang kết quả: chi tiết một bài nộp, lịch sử của học sinh, và bảng điều khiển giáo viên
import { el, icon, escapeHtml, fmtDateTime, fmtDuration, toast, confirmDialog } from "./ui.js";
import { listMySubmissions, listAllSubmissions, gradeSubmission, listStudents } from "./store.js";
import { isAdmin } from "./firebase.js";
import { createCat } from "./cat.js";
import { L, isVi } from "./i18n.js";

const SKILL_LABEL = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" };

/* ================= Chi tiết một bài nộp ================= */
export function renderResult(ctx, sub) {
  const auto = sub.autoSubmitted;
  const head = el(
    "div", { class: "card" },
    el("div", { class: "result-head" },
      bandRing(sub),
      el("div", { style: "flex:1;min-width:240px" },
        el("div", { class: "row", style: "gap:14px;margin-bottom:4px" },
          el("div", { class: "skill-ico " + sub.skill }, icon(sub.skill)),
          el("h1", { style: "margin:0" }, SKILL_LABEL[sub.skill] || sub.skill)),
        el("div", { class: "muted" }, sub.testTitle ? `${L("Ngân hàng đề", "Question bank")} · ${sub.testTitle}` : sub.testId),
        el("div", { class: "row wrap", style: "margin-top:12px;gap:8px" },
          el("span", { class: "badge badge-brand" }, `${L("Nộp lúc", "Submitted")}: ${fmtDateTime(sub.submittedAt)}`),
          el("span", { class: "badge" }, `${L("Thời gian làm", "Time taken")}: ${fmtDuration(sub.durationSec)}`),
          auto ? el("span", { class: "badge badge-amber" }, L("Tự động nộp khi hết giờ", "Auto-submitted when time ran out"))
               : el("span", { class: "badge badge-green" }, L("Học sinh chủ động nộp", "Submitted by student")),
          sub.local ? el("span", { class: "badge badge-red" }, L("Lưu tạm trên máy (chưa cấu hình Firebase)", "Saved on this device only (Firebase not set up)")) : null
        )
      ),
      el("div", { class: "result-cat" }, resultCat(sub))
    )
  );

  const body = el("div", { class: "stack", style: "margin-top:16px" });

  if (sub.skill === "listening" || sub.skill === "reading") {
    body.append(
      el("div", { class: "grid grid-4" },
        stat(L("Số câu đúng", "Correct"), `${sub.raw}/${sub.total}`),
        hasBand(sub) ? stat(L("Band ước tính", "Estimated band"), Number(sub.band).toFixed(1))
          : stat(L("Dạng bài", "Mode"), sub.skill === "listening" ? L("Luyện 1 section", "Single section") : L("Luyện 1 passage", "Single passage")),
        stat(L("Tỉ lệ đúng", "Accuracy"), `${Math.round((sub.raw / sub.total) * 100)}%`),
        stat(L("Bỏ trống", "Blank"), String(sub.details.filter((d) => !d.given).length))
      ),
      reviewCard(sub)
    );
  }

  if (sub.skill === "writing") {
    body.append(teacherCard(sub, ctx));
    for (const t of sub.tasks) {
      body.append(
        el("div", { class: "card" },
          el("div", { class: "row", style: "margin-bottom:10px" },
            el("h3", { style: "margin:0" }, t.title),
            el("span", { class: "badge " + (t.words >= t.minWords ? "badge-green" : "badge-amber") },
              L(`${t.words} / ${t.minWords} từ`, `${t.words} / ${t.minWords} words`))),
          el("div", { style: "white-space:pre-wrap;font-family:var(--font-read);line-height:1.75" },
            t.text || L("(không có nội dung)", "(no answer)")))
      );
    }
  }

  if (sub.skill === "speaking") {
    body.append(teacherCard(sub, ctx));
    body.append(
      el("div", { class: "card" },
        el("div", { class: "row", style: "margin-bottom:6px" },
          el("h3", { style: "margin:0" }, L("Các lượt nói", "Your answers")),
          el("span", { class: "badge" }, `${L("Tổng thời lượng nói", "Total speaking time")}: ${fmtDuration(sub.spokenSeconds || 0)}`)),
        sub.turns.map((t, i) =>
          el("div", { class: "turn" },
            el("div", { class: "row", style: "gap:8px" },
              el("span", { class: "badge" }, `#${i + 1}`),
              el("span", { class: "tiny dim" }, t.part),
              el("div", { class: "spacer" }),
              el("span", { class: "badge " + (t.skipped ? "badge-red" : "badge-teal") },
                t.skipped ? L("bỏ qua", "skipped") : `${t.seconds}s`)),
            el("div", { class: "turn-q", style: "margin-top:8px" }, t.prompt),
            t.audioUrl
              ? el("audio", { controls: "", src: t.audioUrl, style: "width:100%;max-width:460px" })
              : el("div", { class: "tiny dim" },
                  t.hasAudio ? L("Có ghi âm nhưng chưa tải lên được.", "Recorded, but the upload failed.") : L("Không có file ghi âm.", "No recording.")))))
    );
  }

  return el("div", {}, head, body,
    el("div", { class: "row", style: "margin-top:20px" },
      el("button", { class: "btn", onclick: () => ctx.go("home") }, icon("back"), L("Về trang chủ", "Back to home")),
      el("button", { class: "btn", onclick: () => ctx.go("history") }, L("Xem lịch sử làm bài", "View test history"))));
}

function resultCat(sub) {
  const opts = { size: 120, bubbleSide: "left" };
  if (sub.skill === "listening" || sub.skill === "reading") {
    const b = hasBand(sub) ? Number(sub.band) : (sub.raw / sub.total) * 9;
    if (b >= 6.5) return createCat({ ...opts, mood: "happy", say: hasBand(sub)
      ? L(`Band ${b.toFixed(1)}! Meo tuyệt vời!`, `Band ${b.toFixed(1)}! Meow-velous!`)
      : L(`${sub.raw}/${sub.total}! Meo tuyệt vời!`, `${sub.raw}/${sub.total}! Meow-velous!`) });
    if (b >= 5) return createCat({ ...opts, mood: "idle", say: L("Khá lắm, luyện thêm chút nữa nhé!", "Nice work — a little more practice!") });
    return createCat({ ...opts, mood: "sad", say: L("Không sao, xem lại lỗi sai cùng i-melts nha", "No worries — let's review the mistakes together") });
  }
  return sub.teacherBand != null
    ? createCat({ ...opts, mood: "happy", say: L("Giáo viên chấm rồi nè!", "Your teacher has marked it!") })
    : createCat({ ...opts, mood: "think", say: L("Đang chờ giáo viên chấm…", "Waiting for your teacher to mark…") });
}

const hasBand = (sub) => sub.band !== null && sub.band !== undefined && sub.band !== "";

function bandRing(sub) {
  if ((sub.skill === "listening" || sub.skill === "reading") && !hasBand(sub) && sub.total) {
    return el("div", { class: "band-ring", style: `--pct:${(sub.raw / sub.total) * 100}%` },
      el("div", { class: "val", style: "font-size:1.5rem" }, `${sub.raw}/${sub.total}`));
  }
  const raw = sub.graded === false ? sub.teacherBand : sub.band;
  const band = raw === null || raw === undefined || raw === "" ? null : Number(raw);
  const pct = band ? (band / 9) * 100 : 0;
  return el("div", { class: "band-ring", style: `--pct:${pct}%` },
    el("div", { class: "val" }, band === null || Number.isNaN(band) ? "—" : band.toFixed(1)));
}

function stat(k, v) {
  return el("div", { class: "stat" }, el("div", { class: "k" }, k), el("div", { class: "v" }, v));
}

function reviewCard(sub) {
  const list = el("div");
  for (const d of sub.details) {
    list.append(
      el("div", { class: "review-item " + (d.ok ? "ok" : "bad") },
        el("div", { class: "row", style: "gap:8px;align-items:flex-start" },
          el("span", { class: "qnum" }, d.n),
          el("div", { style: "flex:1" },
            el("div", { class: "small" }, d.question),
            el("div", { class: "small", style: "margin-top:4px" },
              el("span", { class: "dim" }, L("Bạn trả lời: ", "Your answer: ")),
              el("span", { style: "font-weight:800" }, d.given || L("(bỏ trống)", "(blank)")),
              d.ok ? null : el("span", {}, "  ·  "),
              d.ok ? null : el("span", { class: "dim" }, L("Đáp án: ", "Answer: ")),
              d.ok ? null : el("span", { class: "ans-key" }, d.key))),
          el("span", { class: "badge " + (d.ok ? "badge-green" : "badge-red") }, d.ok ? L("Đúng", "Correct") : L("Sai", "Wrong"))))
    );
  }
  return el("div", { class: "card" }, el("h3", {}, L("Xem lại từng câu", "Review each question")), list);
}

const gradedHtml = (band, comment) =>
  `<strong>${L("Giáo viên đã chấm", "Marked by your teacher")} — Band ${Number(band).toFixed(1)}</strong>` +
  (comment ? `<br>${escapeHtml(comment)}` : "");

function teacherCard(sub, ctx) {
  const graded = sub.graded && sub.teacherBand != null;
  const box = el("div", {
    class: graded ? "notice notice-info" : "notice notice-warn",
    html: graded
      ? gradedHtml(sub.teacherBand, sub.teacherComment)
      : L("Bài này chưa được chấm. Giáo viên sẽ nhập band và nhận xét sau.", "Not marked yet. Your teacher will add a band and feedback later."),
  });
  const card = el("div", { class: "card" }, el("h3", {}, L("Nhận xét của giáo viên", "Teacher feedback")), box);
  if (isAdmin(ctx.user)) card.append(gradeForm(sub, ctx, box));
  return card;
}

function gradeForm(sub, ctx, box) {
  const bandInput = el("input", { id: "grade-band", type: "text", placeholder: L("vd. 6.5", "e.g. 6.5"), value: sub.teacherBand ?? "", style: "width:110px" });
  const comment = el("textarea", { id: "grade-comment", placeholder: L("Nhận xét…", "Feedback…"), style: "width:100%;min-height:90px" });
  comment.value = sub.teacherComment || "";
  const btn = el("button", { class: "btn btn-teal" }, L("Lưu điểm chấm", "Save mark"));
  btn.onclick = async () => {
    const band = parseFloat(String(bandInput.value).replace(",", "."));
    if (!(band >= 0 && band <= 9)) { toast(L("Band phải nằm trong khoảng 0–9", "The band must be between 0 and 9"), "err"); return; }
    btn.disabled = true;
    try {
      await gradeSubmission(sub.id, { band, comment: comment.value, graderEmail: ctx.user.email });
      sub.teacherBand = band; sub.teacherComment = comment.value; sub.graded = true;
      box.className = "notice notice-info";
      box.innerHTML = gradedHtml(band, comment.value);
      toast(L("Đã lưu điểm", "Mark saved"), "ok");
    } catch (err) {
      toast(L("Lỗi: ", "Error: ") + err.message, "err");
    } finally { btn.disabled = false; }
  };
  return el("div", { class: "stack", style: "margin-top:14px" },
    el("div", { class: "row" }, el("label", { for: "grade-band", class: "strong" }, L("Chấm bài:", "Band:")), bandInput),
    comment, el("div", {}, btn));
}

/* ================= Lịch sử của học sinh ================= */
export function renderHistory(ctx) {
  const view = el("div", { class: "stack-lg" });
  view.append(el("div", {},
    el("h1", {}, L("Lịch sử làm bài", "Test history")),
    el("p", { class: "muted mb-0" }, L("Mỗi lần nộp đều được ghi lại kèm thời điểm nộp chính xác.", "Every submission is saved with its exact submission time."))));
  const holder = el("div", { class: "card" }, el("div", { class: "muted" }, L("Đang tải…", "Loading…")));
  view.append(holder);

  listMySubmissions(ctx.user.uid).then((list) => {
    holder.innerHTML = "";
    if (!list.length) {
      holder.append(el("div", { class: "muted" }, L("Bạn chưa nộp bài nào. Chọn một kỹ năng ở trang chủ để bắt đầu.", "You haven't submitted a test yet. Pick a skill on the home page to start.")));
      return;
    }
    holder.append(submissionTable(list, ctx, false));
  }).catch((err) => {
    holder.innerHTML = "";
    holder.append(el("div", { class: "notice notice-error" }, L("Không tải được dữ liệu: ", "Couldn't load data: ") + err.message));
  });

  return view;
}

/* ================= Bảng điều khiển giáo viên ================= */
export function renderAdmin(ctx) {
  const view = el("div", { class: "stack-lg" });
  const tabBtns = el("div", { class: "admin-tabs" });
  const holder = el("div", { class: "card" }, el("div", { class: "muted" }, L("Đang tải…", "Loading…")));

  view.append(el("div", {},
    el("div", { class: "row", style: "margin-bottom:6px" },
      el("h1", { style: "margin:0" }, L("Quản lý lớp học", "Class dashboard")),
      el("span", { class: "badge badge-teal" }, L("giáo viên", "teacher"))),
    el("p", { class: "muted mb-0" }, L("Theo dõi học sinh đã đăng ký và mọi bài nộp, mới nhất trước.", "See every registered student and every submission, newest first."))),
    tabBtns, holder);

  let submissions = null, students = null, filterUid = null, tab = "submissions";

  const setTab = (t) => {
    tab = t;
    [...tabBtns.children].forEach((b) => b.classList.toggle("btn-primary", b.dataset.tab === t));
    paint();
  };
  tabBtns.append(
    el("button", { class: "btn btn-sm", dataset: { tab: "submissions" }, onclick: () => { filterUid = null; setTab("submissions"); } }, icon("file"), L("Bài nộp", "Submissions")),
    el("button", { class: "btn btn-sm", dataset: { tab: "students" }, onclick: () => setTab("students") }, icon("user"), L("Học sinh", "Students")));

  function paint() {
    holder.innerHTML = "";
    if (!submissions || !students) { holder.append(el("div", { class: "muted" }, L("Đang tải…", "Loading…"))); return; }

    if (tab === "students") {
      const counts = new Map();
      for (const s of submissions) counts.set(s.uid, (counts.get(s.uid) || 0) + 1);
      if (!students.length) {
        holder.append(el("div", { class: "muted" }, L("Chưa có học sinh nào đăng ký.", "No students have signed up yet.")));
        return;
      }
      holder.append(
        el("div", { class: "grid grid-4", style: "margin-bottom:16px" },
          stat(L("Học sinh", "Students"), String(students.length)),
          stat(L("Đã nộp bài", "Have submitted"), String(students.filter((st) => counts.get(st.uid)).length)),
          stat(L("Hoạt động 7 ngày", "Active in 7 days"), String(students.filter((st) => st.lastLoginAt && Date.now() - new Date(st.lastLoginAt) < 7 * 864e5).length)),
          stat(L("Tổng bài nộp", "Submissions"), String(submissions.length))),
        studentTable(students, counts, (uid) => { filterUid = uid; setTab("submissions"); }));
      return;
    }

    const list = filterUid ? submissions.filter((s) => s.uid === filterUid) : submissions;
    if (filterUid) {
      const who = students.find((st) => st.uid === filterUid);
      holder.append(el("div", { class: "row", style: "margin-bottom:12px" },
        el("span", { class: "chip chip-xp" }, who?.name || who?.email || filterUid),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => { filterUid = null; paint(); } }, icon("x"), L("Bỏ lọc", "Clear filter"))));
    }
    if (!list.length) {
      holder.append(el("div", { class: "muted" }, L("Chưa có bài nộp nào.", "No submissions yet.")));
      return;
    }
    const csvBtn = el("button", { class: "btn btn-sm", onclick: () => exportCsv(list) }, L("⬇  Xuất CSV", "⬇  Export CSV"));
    holder.append(
      el("div", { class: "grid grid-4", style: "margin-bottom:16px" },
        stat(L("Bài nộp", "Submissions"), String(list.length)),
        stat(L("Học sinh", "Students"), String(new Set(list.map((s) => s.uid)).size)),
        stat(L("Chờ chấm", "Awaiting marks"), String(list.filter((s) => s.graded === false && s.teacherBand == null).length)),
        stat(L("Tự động nộp", "Auto-submitted"), String(list.filter((s) => s.autoSubmitted).length))),
      el("div", { class: "row", style: "margin-bottom:10px" }, el("div", { class: "spacer" }), csvBtn),
      submissionTable(list, ctx, true));
  }

  Promise.all([listAllSubmissions(), listStudents()]).then(([subs, studs]) => {
    submissions = subs;
    students = studs;
    setTab(tab);
  }).catch((err) => {
    holder.innerHTML = "";
    holder.append(el("div", {
      class: "notice notice-error",
      html: L("Không tải được dữ liệu: ", "Couldn't load data: ") + escapeHtml(err.message) +
        `<br><span class='small'>${L("Kiểm tra email giáo viên trong js/config.js và firestore.rules đã khớp và đã deploy rules chưa. Nếu Firestore báo thiếu index, mở link trong console để tạo.",
                                     "Check that the teacher email matches in js/config.js and firestore.rules, and that the rules are deployed. If Firestore reports a missing index, open the link in the console to create it.")}</span>`,
    }));
  });

  setTab("submissions");
  return view;
}

function studentTable(students, counts, onView) {
  const providerLabel = (p) => (p === "google.com" ? "Google" : p === "demo" ? "Demo" : "Email");
  const table = el("table");
  table.append(el("thead", {}, el("tr", {},
    el("th", {}, L("Học sinh", "Student")),
    el("th", {}, L("Đăng nhập bằng", "Signs in with")),
    el("th", {}, L("Tham gia", "Joined")),
    el("th", {}, L("Hoạt động gần nhất", "Last active")),
    el("th", {}, L("Bài nộp", "Submissions")),
    el("th", {}, L("Từ vựng", "Vocabulary")),
    el("th", {}, ""))));
  const tbody = el("tbody");
  for (const st of students) {
    const n = counts.get(st.uid) || 0;
    tbody.append(el("tr", {},
      el("td", {}, el("div", { class: "strong" }, st.name || "—"), el("div", { class: "tiny dim" }, st.email || "")),
      el("td", {}, el("span", { class: "chip" }, providerLabel(st.provider))),
      el("td", {}, st.createdAt ? fmtDateTime(st.createdAt) : "—"),
      el("td", {}, st.lastLoginAt ? fmtDateTime(st.lastLoginAt) : "—"),
      el("td", {}, String(n)),
      el("td", {}, `${L("Cấp", "Lv")} ${st.level ?? 1} · ${st.xp ?? 0} XP`),
      el("td", {}, n ? el("button", { class: "btn btn-sm", onclick: () => onView(st.uid) }, L("Xem bài", "View work")) : null)));
  }
  table.append(tbody);
  return el("div", { class: "table-wrap" }, table);
}

function submissionTable(list, ctx, showStudent) {
  const table = el("table");
  table.append(el("thead", {}, el("tr", {},
    showStudent ? el("th", {}, L("Học sinh", "Student")) : null,
    el("th", {}, L("Kỹ năng", "Skill")),
    el("th", {}, L("Thời điểm nộp", "Submitted")),
    el("th", {}, L("Thời gian làm", "Time taken")),
    el("th", {}, L("Kết quả", "Result")),
    el("th", {}, "")
  )));
  const tbody = el("tbody");
  for (const s of list) {
    const score = (s.skill === "listening" || s.skill === "reading")
      ? `${s.raw}/${s.total}${hasBand(s) ? ` · Band ${Number(s.band).toFixed(1)}` : ""}`
      : (s.teacherBand != null ? `Band ${Number(s.teacherBand).toFixed(1)}` : L("chờ chấm", "awaiting mark"));
    tbody.append(el("tr", {},
      showStudent ? el("td", {}, el("div", {}, s.name || "—"), el("div", { class: "tiny dim" }, s.email || "")) : null,
      el("td", {}, el("span", { class: `skill-tag ${s.skill}` }, SKILL_LABEL[s.skill] || s.skill),
        s.testTitle ? el("div", { class: "tiny dim", style: "margin-top:4px;max-width:260px" }, s.testTitle) : null),
      el("td", {}, el("div", {}, fmtDateTime(s.submittedAt)),
        s.autoSubmitted ? el("div", { class: "tiny", style: "color:var(--amber)" }, L("tự động nộp", "auto-submitted")) : null),
      el("td", {}, fmtDuration(s.durationSec)),
      el("td", {}, score),
      el("td", {}, el("button", { class: "btn btn-sm", onclick: () => ctx.go("result", { submission: s }) }, L("Xem", "View")))
    ));
  }
  table.append(tbody);
  return el("div", { class: "table-wrap" }, table);
}

function exportCsv(list) {
  const rows = [["Name", "Email", "Skill", "Submitted at", "Time taken (s)", "Auto-submitted", "Raw score", "Band", "Teacher band"]];
  for (const s of list) {
    rows.push([
      s.name || "", s.email || "", s.skill,
      s.submittedAt ? new Date(s.submittedAt).toLocaleString(isVi() ? "vi-VN" : "en-GB") : "",
      s.durationSec ?? "", s.autoSubmitted ? "yes" : "no",
      s.raw ?? "", s.band ?? "", s.teacherBand ?? "",
    ]);
  }
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = el("a", { href: url, download: `ielts-submissions-${Date.now()}.csv` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export { confirmDialog };
