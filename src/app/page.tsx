import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import Icon, { SKILL_ICON, type IconName } from '@/components/Icon';
import { SKILL_LABEL, SKILL_ORDER, SKILL_VI, SKILL_DURATION } from '@/lib/ielts';

export default async function HomePage() {
  const { user } = await getSessionProfile();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <nav className="mb-14 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold text-brand-700 sm:text-2xl">
          <Icon name="trophy" className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="hidden sm:inline">IELTS Mock Test</span>
          <span className="sm:hidden">IELTS</span>
        </span>
        <div className="flex shrink-0 gap-2">
          {user ? (
            <Link href="/dashboard" className="btn-primary whitespace-nowrap px-4 py-2.5 text-sm">
              Vào lớp học
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost whitespace-nowrap px-4 py-2.5 text-sm">
                Đăng nhập
              </Link>
              <Link href="/register" className="btn-primary whitespace-nowrap px-4 py-2.5 text-sm">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="text-center">
        <span className="chip bg-mango-100 text-mango-800">
          <Icon name="sparkles" className="h-3.5 w-3.5" />
          Thi thử như thi thật
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl md:text-5xl">
          Luyện IELTS đủ <span className="text-brand-600">4 kỹ năng</span>,
          <br /> chấm điểm ngay sau khi nộp
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
          Bấm giờ chuẩn phòng thi, tự động quy đổi band Listening &amp; Reading,
          Writing &amp; Speaking được AI chấm nháp rồi giáo viên duyệt lại.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={user ? '/exams' : '/register'} className="btn-primary text-base">
            <Icon name="play" className="h-5 w-5" />
            Bắt đầu thi thử
          </Link>
          <Link href={user ? '/history' : '/login'} className="btn-ghost text-base">
            <Icon name="chartBar" className="h-5 w-5" />
            Xem kết quả
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SKILL_ORDER.map((skill, i) => (
          <div
            key={skill}
            className="card animate-pop text-center"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name={SKILL_ICON[skill]} className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-xl font-bold text-slate-900">{SKILL_LABEL[skill]}</h3>
            <p className="text-sm text-slate-600">{SKILL_VI[skill]}</p>
            <p className="mt-2 text-xs font-semibold text-brand-700">
              {Math.round(SKILL_DURATION[skill] / 60)} phút
            </p>
          </div>
        ))}
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {([
          { icon: 'clock', title: 'Ghi lại toàn bộ lịch sử', text: 'Lưu giờ bắt đầu, giờ nộp bài, tổng thời gian làm và số lần rời khỏi màn hình.' },
          { icon: 'shield', title: 'Giám sát khi thi', text: 'Bắt buộc toàn màn hình. Rời màn hình quá 3 lần, hệ thống tự động nộp bài.' },
          { icon: 'cpu', title: 'AI chấm nháp + GV duyệt', text: 'Writing được AI chấm theo 4 tiêu chí, giáo viên duyệt lại điểm cuối.' },
        ] as { icon: IconName; title: string; text: string }[]).map((f) => (
          <div key={f.title} className="card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 text-mint-700">
              <Icon name={f.icon} className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="mt-20 pb-8 text-center text-sm text-slate-500">
        Chúc bạn ôn thi vui vẻ và đạt band mơ ước!
      </footer>
    </main>
  );
}
