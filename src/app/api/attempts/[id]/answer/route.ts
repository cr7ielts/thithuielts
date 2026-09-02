import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { countWords } from '@/lib/ielts';

/** Luu tam cau tra loi. Duoc goi lien tuc trong luc HS lam bai (autosave). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { id: attemptId } = await params;
  const body = (await request.json()) as {
    answers: { questionId: string; response?: string; audioUrl?: string }[];
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

  // Tach lam hai nhom: upsert chi ghi de nhung cot co trong payload, nen cau
  // tra loi bang chu se khong xoa mat file ghi am da luu truoc do.
  const textRows = body.answers
    .filter((a) => a.audioUrl === undefined)
    .map((a) => ({
      attempt_id: attemptId,
      question_id: a.questionId,
      response: a.response ?? '',
      word_count: countWords(a.response ?? ''),
      updated_at: new Date().toISOString(),
    }));

  const audioRows = body.answers
    .filter((a) => a.audioUrl !== undefined)
    .map((a) => ({
      attempt_id: attemptId,
      question_id: a.questionId,
      response: a.response ?? '',
      audio_url: a.audioUrl,
      word_count: countWords(a.response ?? ''),
      updated_at: new Date().toISOString(),
    }));

  for (const rows of [textRows, audioRows]) {
    if (!rows.length) continue;
    const { error } = await supabase
      .from('answers')
      .upsert(rows, { onConflict: 'attempt_id,question_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
