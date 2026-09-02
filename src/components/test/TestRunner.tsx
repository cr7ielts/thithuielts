'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestionCard from './QuestionCard';
import { useAntiCheat } from './useAntiCheat';
import Icon, { SKILL_ICON } from '@/components/Icon';
import {
  formatClock, MAX_VIOLATIONS, SKILL_DURATION, SKILL_LABEL,
  SKILL_VI, VIOLATION_LABEL,
} from '@/lib/ielts';
import type {
  AnswerRow, Attempt, AttemptSkill, Exam, Question, Section, Skill,
} from '@/lib/types';

interface Draft {
  response: string;
  audioUrl: string | null;
  dirty: boolean;
}

export default function TestRunner({
  attempt,
  exam,
  sections,
  savedAnswers,
  skillRows,
  userId,
}: {
  attempt: Attempt;
  exam: Exam;
  sections: Section[];
  savedAnswers: AnswerRow[];
  skillRows: AttemptSkill[];
  userId: string;
}) {
  const router = useRouter();

  const [skills, setSkills] = useState<AttemptSkill[]>(skillRows);
  const [entered, setEntered] = useState(false);   // da vao che do toan man hinh chua
  const [sectionIndex, setSectionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [switching, setSwitching] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const map: Record<string, Draft> = {};
    for (const a of savedAnswers) {
      map[a.question_id] = { response: a.response ?? '', audioUrl: a.audio_url, dirty: false };
    }
    return map;
  });
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const submittedRef = useRef(false);
  const closingRef = useRef(false);

  // Ky nang dang lam = ky nang dau tien chua nop xong
  const currentIndex = skills.findIndex((s) => !s.completed_at);
  const current = currentIndex >= 0 ? skills[currentIndex] : null;
  const isLastSkill = currentIndex === skills.length - 1;
  const nextSkill = currentIndex >= 0 ? skills[currentIndex + 1] : undefined;

  // Trong luc nghi giua hai ky nang thi khong dem vi pham
  const onBreak = Boolean(current && !current.started_at);
  const activeExam = entered && Boolean(current?.started_at) && !submittedRef.current;

  const skillSections = useMemo(
    () => (current ? sections.filter((s) => s.skill === current.skill) : []),
    [sections, current]
  );
  const skillQuestions = useMemo(
    () => skillSections.flatMap((s) => s.questions ?? []),
    [skillSections]
  );

  useEffect(() => setSectionIndex(0), [current?.skill]);

  // ------------------------------------------------------------- LUU TAM
  const flush = useCallback(async () => {
    const dirty = Object.entries(draftsRef.current).filter(([, d]) => d.dirty);
    if (!dirty.length) return;

    const payload = dirty.map(([questionId, d]) => ({
      questionId,
      response: d.response,
      ...(d.audioUrl ? { audioUrl: d.audioUrl } : {}),
    }));

    try {
      const res = await fetch(`/api/attempts/${attempt.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      if (!res.ok) return;
      setSavedAt(new Date());
      setDrafts((prev) => {
        const next = { ...prev };
        for (const [qid] of dirty) if (next[qid]) next[qid] = { ...next[qid], dirty: false };
        return next;
      });
    } catch {
      // Mat mang tam thoi - lan autosave sau se thu lai
    }
  }, [attempt.id]);

  useEffect(() => {
    if (!activeExam) return;
    const id = setInterval(() => void flush(), 8000);
    return () => clearInterval(id);
  }, [activeExam, flush]);

  // -------------------------------------------------------------- NOP BAI
  const submit = useCallback(
    async (reason?: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      await flush();
      await fetch(`/api/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason ?? null }),
      });

      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      window.onbeforeunload = null;
      router.push(`/history/${attempt.id}?justSubmitted=1`);
    },
    [attempt.id, flush, router]
  );

  // --------------------------------------------- CHUYEN / KET THUC KY NANG
  const closeSkill = useCallback(
    async (autoClosed: boolean) => {
      if (!current || closingRef.current || submittedRef.current) return;
      closingRef.current = true;
      setSwitching(true);

      await flush();
      const res = await fetch(`/api/attempts/${attempt.id}/skill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: current.skill, action: 'complete', autoClosed }),
      });
      const json = await res.json();
      if (json.skill) {
        setSkills((list) => list.map((s) => (s.id === json.skill.id ? json.skill : s)));
      }

      closingRef.current = false;
      setSwitching(false);

      // Ky nang cuoi cung khep lai thi nop luon ca bai
      if (isLastSkill) {
        await submit(autoClosed ? 'Hết thời gian làm bài' : undefined);
      }
    },
    [attempt.id, current, flush, isLastSkill, submit]
  );

  const startSkill = useCallback(async () => {
    if (!current) return;
    setSwitching(true);
    const res = await fetch(`/api/attempts/${attempt.id}/skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: current.skill, action: 'start' }),
    });
    const json = await res.json();
    if (json.skill) {
      setSkills((list) => list.map((s) => (s.id === json.skill.id ? json.skill : s)));
    }
    setSwitching(false);
  }, [attempt.id, current]);

  // ---------------------------------------------------------- CHONG GIAN LAN
  const antiCheat = useAntiCheat({
    attemptId: attempt.id,
    active: activeExam && !onBreak,
    onAutoSubmit: (reason) => void submit(reason),
  });

  // ------------------------------------------------ DONG HO CUA KY NANG HIEN TAI
  useEffect(() => {
    if (!activeExam || !current?.deadline_at) return;
    const deadline = new Date(current.deadline_at).getTime();

    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) void closeSkill(true);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeExam, current?.deadline_at, closeSkill]);

  // ---------------------------------------------------------------- HANH DONG
  function setAnswer(questionId: string, response: string) {
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { response, audioUrl: prev[questionId]?.audioUrl ?? null, dirty: true },
    }));
  }

  function setAudio(questionId: string, path: string) {
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { response: prev[questionId]?.response ?? '', audioUrl: path, dirty: true },
    }));
    void flush();
  }

  const answeredCount = skillQuestions.filter((q) => {
    const d = drafts[q.id];
    return q.question_type === 'speaking_prompt' ? Boolean(d?.audioUrl) : Boolean(d?.response?.trim());
  }).length;

  // ------------------------------------------------------------ MAN HINH CHO
  if (!entered) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="card w-full max-w-lg text-center">
          <Icon name="play" className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">{exam.title}</h1>
          <p className="mt-1 text-slate-600">
            Bấm nút bên dưới để vào chế độ toàn màn hình.
          </p>

          <div className="mt-5 space-y-2 rounded-2xl bg-brand-50 p-4 text-left text-sm text-brand-900">
            <p className="font-bold">Trình tự bài thi — mỗi kỹ năng một đồng hồ riêng:</p>
            {skills.map((s, i) => (
              <p key={s.id} className="flex items-center gap-2">
                <span className="font-bold">{i + 1}.</span>
                <Icon name={SKILL_ICON[s.skill]} className="h-4 w-4" />
                {SKILL_LABEL[s.skill]} — {Math.round(SKILL_DURATION[s.skill] / 60)} phút
              </p>
            ))}
            <p className="pt-1 font-semibold">Giữa các kỹ năng bạn được nghỉ, đồng hồ chỉ chạy khi bạn bấm bắt đầu.</p>
          </div>

          <ul className="mt-4 space-y-2 rounded-2xl bg-mango-50 p-4 text-left text-sm text-mango-900">
            <li>• Không chuyển tab, không thu nhỏ cửa sổ khi đang làm bài.</li>
            <li>• Mỗi lần rời màn hình đều bị ghi lại; quá {MAX_VIOLATIONS} lần bài sẽ <b>tự nộp</b>.</li>
            <li>• Không sao chép / dán / dùng chuột phải.</li>
            <li>• Bài tự lưu liên tục, hết giờ mỗi kỹ năng sẽ tự chuyển phần.</li>
          </ul>

          <button
            onClick={async () => {
              await antiCheat.enterFullscreen();
              setEntered(true);
            }}
            className="btn-primary mt-6 w-full text-base"
          >
            <Icon name="logIn" className="h-5 w-5" />
            Vào phòng thi
          </button>
        </div>
      </main>
    );
  }

  // -------------------------------------------- MAN HINH NGHI GIUA HAI KY NANG
  if (current && onBreak) {
    const doneCount = skills.filter((s) => s.completed_at).length;
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="card animate-pop w-full max-w-lg text-center">
          <Icon
            name={doneCount === 0 ? 'play' : 'coffee'}
            className="mx-auto h-12 w-12 text-brand-600"
          />
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
            {doneCount === 0
              ? `Sẵn sàng cho phần ${SKILL_LABEL[current.skill]}?`
              : `Xong ${SKILL_LABEL[skills[currentIndex - 1].skill]} rồi, nghỉ một chút nhé!`}
          </h1>
          <p className="mt-2 text-slate-600">
            {doneCount === 0
              ? 'Đồng hồ chỉ bắt đầu chạy khi bạn bấm nút bên dưới.'
              : 'Bạn có thể nghỉ ngơi bao lâu tuỳ ý. Đồng hồ phần tiếp theo chưa chạy.'}
          </p>

          <div className="mt-5 rounded-2xl bg-brand-50 p-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-brand-700">
              <Icon name={SKILL_ICON[current.skill]} className="h-8 w-8" />
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold text-brand-900">
              {SKILL_LABEL[current.skill]} — {SKILL_VI[current.skill]}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 font-bold text-brand-800">
              <Icon name="clock" className="h-4 w-4" />
              {Math.round(SKILL_DURATION[current.skill] / 60)} phút
            </p>
            <p className="mt-1 text-sm text-brand-800">
              {sections.filter((s) => s.skill === current.skill).length} phần •{' '}
              {sections
                .filter((s) => s.skill === current.skill)
                .reduce((n, s) => n + (s.questions?.length ?? 0), 0)}{' '}
              câu
            </p>
          </div>

          <div className="mt-4 flex justify-center gap-1.5">
            {skills.map((s) => (
              <span
                key={s.id}
                className={`h-2 w-10 rounded-full ${
                  s.completed_at ? 'bg-mint-600' : s.id === current.id ? 'bg-brand-700' : 'bg-slate-300'
                }`}
                title={SKILL_LABEL[s.skill]}
              />
            ))}
          </div>

          <button onClick={() => void startSkill()} disabled={switching} className="btn-primary mt-6 w-full text-base">
            {!switching && <Icon name="play" className="h-5 w-5" />}
            {switching ? 'Đang mở…' : `Bắt đầu ${SKILL_LABEL[current.skill]}`}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Bấm xong là đồng hồ chạy, không dừng lại được nữa.
          </p>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="card max-w-md text-center">
          <Icon name="send" className="mx-auto h-10 w-10 animate-pulse text-brand-600" />
          <p className="mt-2 font-bold text-slate-800">Đang nộp bài và chấm điểm…</p>
        </div>
      </main>
    );
  }

  const section = skillSections[sectionIndex];

  if (!section) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="card max-w-md text-center">
          <Icon name="inbox" className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 font-bold text-slate-800">
            Phần {SKILL_LABEL[current.skill]} của đề này chưa có nội dung.
          </p>
          <button onClick={() => void closeSkill(false)} className="btn-primary mt-4">
            {isLastSkill ? 'Nộp bài' : `Sang phần ${nextSkill ? SKILL_LABEL[nextSkill.skill] : 'tiếp theo'}`}
          </button>
        </div>
      </main>
    );
  }

  const lowTime = remaining <= 300;

  return (
    <div className="exam-locked min-h-screen pb-28">
      {/* ------------------------------------------------------------- THANH TREN */}
      <header className="sticky top-0 z-40 border-b-2 border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {exam.title} • Kỹ năng {currentIndex + 1}/{skills.length}
            </p>
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-slate-900">
              <Icon name={SKILL_ICON[current.skill]} className="h-5 w-5 text-brand-600" />
              {SKILL_LABEL[current.skill]} — {section.title || `Phần ${section.order_index}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Đã làm</p>
              <p className="font-bold text-slate-700">{answeredCount}/{skillQuestions.length}</p>
            </div>

            <div
              className={`rounded-2xl px-4 py-2 text-center ${
                lowTime ? 'animate-pulse bg-rose-100 text-rose-700' : 'bg-brand-50 text-brand-700'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                {SKILL_LABEL[current.skill]} còn
              </p>
              <p
                className="font-display text-2xl font-extrabold leading-none"
                aria-live={lowTime ? 'polite' : 'off'}
              >
                {formatClock(remaining)}
              </p>
            </div>

            <div
              className={`rounded-2xl px-3 py-2 text-center ${
                antiCheat.count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-mint-100 text-mint-800'
              }`}
              title="Số lần rời khỏi màn hình thi"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Cảnh báo</p>
              <p className="font-display text-lg font-extrabold leading-none">
                {antiCheat.count}/{MAX_VIOLATIONS}
              </p>
            </div>

            <button onClick={() => setConfirmOpen(true)} className="btn-primary py-2.5 text-sm">
              {isLastSkill ? 'Nộp bài' : 'Xong phần này'}
            </button>
          </div>
        </div>

        {/* Dieu huong giua cac phan trong CUNG mot ky nang */}
        {skillSections.length > 1 && (
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto border-t border-slate-100 px-5 py-2">
            {skillSections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSectionIndex(i)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                  i === sectionIndex
                    ? 'bg-brand-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-brand-100'
                }`}
              >
                {s.title || `${SKILL_LABEL[s.skill]} ${s.order_index}`}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ---------------------------------------------------------------- NOI DUNG */}
      <main className="mx-auto max-w-6xl px-5 py-6">
        {section.instructions && (
          <div className="mb-4 rounded-2xl bg-brand-50 px-5 py-3 text-sm font-medium text-brand-900">
            {section.instructions}
          </div>
        )}

        {section.audio_url && (
          <div className="mb-4 rounded-2xl border-2 border-brand-200 bg-white p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Icon name="headphones" className="h-4 w-4" />
              Bài nghe
            </p>
            <audio controls controlsList="nodownload" src={section.audio_url} className="w-full" />
          </div>
        )}

        <div className={section.passage_text ? 'grid gap-5 lg:grid-cols-2' : 'mx-auto max-w-3xl'}>
          {section.passage_text && (
            <article className="max-h-[calc(100vh-260px)] overflow-y-auto rounded-3xl border-2 border-slate-100 bg-white p-6">
              <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
                {section.passage_text}
              </div>
            </article>
          )}

          <div className="space-y-4 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto lg:pr-1">
            {section.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={section.image_url} alt="Biểu đồ đề bài" className="w-full rounded-2xl border-2 border-slate-100" />
            )}

            {groupQuestions(section.questions ?? []).map(([groupTitle, items]) => (
              <section key={groupTitle || 'default'} className="space-y-3">
                {groupTitle && (
                  <h3 className="rounded-2xl bg-slate-100 px-4 py-2 font-bold text-slate-700">
                    {groupTitle}
                  </h3>
                )}
                {items.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    value={drafts[q.id]?.response ?? ''}
                    audioUrl={drafts[q.id]?.audioUrl ?? null}
                    onChange={(v) => setAnswer(q.id, v)}
                    onAudio={(path) => setAudio(q.id, path)}
                    attemptId={attempt.id}
                    userId={userId}
                  />
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------ THANH DUOI */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <button
            onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
            disabled={sectionIndex === 0}
            className="btn-ghost py-2.5 text-sm"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Phần trước
          </button>
          <p className="flex-1 text-center text-xs text-slate-500">
            {savedAt ? `Đã lưu tự động lúc ${savedAt.toLocaleTimeString('vi-VN')}` : 'Bài của bạn được lưu tự động'}
          </p>
          <button
            onClick={() => setSectionIndex((i) => Math.min(skillSections.length - 1, i + 1))}
            disabled={sectionIndex >= skillSections.length - 1}
            className="btn-ghost py-2.5 text-sm"
          >
            Phần sau
            <Icon name="arrowRight" className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* ------------------------------------------------------------ CANH BAO */}
      {antiCheat.warning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-5">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vi-pham-title"
            className="card animate-pop w-full max-w-md border-4 border-rose-400 text-center"
          >
            <Icon name="alertTriangle" className="mx-auto h-12 w-12 text-rose-500" />
            <h2 id="vi-pham-title" className="mt-2 text-2xl font-extrabold text-rose-700">
              Bạn vừa rời khỏi màn hình thi!
            </h2>
            <p className="mt-2 text-slate-700">
              {VIOLATION_LABEL[antiCheat.warning.kind] ?? antiCheat.warning.kind}
            </p>
            <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 font-bold text-rose-700">
              Lần vi phạm thứ {antiCheat.warning.count}/{MAX_VIOLATIONS}
              {antiCheat.warning.count >= MAX_VIOLATIONS
                ? ' — bài thi đang được nộp tự động.'
                : ` — còn ${MAX_VIOLATIONS - antiCheat.warning.count} lần nữa bài sẽ tự nộp.`}
            </p>
            {antiCheat.warning.count < MAX_VIOLATIONS && (
              <button
                onClick={async () => {
                  antiCheat.dismissWarning();
                  await antiCheat.enterFullscreen();
                }}
                className="btn-primary mt-5 w-full"
              >
                Quay lại làm bài
              </button>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------- XAC NHAN XONG PHAN / NOP BAI */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-5">
          <div
            role="dialog"
            aria-modal="true"
            className="card animate-pop w-full max-w-md text-center"
          >
            <Icon
              name={isLastSkill ? 'send' : 'arrowRight'}
              className="mx-auto h-12 w-12 text-brand-600"
            />
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              {isLastSkill
                ? 'Nộp toàn bộ bài nhé?'
                : `Xong phần ${SKILL_LABEL[current.skill]}?`}
            </h2>
            <p className="mt-2 text-slate-600">
              Bạn đã làm <b>{answeredCount}/{skillQuestions.length}</b> câu của phần này.
              {answeredCount < skillQuestions.length && ' Vẫn còn câu chưa trả lời đấy!'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isLastSkill
                ? 'Nộp rồi sẽ không quay lại sửa được.'
                : `Chuyển sang ${nextSkill ? SKILL_LABEL[nextSkill.skill] : 'phần sau'} rồi sẽ không quay lại phần này được. Bạn được nghỉ trước khi bắt đầu phần mới.`}
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="btn-ghost flex-1">
                Làm tiếp
              </button>
              <button
                onClick={async () => {
                  setConfirmOpen(false);
                  await closeSkill(false);
                }}
                disabled={switching || submitting}
                className="btn-primary flex-1"
              >
                {switching || submitting
                  ? 'Đang xử lý…'
                  : isLastSkill ? 'Nộp bài' : 'Sang phần sau'}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitting && !confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70">
          <div className="card text-center">
            <Icon name="send" className="mx-auto h-10 w-10 animate-pulse text-brand-600" />
            <p className="mt-2 font-bold text-slate-800">Đang nộp bài và chấm điểm…</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Gom cac cau hoi theo group_title de hien thi de nhin. */
function groupQuestions(questions: Question[]): [string, Question[]][] {
  const groups: [string, Question[]][] = [];
  for (const q of questions) {
    const key = q.group_title || '';
    const last = groups[groups.length - 1];
    if (last && last[0] === key) last[1].push(q);
    else groups.push([key, [q]]);
  }
  return groups;
}
