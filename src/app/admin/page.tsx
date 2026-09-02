import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BandPill from '@/components/BandPill';
import { getSessionProfile, createAdminSupabase } from '@/lib/supabase/server';
import Icon, { SKILL_ICON, type IconName } from '@/components/Icon';
import { formatDateTimeVi, SKILL_LABEL } from '@/lib/ielts';
import type { Attempt, Exam, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect('/login');
  if (profile.role !== 'teacher' && profile.role !== 'admin') redirect('/dashboard');

  const admin = createAdminSupabase();

  const [{ data: exams }, { data: pending }, { count: studentCount }] = await Promise.all([
    admin.from('exams').select('*').order('created_at', { ascending: false }),
    admin
      .from('attempts')
      .select('*, exams(title), profiles(full_name, class_name)')
      .in('state', ['submitted', 'ai_graded'])
      .order('submitted_at', { ascending: false })
      .limit(30),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
  ]);

  const examList = (exams ?? []) as Exam[];
  const pendingList = (pending ?? []) as (Attempt & {
    exams: { title: string } | null;
    profiles: { full_name: string; class_name: string } | null;
  })[];

  return (
    <AppShell profile={profile as Profile}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900">Trang quản trị</h1>
          <p className="mt-1 text-slate-600">Tạo đề, quản lý học sinh và duyệt điểm Writing / Speaking.</p>
        </div>
        <Link href="/admin/exams/new" className="btn-primary">
          <Icon name="plus" className="h-5 w-5" />
          Tạo đề mới
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {([
          { icon: 'clipboard', label: 'Tổng số đề', value: examList.length },
          { icon: 'user', label: 'Học sinh', value: studentCount ?? 0 },
          { icon: 'fileText', label: 'Bài chờ duyệt điểm', value: pendingList.length },
        ] as { icon: IconName; label: string; value: number }[]).map((s) => (
          <div key={s.label} className="card">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name={s.icon} className="h-6 w-6" />
            </span>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-600">{s.label}</p>
            <p className="font-display text-3xl font-extrabold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-2xl font-extrabold text-slate-900">Bài chờ chấm / duyệt điểm</h2>
      {pendingList.length === 0 ? (
        <p className="card mt-3 text-sm text-slate-600">Không có bài nào đang chờ.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {pendingList.map((a) => (
            <Link
              key={a.id}
              href={`/admin/grading/${a.id}`}
              className="card flex flex-wrap items-center gap-4 transition hover:shadow-pop"
            >
              <div className="flex-1 min-w-[200px]">
                <p className="font-bold text-slate-900">{a.profiles?.full_name ?? 'Học sinh'}</p>
                <p className="text-sm text-slate-600">
                  {a.profiles?.class_name || '—'} • {a.exams?.title}
                </p>
              </div>
              <p className="text-sm text-slate-600">{formatDateTimeVi(a.submitted_at)}</p>
              {a.violation_count > 0 && (
                <span className="chip bg-rose-100 text-rose-700">
                  <Icon name="alertTriangle" className="h-3.5 w-3.5" />
                  {a.violation_count} lần rời màn hình
                </span>
              )}
              <span className={`chip ${a.state === 'ai_graded' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                {a.state === 'ai_graded' ? 'AI đã chấm nháp' : 'Chưa chấm'}
              </span>
              <BandPill band={a.band_overall} size="sm" />
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-2xl font-extrabold text-slate-900">Ngân hàng đề</h2>
      {examList.length === 0 ? (
        <div className="card mt-3 text-center">
          <Icon name="inbox" className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 font-bold text-slate-800">Chưa có đề nào</p>
          <Link href="/admin/exams/new" className="btn-primary mt-4">Tạo đề đầu tiên</Link>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {examList.map((exam) => (
            <Link key={exam.id} href={`/admin/exams/${exam.id}`} className="card transition hover:shadow-pop">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon name={exam.mode === 'full' ? 'trophy' : SKILL_ICON[exam.mode as keyof typeof SKILL_ICON]} className="h-6 w-6" />
                </span>
                <span className={`chip ${exam.is_published ? 'bg-mint-100 text-mint-800' : 'bg-slate-100 text-slate-500'}`}>
                  {exam.is_published ? 'Đang mở' : 'Bản nháp'}
                </span>
              </div>
              <p className="mt-3 font-bold text-slate-900">{exam.title}</p>
              <p className="text-sm text-slate-600">
                {exam.mode === 'full' ? 'Full test 4 kỹ năng' : SKILL_LABEL[exam.mode as keyof typeof SKILL_LABEL]}
                {exam.level_tag && ` • ${exam.level_tag}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
