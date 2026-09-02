import { notFound, redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ExamEditor from '@/components/admin/ExamEditor';
import { getSessionProfile, createAdminSupabase } from '@/lib/supabase/server';
import type { Exam, Profile, Question, Section } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect('/login');
  if (profile.role !== 'teacher' && profile.role !== 'admin') redirect('/dashboard');

  const { id } = await params;
  const admin = createAdminSupabase();

  const { data: exam } = await admin.from('exams').select('*').eq('id', id).maybeSingle();
  if (!exam) notFound();

  const { data: sections } = await admin
    .from('sections')
    .select('*, questions(*)')
    .eq('exam_id', id)
    .order('order_index');

  const list = ((sections ?? []) as unknown as Section[]).map((s) => ({
    ...s,
    questions: [...(s.questions ?? [])].sort((a, b) => a.order_index - b.order_index) as Question[],
  }));

  return (
    <AppShell profile={profile as Profile}>
      <ExamEditor exam={exam as Exam} initialSections={list} />
    </AppShell>
  );
}
