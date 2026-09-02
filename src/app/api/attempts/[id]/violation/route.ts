import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { MAX_VIOLATIONS } from '@/lib/ielts';

/**
 * Ghi nhan mot lan HS roi khoi man hinh thi.
 * Tra ve so lan da vi pham va co phai tu dong nop bai hay khong.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { id: attemptId } = await params;
  const { kind, detail } = (await request.json()) as { kind: string; detail?: string };

  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, user_id, state, violation_count')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Không tìm thấy bài thi' }, { status: 404 });
  }
  if (attempt.state !== 'in_progress') {
    return NextResponse.json({ count: attempt.violation_count, shouldAutoSubmit: false });
  }

  await supabase.from('violations').insert({
    attempt_id: attemptId,
    kind,
    detail: detail ?? '',
  });

  const count = attempt.violation_count + 1;
  await supabase.from('attempts').update({ violation_count: count }).eq('id', attemptId);

  return NextResponse.json({
    count,
    remaining: Math.max(0, MAX_VIOLATIONS - count),
    shouldAutoSubmit: count >= MAX_VIOLATIONS,
  });
}
