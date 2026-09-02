import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import type { ExamMode } from '@/lib/types';
import { gradeWriting } from '@/lib/ai-grader';
import { finalOverallBand, roundBand } from '@/lib/ielts';

export const maxDuration = 300;

/**
 * AI cham nhap phan Writing cua mot bai thi da nop.
 * Speaking khong cham tu dong - giao vien nghe file ghi am va cham truc tiep.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Chưa cấu hình ANTHROPIC_API_KEY nên bỏ qua bước AI chấm nháp.', skipped: true },
      { status: 200 }
    );
  }

  const { attemptId } = (await request.json()) as { attemptId: string };
  const admin = createAdminSupabase();

  const { data: attempt } = await admin
    .from('attempts')
    .select('id, user_id, exam_id, mode, state, band_listening, band_reading, band_writing, band_speaking')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt) return NextResponse.json({ error: 'Không tìm thấy bài thi' }, { status: 404 });

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isStaff = me?.role === 'teacher' || me?.role === 'admin';
  if (attempt.user_id !== user.id && !isStaff) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  if (attempt.state === 'in_progress') {
    return NextResponse.json({ error: 'Bài thi chưa nộp' }, { status: 409 });
  }

  // Lay cac cau tu luan Writing chua duoc AI cham
  const { data: sections } = await admin
    .from('sections')
    .select('id, title')
    .eq('exam_id', attempt.exam_id)
    .eq('skill', 'writing');

  const sectionIds = (sections ?? []).map((s) => s.id as string);
  if (!sectionIds.length) return NextResponse.json({ ok: true, graded: 0 });

  const { data: questions } = await admin
    .from('questions')
    .select('id, prompt, word_limit, number_label, section_id')
    .in('section_id', sectionIds)
    .eq('question_type', 'essay');

  const { data: answers } = await admin
    .from('answers')
    .select('id, question_id, response, ai_band')
    .eq('attempt_id', attemptId)
    .in('question_id', (questions ?? []).map((q) => q.id as string));

  const bands: number[] = [];
  let graded = 0;

  for (const q of questions ?? []) {
    const answer = (answers ?? []).find((a) => a.question_id === q.id);
    if (!answer || !answer.response?.trim()) continue;

    if (answer.ai_band != null) {
      bands.push(Number(answer.ai_band));
      continue;
    }

    try {
      const feedback = await gradeWriting({
        taskPrompt: q.prompt as string,
        essay: answer.response as string,
        wordLimit: (q.word_limit as number | null) ?? null,
        taskLabel: (q.number_label as string) || 'Writing Task',
      });

      await admin
        .from('answers')
        .update({ ai_band: feedback.overall_band, ai_feedback: feedback })
        .eq('id', answer.id);

      bands.push(feedback.overall_band);
      graded += 1;
    } catch (err) {
      console.error('AI grading failed for answer', answer.id, err);
    }
  }

  if (bands.length) {
    // Trung binh deu cac task Writing (Task 1 va Task 2 co trong so bang nhau).
    const writingBand = roundBand(bands.reduce((a, b) => a + b, 0) / bands.length);

    await admin
      .from('attempts')
      .update({
        band_writing: writingBand,
        state: 'ai_graded',
        band_overall: finalOverallBand(attempt.mode as ExamMode, {
          listening: attempt.band_listening,
          reading: attempt.band_reading,
          writing: writingBand,
          speaking: attempt.band_speaking,
        }),
      })
      .eq('id', attemptId);
  }

  return NextResponse.json({ ok: true, graded });
}
