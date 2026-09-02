import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BandPill from '@/components/BandPill';
import { getSessionProfile } from '@/lib/supabase/server';
import Icon from '@/components/Icon';
import { formatDateTimeVi, formatDurationVi, SKILL_LABEL } from '@/lib/ielts';
import type { Attempt, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATE_LABEL: Record<string, { text: string; cls: string }> = {
  in_progress: { text: 'Đang làm', cls: 'bg-mango-100 text-mango-800' },
  submitted: { text: 'Đã nộp — chờ chấm', cls: 'bg-slate-100 text-slate-600' },
  ai_graded: { text: 'AI đã chấm nháp', cls: 'bg-brand-100 text-brand-700' },
  graded: { text: 'Giáo viên đã duyệt', cls: 'bg-mint-100 text-mint-800' },
};

export default async function HistoryPage() {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || !profile) redirect('/login');

  const { data: attempts } = await supabase
    .from('attempts')
    .select('*, exams(title)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });

  const list = (attempts ?? []) as (Attempt & { exams: { title: string } | null })[];

  return (
    <AppShell profile={profile as Profile}>
      <h1 className="text-3xl font-extrabold text-slate-900">Lịch sử thi</h1>
      <p className="mt-1 text-slate-600">
        Toàn bộ bài thi của bạn, kèm giờ bắt đầu, giờ nộp và số lần rời khỏi màn hình.
      </p>

      {list.length === 0 ? (
        <div className="card mt-6 text-center">
          <Icon name="seedling" className="mx-auto h-12 w-12 text-mint-500" />
          <p className="mt-3 font-bold text-slate-800">Bạn chưa làm bài thi nào</p>
          <Link href="/exams" className="btn-primary mt-4">Chọn đề thi đầu tiên</Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-2">Đề thi</th>
                <th className="px-4 py-2">Bắt đầu</th>
                <th className="px-4 py-2">Nộp bài</th>
                <th className="px-4 py-2">Thời gian làm</th>
                <th className="px-4 py-2">Rời màn hình</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2 text-center">Band</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const state = STATE_LABEL[a.state] ?? STATE_LABEL.submitted;
                return (
                  <tr key={a.id} className="bg-white shadow-card [&>td]:px-4 [&>td]:py-3">
                    <td className="rounded-l-2xl">
                      <Link href={`/history/${a.id}`} className="font-bold text-slate-900 hover:text-brand-600">
                        {a.exams?.title ?? 'Đề thi'}
                      </Link>
                      <p className="text-xs text-slate-600">
                        {a.mode === 'full' ? 'Full test 4 kỹ năng' : SKILL_LABEL[a.mode]}
                      </p>
                    </td>
                    <td className="text-sm text-slate-700">{formatDateTimeVi(a.started_at)}</td>
                    <td className="text-sm text-slate-600">
                      {formatDateTimeVi(a.submitted_at)}
                      {a.auto_submitted && (
                        <span className="ml-1 chip bg-rose-100 text-rose-700">tự động</span>
                      )}
                    </td>
                    <td className="text-sm text-slate-600">{formatDurationVi(a.time_spent_seconds)}</td>
                    <td>
                      <span className={`chip ${a.violation_count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-mint-100 text-mint-800'}`}>
                        {a.violation_count} lần
                      </span>
                    </td>
                    <td><span className={`chip ${state.cls}`}>{state.text}</span></td>
                    <td className="rounded-r-2xl text-center">
                      <BandPill band={a.band_overall} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
