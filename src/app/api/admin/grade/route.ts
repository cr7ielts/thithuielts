import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-guard';
import { finalOverallBand, roundBand } from '@/lib/ielts';
import type { ExamMode } from '@/lib/types';

/** Giao vien duyet diem Writing / Speaking va chot band tong. */
export async function POST(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { attemptId, answers, teacherNote } = (await request.json()) as {
    attemptId: string;
    answers: { answerId: string; band: number | null; feedback: string }[];
    teacherNote: string;
  };

  const { data: attempt } = await guard.admin
    .from('attempts')
    .select('id, mode, band_listening, band_reading')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt) return NextResponse.json({ error: 'Không tìm thấy bài thi' }, { status: 404 });

  for (const a of answers) {
    await guard.admin
      .from('answers')
      .update({ teacher_band: a.band, teacher_feedback: a.feedback })
      .eq('id', a.answerId);
  }

  // Tinh lai band tung ky nang tu diem giao vien vua cham
  const { data: rows } = await guard.admin
    .from('answers')
    .select('teacher_band, ai_band, question_id, questions(question_type, sections(skill))')
    .eq('attempt_id', attemptId);

  const bySkill: Record<string, number[]> = { writing: [], speaking: [] };
  for (const r of rows ?? []) {
    const skill = (r as unknown as { questions: { sections: { skill: string } } }).questions?.sections?.skill;
    if (skill !== 'writing' && skill !== 'speaking') continue;
    const band = r.teacher_band ?? r.ai_band;
    if (band != null) bySkill[skill].push(Number(band));
  }

  const avg = (list: number[]) =>
    list.length ? roundBand(list.reduce((a, b) => a + b, 0) / list.length) : null;

  // Trung binh deu cac task Writing (Task 1 va Task 2 co trong so bang nhau).
  const writingBand = avg(bySkill.writing);
  const speakingBand = avg(bySkill.speaking);

  const { error } = await guard.admin
    .from('attempts')
    .update({
      band_writing: writingBand,
      band_speaking: speakingBand,
      band_overall: finalOverallBand(attempt.mode as ExamMode, {
        listening: attempt.band_listening,
        reading: attempt.band_reading,
        writing: writingBand,
        speaking: speakingBand,
      }),
      teacher_note: teacherNote,
      state: 'graded',
      graded_by: guard.user.id,
      graded_at: new Date().toISOString(),
    })
    .eq('id', attemptId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, writingBand, speakingBand });
}
