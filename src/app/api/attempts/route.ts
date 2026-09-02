import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { skillsOfMode, totalDuration } from '@/lib/ielts';
import type { ExamMode } from '@/lib/types';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { examId } = (await request.json()) as { examId: string };

  const { data: exam } = await supabase
    .from('exams')
    .select('id, mode, is_published')
    .eq('id', examId)
    .maybeSingle();

  if (!exam || !exam.is_published) {
    return NextResponse.json({ error: 'Đề thi không tồn tại hoặc chưa được mở.' }, { status: 404 });
  }

  // Neu dang co bai lam do cho de nay thi quay lai bai do
  const { data: existing } = await supabase
    .from('attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .eq('state', 'in_progress')
    .maybeSingle();

  if (existing) return NextResponse.json({ attemptId: existing.id, resumed: true });

  const mode = exam.mode as ExamMode;
  const startedAt = new Date();
  const deadlineAt = new Date(startedAt.getTime() + totalDuration(mode) * 1000);

  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert({
      user_id: user.id,
      exam_id: examId,
      mode,
      state: 'in_progress',
      started_at: startedAt.toISOString(),
      // Moc chan tren cho ca bai; tung ky nang co dong ho rieng trong attempt_skills.
      deadline_at: deadlineAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Moi ky nang mot dong ho rieng - chi bat dau chay khi HS bam vao ky nang do.
  const { error: skillError } = await supabase.from('attempt_skills').insert(
    skillsOfMode(mode).map((skill, i) => ({
      attempt_id: attempt.id,
      skill,
      order_index: i + 1,
    }))
  );

  if (skillError) {
    await supabase.from('attempts').delete().eq('id', attempt.id);
    return NextResponse.json({ error: skillError.message }, { status: 500 });
  }

  return NextResponse.json({ attemptId: attempt.id });
}
