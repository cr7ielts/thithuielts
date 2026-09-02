import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { SKILL_DURATION } from '@/lib/ielts';
import type { Skill } from '@/lib/types';

/**
 * Mo hoac dong dong ho cua mot ky nang trong bai thi.
 *
 * action 'start'    - HS bam bat dau ky nang; dong ho rieng cua ky nang chay tu luc nay.
 * action 'complete' - HS nop xong ky nang (hoac het gio) va chuyen sang ky nang sau.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { id: attemptId } = await params;
  const { skill, action, autoClosed } = (await request.json()) as {
    skill: Skill;
    action: 'start' | 'complete';
    autoClosed?: boolean;
  };

  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, user_id, state')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Không tìm thấy bài thi' }, { status: 404 });
  }
  if (attempt.state !== 'in_progress') {
    return NextResponse.json({ error: 'Bài thi đã nộp' }, { status: 409 });
  }

  const { data: row } = await supabase
    .from('attempt_skills')
    .select('*')
    .eq('attempt_id', attemptId)
    .eq('skill', skill)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: 'Kỹ năng không thuộc bài thi này' }, { status: 404 });

  if (action === 'start') {
    // Vao lai giua chung thi giu nguyen moc het gio cu - khong duoc gia han.
    if (row.started_at) return NextResponse.json({ skill: row });

    const now = new Date();
    const deadline = new Date(now.getTime() + SKILL_DURATION[skill] * 1000);

    const { data: updated, error } = await supabase
      .from('attempt_skills')
      .update({ started_at: now.toISOString(), deadline_at: deadline.toISOString() })
      .eq('id', row.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ skill: updated });
  }

  if (row.completed_at) return NextResponse.json({ skill: row });

  const { data: updated, error } = await supabase
    .from('attempt_skills')
    .update({ completed_at: new Date().toISOString(), auto_closed: Boolean(autoClosed) })
    .eq('id', row.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skill: updated });
}
