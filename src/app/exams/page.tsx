import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getSessionProfile } from '@/lib/supabase/server';
import Icon, { SKILL_ICON, type IconName } from '@/components/Icon';
import { SKILL_LABEL, SKILL_ORDER, totalDuration } from '@/lib/ielts';
import type { Exam, ExamMode, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FILTERS: { value: string; label: string; icon: IconName }[] = [
  { value: 'all', label: 'Tất cả', icon: 'clipboard' },
  { value: 'full', label: 'Full test', icon: 'trophy' },
  ...SKILL_ORDER.map((s) => ({ value: s, label: SKILL_LABEL[s], icon: SKILL_ICON[s] })),
];

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || !profile) redirect('/login');

  const { mode } = await searchParams;
  const active = mode && FILTERS.some((f) => f.value === mode) ? mode : 'all';

  let query = supabase.from('exams').select('*').eq('is_published', true);
  if (active !== 'all') query = query.eq('mode', active);
  const { data: exams } = await query.order('created_at', { ascending: false });

  return (
    <AppShell profile={profile as Profile}>
      <h1 className="text-3xl font-extrabold text-slate-900">Chọn đề thi</h1>
      <p className="mt-1 text-slate-600">
        Thi trọn bộ 4 kỹ năng như thi thật, hoặc luyện riêng một kỹ năng.
      </p>

      <div className="my-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === 'all' ? '/exams' : `/exams?mode=${f.value}`}
            className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition ${
              active === f.value
                ? 'bg-brand-700 text-white shadow-pop'
                : 'border-2 border-slate-200 bg-white text-slate-600 hover:border-brand-300'
            }`}
            aria-current={active === f.value ? 'page' : undefined}
          >
            <Icon name={f.icon} className="h-4 w-4" />
            {f.label}
          </Link>
        ))}
      </div>

      {(exams ?? []).length === 0 ? (
        <div className="card text-center">
          <Icon name="inbox" className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-bold text-slate-800">Chưa có đề nào ở mục này</p>
          <p className="text-sm text-slate-600">Giáo viên sẽ đăng đề sớm thôi!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(exams as Exam[]).map((exam) => (
            <Link
              key={exam.id}
              href={`/exams/${exam.id}`}
              className="card flex flex-col transition hover:-translate-y-1 hover:shadow-pop"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon name={exam.mode === 'full' ? 'trophy' : SKILL_ICON[exam.mode]} className="h-6 w-6" />
                </span>
                {exam.level_tag && (
                  <span className="chip bg-brand-50 text-brand-700">{exam.level_tag}</span>
                )}
              </div>
              <h2 className="mt-3 text-lg font-bold text-slate-900">{exam.title}</h2>
              {exam.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{exam.description}</p>
              )}
              <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-700">
                <Icon name="clock" className="h-4 w-4" />
                {Math.round(totalDuration(exam.mode as ExamMode) / 60)} phút
                {exam.mode === 'full' && ' • 4 kỹ năng'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
