import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import GradingForm from '@/components/admin/GradingForm';
import { getSessionProfile, createAdminSupabase } from '@/lib/supabase/server';
import { formatDateTimeVi, formatDurationVi, SKILL_LABEL, VIOLATION_LABEL } from '@/lib/ielts';
import type { AnswerRow, Attempt, Exam, Profile, Question, Section, ViolationRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function GradingPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect('/login');
  if (profile.role !== 'teacher' && profile.role !== 'admin') redirect('/dashboard');

  const { attemptId } = await params;
  const admin = createAdminSupabase();

  const { data: attempt } = await admin
    .from('attempts')
    .select('*, exams(*), profiles(full_name, email, class_name)')
    .eq('id', attemptId)
    .maybeSingle();
  if (!attempt) notFound();

  const { data: sections } = await admin
    .from('sections')
    .select('*, questions(*)')
    .eq('exam_id', attempt.exam_id)
    .in('skill', ['writing', 'speaking'])
    .order('order_index');

  const { data: answers } = await admin.from('answers').select('*').eq('attempt_id', attemptId);
  const { data: violations } = await admin
    .from('violations').select('*').eq('attempt_id', attemptId).order('occurred_at');

  // Tao link nghe file ghi am (bucket rieng tu, dung signed URL)
  const audioLinks: Record<string, string> = {};
  for (const a of (answers ?? []) as AnswerRow[]) {
    if (!a.audio_url) continue;
    const { data } = await admin.storage
      .from('speaking-answers')
      .createSignedUrl(a.audio_url, 60 * 60 * 6);
    if (data?.signedUrl) audioLinks[a.id] = data.signedUrl;
  }

  const student = attempt.profiles as { full_name: string; email: string; class_name: string } | null;
  const exam = attempt.exams as Exam;

  const items = ((sections ?? []) as unknown as Section[]).flatMap((s) =>
    (s.questions ?? []).map((q: Question) => ({
      section: s,
      question: q,
      answer: ((answers ?? []) as AnswerRow[]).find((a) => a.question_id === q.id) ?? null,
    }))
  );

  return (
    <AppShell profile={profile as Profile}>
      <Link href="/admin" className="text-sm font-bold text-brand-600 hover:underline">← Trang quản trị</Link>

      <div className="card mt-4">
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl font-extrabold text-slate-900">{student?.full_name ?? 'Học sinh'}</h1>
            <p className="text-slate-600">{student?.email} • {student?.class_name || 'chưa có lớp'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {exam.title} — {attempt.mode === 'full' ? 'Full test' : SKILL_LABEL[attempt.mode as keyof typeof SKILL_LABEL]}
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <p><b>Bắt đầu:</b> {formatDateTimeVi(attempt.started_at)}</p>
            <p><b>Nộp bài:</b> {formatDateTimeVi(attempt.submitted_at)}</p>
            <p><b>Thời gian làm:</b> {formatDurationVi(attempt.time_spent_seconds)}</p>
            <p className={attempt.violation_count > 0 ? 'font-bold text-rose-600' : ''}>
              <b>Rời màn hình:</b> {attempt.violation_count} lần
              {attempt.auto_submitted && ' (bài bị tự động nộp)'}
            </p>
          </div>
        </div>

        {(violations ?? []).length > 0 && (
          <details className="mt-4 rounded-2xl bg-rose-50 p-4">
            <summary className="cursor-pointer font-bold text-rose-800">
              Xem nhật ký {(violations ?? []).length} lần rời màn hình
            </summary>
            <ul className="mt-2 space-y-1 text-sm text-rose-800">
              {((violations ?? []) as ViolationRow[]).map((v) => (
                <li key={v.id}>
                  {formatDateTimeVi(v.occurred_at)} — {VIOLATION_LABEL[v.kind] ?? v.kind}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {(['listening', 'reading', 'writing', 'speaking'] as const).map((s) => (
          <div key={s} className="card text-center">
            <p className="text-xs font-bold uppercase text-slate-600">{SKILL_LABEL[s]}</p>
            <p className="font-display text-2xl font-extrabold text-slate-800">
              {(attempt[`band_${s}` as keyof Attempt] as number | null)?.toFixed(1) ?? '—'}
            </p>
          </div>
        ))}
      </div>

      <GradingForm
        attemptId={attemptId}
        items={items}
        audioLinks={audioLinks}
        initialNote={attempt.teacher_note ?? ''}
      />
    </AppShell>
  );
}
