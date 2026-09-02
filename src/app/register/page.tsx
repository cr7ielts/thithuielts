'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', className: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState<'none' | 'confirm' | 'signed_in'>('none');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) return setError('Mật khẩu cần ít nhất 6 ký tự.');
    if (form.password !== form.confirm) return setError('Hai ô mật khẩu chưa khớp nhau.');

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, class_name: form.className },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(
        error.message.includes('already registered')
          ? 'Email này đã có tài khoản rồi. Bạn đăng nhập nhé!'
          : error.message
      );
      setLoading(false);
      return;
    }

    // Neu Supabase bat xac nhan email thi chua co session
    if (data.session) {
      setDone('signed_in');
      router.push('/dashboard');
      router.refresh();
    } else {
      setDone('confirm');
      setLoading(false);
    }
  }

  if (done === 'confirm') {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="card animate-pop w-full max-w-md text-center">
          <Icon name="inbox" className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Kiểm tra email nhé!</h1>
          <p className="mt-2 text-slate-600">
            Chúng tôi vừa gửi link xác nhận tới <b>{form.email}</b>.
            Bấm vào link đó rồi quay lại đăng nhập.
          </p>
          <Link href="/login" className="btn-primary mt-6 w-full">Tới trang đăng nhập</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <form onSubmit={handleSubmit} className="card animate-pop w-full max-w-md">
        <div className="mb-6 text-center">
          <Icon name="user" className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Tạo tài khoản</h1>
          <p className="text-sm text-slate-600">Miễn phí — bắt đầu thi thử ngay hôm nay</p>
        </div>

        <label className="label" htmlFor="fullName">Họ và tên</label>
        <input id="fullName" required className="input" placeholder="Nguyễn Văn A"
               value={form.fullName} onChange={set('fullName')} />

        <label className="label mt-4" htmlFor="className">Lớp / Trung tâm <span className="font-normal text-slate-500">(không bắt buộc)</span></label>
        <input id="className" className="input" placeholder="IELTS 6.5 — Ca tối T3-T5"
               value={form.className} onChange={set('className')} />

        <label className="label mt-4" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" className="input"
               placeholder="hocsinh@gmail.com" value={form.email} onChange={set('email')} />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Mật khẩu</label>
            <input id="password" type="password" required autoComplete="new-password" className="input"
                   placeholder="Từ 6 ký tự" value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Nhập lại</label>
            <input id="confirm" type="password" required autoComplete="new-password" className="input"
                   placeholder="••••••••" value={form.confirm} onChange={set('confirm')} />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-bold text-brand-700 hover:underline">Đăng nhập</Link>
        </p>
      </form>
    </main>
  );
}
