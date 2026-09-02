import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BandPill from '@/components/BandPill';
import AiGradeTrigger from '@/components/AiGradeTrigger';
import { getSessionProfile, createAdminSupabase } from '@/lib/supabase/server';
import Icon, { SKILL_ICON, type IconName } from '@/components/Icon';
import {
  formatDateTimeVi, formatDurationVi, SKILL_LABEL, skillsOfMode, VIOLATION_LABEL,
} from '@/lib/ielts';
import type {
  AiFeedback, AnswerRow, Attempt, AttemptSkill, Exam, ExamMode, Profile, Question,
  Section, ViolationRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const CRITERIA_LABEL: Record<string, string> = {
  task_response: 'Task Response — Trả lời đúng yêu cầu đề',
  coherence_cohesion: 'Coherence & Cohesion — Mạch lạc, liên kết',
  lexical_resource: 'Lexical Resource — Vốn từ vựng',
  grammatical_range: 'Grammatical Range & Accuracy — Ngữ pháp',
};

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || !profile) redirect('/login');

  const { attemptId } = await params;

  const { data: attempt } = await supabase
    .from('attempts')
    .select('*, exams(*)')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt) notFound();

  const isStaff = profile.role === 'teacher' || profile.role === 'admin';
  if (attempt.user_id !== user.id && !isStaff) notFound();
  if (attempt.state === 'in_progress' && attempt.user_id === user.id) {
    redirect(`/test/${attemptId}`);
  }

  const exam = attempt.exams as Exam;
  const admin = createAdminSupabase();

  const { data: sections } = await admin
    .from('sections')
    .select('*, questions(*)')
    .eq('exam_id', attempt.exam_id)
    .order('order_index');

  const { data: answers } = await admin
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId);

  const { data: violations } = await admin
    .from('violations')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('occurred_at');

  const { data: skillRows } = await admin
    .from('attempt_skills')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('order_index');

  const skills = skillsOfMode(attempt.mode as ExamMode);
  const sectionList = ((sections ?? []) as unknown as Section[]).filter((s) =>
    skills.includes(s.skill)
  );
  const answerMap = new Map(((answers ?? []) as AnswerRow[]).map((a) => [a.question_id, a]));

  const hasWriting = skills.includes('writing');
  const hasUngraded =
    hasWriting &&
    sectionList
      .filter((s) => s.skill === 'writing')
      .flatMap((s) => s.questions ?? [])
      .some((q) => {
        const a = answerMap.get(q.id);
        return q.question_type === 'essay' && a?.response?.trim() && a.ai_band == null;
      });

  return (
    <AppShell profile={profile as Profile}>
      <Link href="/history" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Lịch sử thi
      </Link>

      {/* ------------------------------------------------------------ TOM TAT */}
      <div className="card mt-4 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-3xl font-extrabold">{exam.title}</h1>
            <p className="mt-1 text-brand-100">
              {attempt.mode === 'full' ? 'Full test 4 kỹ năng' : SKILL_LABEL[attempt.mode as keyof typeof SKILL_LABEL]}
            </p>
          </div>
          <div className="rounded-3xl bg-white/15 px-8 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-100">Band tổng</p>
            <p className="font-display text-5xl font-extrabold">
              {attempt.band_overall?.toFixed(1) ?? '—'}
            </p>
            {attempt.band_overall == null && (
              <p className="text-xs text-brand-100">chờ chấm đủ kỹ năng</p>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- LICH SU THI */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          { icon: 'play', label: 'Bắt đầu lúc', value: formatDateTimeVi(attempt.started_at) },
          { icon: 'send', label: 'Nộp bài lúc', value: formatDateTimeVi(attempt.submitted_at) },
          { icon: 'clock', label: 'Thời gian làm', value: formatDurationVi(attempt.time_spent_seconds) },
          {
            icon: attempt.violation_count > 0 ? 'shieldAlert' : 'shield',
            label: 'Rời màn hình',
            value: `${attempt.violation_count} lần`,
            danger: attempt.violation_count > 0,
          },
        ] as { icon: IconName; label: string; value: string; danger?: boolean }[]).map((item) => (
          <div key={item.label} className={`card ${item.danger ? 'border-2 border-rose-200 bg-rose-50' : ''}`}>
            <Icon name={item.icon} className={`h-6 w-6 ${item.danger ? 'text-rose-600' : 'text-brand-600'}`} />
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-600">{item.label}</p>
            <p className="font-bold text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>

      {attempt.auto_submitted && (
        <div className="card mt-4 border-2 border-rose-300 bg-rose-50">
          <p className="flex items-center gap-2 font-bold text-rose-800">
            <Icon name="alertTriangle" className="h-5 w-5" />
            Bài thi này được nộp tự động
          </p>
          <p className="text-sm text-rose-700">Lý do: {attempt.auto_submit_reason}</p>
        </div>
      )}

      {/* --------------------------------------------------- GIO GIAC TUNG KY NANG */}
      {(skillRows ?? []).length > 1 && (
        <section className="card mt-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Icon name="clock" className="h-5 w-5 text-brand-600" />
            Thời gian từng kỹ năng
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <th className="py-2">Kỹ năng</th>
                  <th className="py-2">Bắt đầu</th>
                  <th className="py-2">Kết thúc</th>
                  <th className="py-2">Đã dùng</th>
                </tr>
              </thead>
              <tbody>
                {((skillRows ?? []) as AttemptSkill[]).map((row) => {
                  const used =
                    row.started_at && row.completed_at
                      ? Math.round(
                          (new Date(row.completed_at).getTime() -
                            new Date(row.started_at).getTime()) / 1000
                        )
                      : null;
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-800">
                        <span className="flex items-center gap-2">
                          <Icon name={SKILL_ICON[row.skill]} className="h-4 w-4 text-brand-600" />
                          {SKILL_LABEL[row.skill]}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">{formatDateTimeVi(row.started_at)}</td>
                      <td className="py-2 text-slate-600">
                        {formatDateTimeVi(row.completed_at)}
                        {row.auto_closed && (
                          <span className="ml-1 chip bg-mango-100 text-mango-800">hết giờ</span>
                        )}
                      </td>
                      <td className="py-2 font-semibold text-slate-700">{formatDurationVi(used)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Thời gian nghỉ giữa các kỹ năng không tính vào thời gian làm bài.
          </p>
        </section>
      )}

      {/* ------------------------------------------------------------ BAND TUNG KY NANG */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((skill) => {
          const band = attempt[`band_${skill}` as keyof Attempt] as number | null;
          const raw = attempt[`raw_${skill}` as keyof Attempt] as number | null;
          return (
            <div key={skill} className="card text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name={SKILL_ICON[skill]} className="h-6 w-6" />
              </span>
              <p className="mt-2 font-bold text-slate-800">{SKILL_LABEL[skill]}</p>
              <div className="mt-2 flex justify-center">
                <BandPill band={band} size="lg" />
              </div>
              {raw != null && <p className="mt-1 text-xs text-slate-600">Đúng {raw} câu</p>}
              {band == null && (
                <p className="mt-1 text-xs text-slate-500">
                  {skill === 'speaking' ? 'Giáo viên đang nghe bài' : 'Đang chờ chấm'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {hasUngraded && <AiGradeTrigger attemptId={attemptId} />}

      {/* --------------------------------------------------------- CHI TIET BAI */}
      <h2 className="mt-10 text-2xl font-extrabold text-slate-900">Xem lại bài làm</h2>
      <div className="mt-4 space-y-6">
        {sectionList.map((section) => (
          <section key={section.id} className="card">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Icon name={SKILL_ICON[section.skill]} className="h-5 w-5 text-brand-600" />
              {section.title || `${SKILL_LABEL[section.skill]} ${section.order_index}`}
            </h3>

            <div className="mt-4 space-y-3">
              {(section.questions ?? []).map((q: Question) => {
                const a = answerMap.get(q.id);
                const objective = ['listening', 'reading'].includes(section.skill);

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border-2 p-4 ${
                      !objective ? 'border-slate-100'
                      : a?.is_correct ? 'border-mint-200 bg-mint-50'
                      : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white px-2 text-sm font-extrabold text-slate-600">
                        {q.number_label || q.order_index}
                      </span>
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap text-sm font-medium text-slate-800">{q.prompt}</p>

                        {objective ? (
                          <div className="mt-2 space-y-1 text-sm">
                            <p>
                              <span className="font-semibold text-slate-500">Bạn trả lời: </span>
                              <span className={a?.is_correct ? 'font-bold text-mint-700' : 'font-bold text-rose-700'}>
                                {a?.response?.trim() || '(bỏ trống)'}
                              </span>
                              {a?.is_correct ? ' ✓' : ' ✗'}
                            </p>
                            {!a?.is_correct && (
                              <p>
                                <span className="font-semibold text-slate-500">Đáp án đúng: </span>
                                <span className="font-bold text-mint-700">
                                  {((q.correct_answers as string[]) ?? []).join(' / ')}
                                </span>
                              </p>
                            )}
                          </div>
                        ) : q.question_type === 'speaking_prompt' ? (
                          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                            {a?.audio_url && <Icon name="mic" className="h-4 w-4" />}
                            {a?.audio_url ? 'Đã ghi âm — giáo viên sẽ nghe và chấm.' : '(không có bản ghi âm)'}
                          </p>
                        ) : (
                          <EssayReview answer={a} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* -------------------------------------------------------- NHAT KY VI PHAM */}
      {(violations ?? []).length > 0 && (
        <section className="card mt-8 border-2 border-rose-200">
          <h2 className="flex items-center gap-2 text-lg font-bold text-rose-800">
            <Icon name="alertTriangle" className="h-5 w-5" />
            Nhật ký rời khỏi màn hình
          </h2>
          <ul className="mt-3 space-y-2">
            {((violations ?? []) as ViolationRow[]).map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-2 text-sm">
                <span className="font-mono text-xs text-rose-600">{formatDateTimeVi(v.occurred_at)}</span>
                <span className="font-semibold text-rose-800">{VIOLATION_LABEL[v.kind] ?? v.kind}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {attempt.teacher_note && (
        <section className="card mt-6 border-2 border-mint-300 bg-mint-50">
          <h2 className="text-lg font-bold text-mint-900">Nhận xét của giáo viên</h2>
          <p className="mt-2 whitespace-pre-wrap text-mint-900">{attempt.teacher_note}</p>
        </section>
      )}
    </AppShell>
  );
}

function EssayReview({ answer }: { answer: AnswerRow | undefined }) {
  if (!answer?.response?.trim()) {
    return <p className="mt-2 text-sm text-slate-500">(không làm bài)</p>;
  }

  const fb = answer.ai_feedback as AiFeedback | null;
  const shownBand = answer.teacher_band ?? answer.ai_band;

  return (
    <div className="mt-3">
      <details className="rounded-2xl bg-slate-50 p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
          <Icon name="fileText" className="h-4 w-4" />
          Bài viết của bạn ({answer.word_count} từ)
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{answer.response}</p>
      </details>

      {shownBand != null && (
        <div className="mt-3 flex items-center gap-3">
          <BandPill band={shownBand} size="md" />
          <span className="text-sm font-semibold text-slate-600">
            {answer.teacher_band != null ? 'Điểm giáo viên duyệt' : 'AI chấm nháp — chờ giáo viên duyệt'}
          </span>
        </div>
      )}

      {fb && (
        <div className="mt-3 space-y-3">
          <p className="rounded-2xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
            {fb.summary_vi}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(fb.criteria ?? {}).map(([key, c]) => (
              <div key={key} className="rounded-2xl border-2 border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">{CRITERIA_LABEL[key] ?? key}</p>
                  <BandPill band={c.band} size="sm" />
                </div>
                <p className="mt-1 text-sm text-slate-700">{c.comment_vi}</p>
              </div>
            ))}
          </div>

          {(fb.fixes ?? []).length > 0 && (
            <div className="rounded-2xl border-2 border-mango-200 bg-mango-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-mango-900">
                <Icon name="penLine" className="h-4 w-4" />
                Một số lỗi nên sửa
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {fb.fixes.map((f, i) => (
                  <li key={i}>
                    <p className="text-rose-700 line-through">{f.original}</p>
                    <p className="font-semibold text-mint-800">{f.better}</p>
                    <p className="text-xs text-slate-600">{f.why_vi}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {answer.teacher_feedback && (
        <p className="mt-3 rounded-2xl bg-mint-50 p-4 text-sm text-mint-900">
          <b>Giáo viên: </b>{answer.teacher_feedback}
        </p>
      )}
    </div>
  );
}
