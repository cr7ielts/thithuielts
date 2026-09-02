import Link from 'next/link';
import Icon, { type IconName } from '@/components/Icon';
import type { Profile } from '@/lib/types';

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Trang chính', icon: 'home' },
  { href: '/exams', label: 'Đề thi', icon: 'clipboard' },
  { href: '/history', label: 'Lịch sử thi', icon: 'chartBar' },
];

export default function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const isStaff = profile.role === 'teacher' || profile.role === 'admin';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-xl font-extrabold text-brand-700">
            <Icon name="trophy" className="h-6 w-6" />
            <span className="hidden sm:inline">IELTS Mock Test</span>
            <span className="sm:hidden">IELTS</span>
          </Link>

          <nav className="ml-4 hidden gap-1 sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <Icon name={l.icon} className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
            {isStaff && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-mango-700 transition hover:bg-mango-50"
              >
                <Icon name="wrench" className="h-4 w-4" />
                Quản trị
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-tight text-slate-800">{profile.full_name}</p>
              <p className="text-xs text-slate-600">
                {profile.role === 'admin' ? 'Quản trị viên' : profile.role === 'teacher' ? 'Giáo viên' : profile.class_name || 'Học sinh'}
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <button className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-5 py-2 sm:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600">
              <Icon name={l.icon} className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
          {isStaff && (
            <Link href="/admin" className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold text-mango-700">
              <Icon name="wrench" className="h-4 w-4" />
              Quản trị
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
