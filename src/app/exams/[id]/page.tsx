import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StartExamButton from '@/components/StartExamButton';
import { getSessionProfile, createAdminSupabase } from '@/lib/supabase/server';
import Icon, { SKILL_ICON } from '@/components/Icon';
import {
  MAX_VIOLATIONS, SKILL_DURATION, SKILL_LABEL, skillsOfMode, totalDuration,
} from '@/lib/ielts';
import type { Exam, ExamMode, Profile, Section } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || !profile) redirect('/login');

  const { id } = await params;

  const { data: exam } = await supabase.from('exams').select('*').eq('id', id).maybeSingle();
  if (!exam) notFound();

  // questions bi khoa voi hoc sinh o tang RLS, nen dem so cau bang service role.
  const admin = createAdminSupabase();
  const { data: sections } = await admin
    .from('sections')
    .select('*, questions(id)')
    .eq('exam_id', id)
    .order('order_index');

  const list = (sections ?? []) as (Section & { questions: { id: string }[] })[];
  const skills = skillsOfMode(exam.mode as ExamMode);

  const { data: existing } = await supabase
    .from('attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('exam_id', id)
    .eq('state', 'in_progress')
    .maybeSingle();

  return (
    <AppShell profile={profile as Profile}>
      <Link href="/exams" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Quay lại danh sách đề
      </Link>

      <div className="card mt-4">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-700">
            <Icon name={exam.mode === 'full' ? 'trophy' : SKILL_ICON[exam.mode as keyof typeof SKILL_ICON]} className="h-9 w-9" />
          </span>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-slate-900">{(exam as Exam).title}</h1>
            <p className="mt-1 text-slate-600">{(exam as Exam).description || 'Đề thi thử IELTS'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip bg-brand-50 text-brand-800">
                <Icon name="clock" className="h-3.5 w-3.5" />
                {Math.round(totalDuration(exam.mode as ExamMode) / 60)} phút
              </span>
              {(exam as Exam).level_tag && (
                <span className="chip bg-mango-100 text-mango-800">{(exam as Exam).level_tag}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <section>
          <h2 className="mb-3 text-xl font-bold text-slate-900">Cấu trúc bài thi</h2>
          <div className="space-y-4">
            {skills.map((skill) => {
              const inSkill = list.filter((s) => s.skill === skill);
              const questionCount = inSkill.reduce((n, s) => n + (s.questions?.length ?? 0), 0);
              return (
                <div key={skill} className="card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon name={SKILL_ICON[skill]} className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{SKILL_LABEL[skill]}</p>
                      <p className="text-sm text-slate-600">
                        {inSkill.length} phần • {questionCount} câu • {Math.round(SKILL_DURATION[skill] / 60)} phút
                      </p>
                    </div>
                    {questionCount === 0 && (
                      <span className="chip bg-rose-50 text-rose-600">Chưa có câu hỏi</span>
                    )}
                  </div>
                  {inSkill.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                      {inSkill.map((s) => (
                        <li key={s.id}>• {s.title || `Phần ${s.order_index}`}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card border-2 border-mango-300 bg-mango-50">
            <h2 className="flex items-center gap-2 text-lg font-bold text-mango-900">
              <Icon name="shieldAlert" className="h-5 w-5" />
              Quy định phòng thi
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-mango-900">
              <li>• Bài thi chạy ở chế độ <b>toàn màn hình</b>.</li>
              <li>• Không chuyển tab, không thu nhỏ cửa sổ, không mở ứng dụng khác.</li>
              <li>• Mỗi lần rời màn hình đều được ghi lại. Quá <b>{MAX_VIOLATIONS} lần</b>, hệ thống <b>tự động nộp bài</b>.</li>
              <li>• Không sao chép, dán hay dùng chuột phải trong lúc thi.</li>
              <li>• Hết giờ, bài sẽ tự nộp — nhớ canh thời gian nhé!</li>
            </ul>
          </div>

          <div className="card">
            <p className="text-sm text-slate-600">
              Hệ thống sẽ ghi lại <b>giờ bắt đầu</b> và <b>giờ nộp bài</b> của bạn.
              Listening &amp; Reading chấm tự động ngay; Writing &amp; Speaking sẽ có nhận xét
              của AI trước, giáo viên duyệt lại sau.
            </p>
            <StartExamButton
              examId={id}
              mode={exam.mode as ExamMode}
              existingAttemptId={existing?.id ?? null}
            />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
