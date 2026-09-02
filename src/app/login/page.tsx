'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message.includes('Invalid login')
          ? 'Email hoặc mật khẩu chưa đúng. Bạn thử lại nhé!'
          : error.message.includes('Email not confirmed')
            ? 'Bạn cần bấm vào link xác nhận trong email trước khi đăng nhập.'
            : error.message
      );
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card animate-pop w-full max-w-md">
      <div className="mb-6 text-center">
        <Icon name="logIn" className="mx-auto h-12 w-12 text-brand-600" />
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Chào mừng trở lại!</h1>
        <p className="text-sm text-slate-600">Đăng nhập để vào phòng thi</p>
      </div>

      <label className="label" htmlFor="email">Email</label>
      <input
        id="email" type="email" required autoComplete="email" className="input"
        placeholder="hocsinh@gmail.com"
        value={email} onChange={(e) => setEmail(e.target.value)}
      />

      <label className="label mt-4" htmlFor="password">Mật khẩu</label>
      <input
        id="password" type="password" required autoComplete="current-password" className="input"
        placeholder="••••••••"
        value={password} onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
        {loading ? 'Đang vào...' : 'Đăng nhập'}
      </button>

      <p className="mt-5 text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="font-bold text-brand-700 hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <Suspense fallback={<div className="card w-full max-w-md text-center">Đang tải…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
