import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import NewExamForm from '@/components/admin/NewExamForm';
import { getSessionProfile } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewExamPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect('/login');
  if (profile.role !== 'teacher' && profile.role !== 'admin') redirect('/dashboard');

  return (
    <AppShell profile={profile as Profile}>
      <h1 className="text-3xl font-extrabold text-slate-900">Tạo đề mới</h1>
      <p className="mt-1 text-slate-600">Đặt tên đề trước, sau đó thêm từng phần và câu hỏi.</p>
      <div className="mt-6 max-w-xl">
        <NewExamForm />
      </div>
    </AppShell>
  );
}
