import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BandPill from '@/components/BandPill';
import { getSessionProfile } from '@/lib/supabase/server';
import Icon, { SKILL_ICON } from '@/components/Icon';
import { formatDateTimeVi, SKILL_ORDER, SKILL_LABEL, SKILL_VI } from '@/lib/ielts';
import type { Attempt, Exam, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || !profile) redirect('/login');

  const [{ data: attempts }, { data: exams }] = await Promise.all([
    supabase
      .from('attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5),
    supabase
      .from('exams')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const list = (attempts ?? []) as Attempt[];
  const graded = list.filter((a) => a.band_overall != null);
  const best = graded.length ? Math.max(...graded.map((a) => a.band_overall!)) : null;
  const inProgress = list.find((a) => a.state === 'in_progress');

  return (
    <AppShell profile={profile as Profile}>
      <div className="card mb-6 flex flex-wrap items-center gap-6 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="flex-1 min-w-[240px]">
          <p className="text-brand-100">Xin chào,</p>
          <h1 className="text-3xl font-extrabold">Chào {profile.full_name}</h1>
          <p className="mt-1 text-brand-100">
            {list.length === 0
              ? 'Bạn chưa làm bài thi nào. Cùng bắt đầu bài đầu tiên nhé!'
              : `Bạn đã hoàn thành ${graded.length} bài thi. Cố lên nào!`}
          </p>
        </div>
        <div className="rounded-3xl bg-white/15 px-6 py-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-100">Band cao nhất</p>
          <p className="font-display text-4xl font-extrabold">{best?.toFixed(1) ?? '—'}</p>
        </div>
      </div>

      {inProgress && (
        <div className="card mb-6 flex flex-wrap items-center gap-4 border-2 border-mango-300 bg-mango-50">
          <Icon name="clock" className="h-8 w-8 text-mango-700" />
          <div className="flex-1">
            <p className="font-bold text-mango-900">Bạn có một bài thi đang làm dở</p>
            <p className="text-sm text-mango-800">Bắt đầu lúc {formatDateTimeVi(inProgress.started_at)}</p>
          </div>
          <Link href={`/test/${inProgress.id}`} className="btn-sun">
            <Icon name="play" className="h-4 w-4" />
            Tiếp tục làm bài
          </Link>
        </div>
      )}

      <h2 className="mb-3 text-xl font-bold text-slate-900">Luyện nhanh từng kỹ năng</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SKILL_ORDER.map((skill) => (
          <Link
            key={skill}
            href={`/exams?mode=${skill}`}
            className="card transition hover:-translate-y-1 hover:shadow-pop"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name={SKILL_ICON[skill]} className="h-6 w-6" />
            </div>
            <p className="mt-3 font-bold text-slate-900">{SKILL_LABEL[skill]}</p>
            <p className="text-sm text-slate-600">{SKILL_VI[skill]}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Đề mới nhất</h2>
            <Link href="/exams" className="text-sm font-bold text-brand-600 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="space-y-3">
            {(exams ?? []).length === 0 && (
              <p className="card text-sm text-slate-500">Chưa có đề nào được xuất bản.</p>
            )}
            {((exams ?? []) as Exam[]).map((exam) => (
              <Link key={exam.id} href={`/exams/${exam.id}`} className="card block transition hover:shadow-pop">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon name={exam.mode === 'full' ? 'trophy' : SKILL_ICON[exam.mode]} className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{exam.title}</p>
                    <p className="text-sm text-slate-600">
                      {exam.mode === 'full' ? 'Full test 4 kỹ năng' : `Chỉ ${SKILL_LABEL[exam.mode]}`}
                      {exam.level_tag && ` • ${exam.level_tag}`}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Bài thi gần đây</h2>
            <Link href="/history" className="text-sm font-bold text-brand-600 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="space-y-3">
            {list.length === 0 && <p className="card text-sm text-slate-500">Chưa có lịch sử thi.</p>}
            {list.map((a) => (
              <Link key={a.id} href={`/history/${a.id}`} className="card flex items-center gap-3 transition hover:shadow-pop">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    {a.mode === 'full' ? 'Full test' : SKILL_LABEL[a.mode]}
                  </p>
                  <p className="text-sm text-slate-600">{formatDateTimeVi(a.started_at)}</p>
                </div>
                {a.state === 'in_progress'
                  ? <span className="chip bg-mango-100 text-mango-800">Đang làm</span>
                  : <BandPill band={a.band_overall} size="sm" />}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
