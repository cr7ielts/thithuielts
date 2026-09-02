import { notFound, redirect } from 'next/navigation';
import TestRunner from '@/components/test/TestRunner';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { skillsOfMode } from '@/lib/ielts';
import type { AnswerRow, Attempt, AttemptSkill, Exam, ExamMode, Question, Section } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TestPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { attemptId } = await params;

  const { data: attempt } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) notFound();
  if (attempt.state !== 'in_progress') redirect(`/history/${attemptId}`);

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', attempt.exam_id)
    .maybeSingle();
  if (!exam) notFound();

  // Bang questions bi khoa voi hoc sinh o tang RLS vi chua cot correct_answers.
  // Doc bang service role sau khi da xac minh bai thi thuoc ve nguoi dang dang nhap,
  // va tuyet doi khong select correct_answers - du lieu nay se di thang ve trinh duyet.
  const admin = createAdminSupabase();
  const { data: sections } = await admin
    .from('sections')
    .select(`
      id, exam_id, skill, order_index, title, instructions,
      audio_url, passage_text, image_url, duration_seconds,
      questions ( id, section_id, order_index, number_label, question_type,
                  group_title, prompt, options, points, word_limit,
                  prep_seconds, speak_seconds )
    `)
    .eq('exam_id', attempt.exam_id)
    .order('order_index');

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId);

  const allowedSkills = skillsOfMode(attempt.mode as ExamMode);

  // Dong ho rieng cua tung ky nang. Bai thi tao truoc khi co tinh nang nay
  // se duoc bo sung day du o lan mo dau tien.
  let { data: skillRows } = await supabase
    .from('attempt_skills')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('order_index');

  if (!skillRows?.length) {
    await supabase.from('attempt_skills').insert(
      allowedSkills.map((skill, i) => ({ attempt_id: attemptId, skill, order_index: i + 1 }))
    );
    ({ data: skillRows } = await supabase
      .from('attempt_skills')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('order_index'));
  }
  const orderedSections = ((sections ?? []) as unknown as Section[])
    .filter((s) => allowedSkills.includes(s.skill))
    .map((s) => ({
      ...s,
      questions: [...(s.questions ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      ) as Question[],
    }))
    .sort(
      (a, b) =>
        allowedSkills.indexOf(a.skill) - allowedSkills.indexOf(b.skill) ||
        a.order_index - b.order_index
    );

  return (
    <TestRunner
      attempt={attempt as Attempt}
      exam={exam as Exam}
      sections={orderedSections}
      savedAnswers={(answers ?? []) as AnswerRow[]}
      skillRows={(skillRows ?? []) as AttemptSkill[]}
      userId={user.id}
    />
  );
}
