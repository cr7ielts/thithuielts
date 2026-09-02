import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { finalOverallBand, isAnswerCorrect, rawToBand, skillsOfMode } from '@/lib/ielts';
import type { ExamMode, Skill } from '@/lib/types';

/**
 * Nop bai: cham tu dong Listening & Reading, ghi lai gio nop va thoi gian lam bai.
 * Writing & Speaking chua co band o buoc nay - AI cham nhap va giao vien duyet sau.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { id: attemptId } = await params;
  const { reason } = (await request.json().catch(() => ({}))) as { reason?: string };

  const { data: attempt } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Không tìm thấy bài thi' }, { status: 404 });
  }
  if (attempt.state !== 'in_progress') {
    return NextResponse.json({ ok: true, alreadySubmitted: true });
  }

  // Dung service role de doc dap an dung (khong bao gio gui ve trinh duyet HS).
  const admin = createAdminSupabase();

  const { data: sections } = await admin
    .from('sections')
    .select('id, skill')
    .eq('exam_id', attempt.exam_id);

  const sectionSkill = new Map<string, Skill>(
    (sections ?? []).map((s) => [s.id as string, s.skill as Skill])
  );

  const { data: questions } = await admin
    .from('questions')
    .select('id, section_id, question_type, correct_answers, points')
    .in('section_id', Array.from(sectionSkill.keys()));

  const { data: answers } = await admin
    .from('answers')
    .select('id, question_id, response')
    .eq('attempt_id', attemptId);

  const answerByQuestion = new Map(
    (answers ?? []).map((a) => [a.question_id as string, a])
  );

  const totals: Record<string, { raw: number; count: number }> = {
    listening: { raw: 0, count: 0 },
    reading: { raw: 0, count: 0 },
  };

  const updates: { id: string; is_correct: boolean; points_awarded: number }[] = [];

  for (const q of questions ?? []) {
    const skill = sectionSkill.get(q.section_id as string);
    if (skill !== 'listening' && skill !== 'reading') continue;

    totals[skill].count += 1;

    const given = answerByQuestion.get(q.id as string);
    const correct = isAnswerCorrect(
      given?.response ?? '',
      (q.correct_answers as string[]) ?? []
    );

    if (correct) totals[skill].raw += Number(q.points) || 1;
    if (given) {
      updates.push({
        id: given.id as string,
        is_correct: correct,
        points_awarded: correct ? Number(q.points) || 1 : 0,
      });
    }
  }

  for (const u of updates) {
    await admin
      .from('answers')
      .update({ is_correct: u.is_correct, points_awarded: u.points_awarded })
      .eq('id', u.id);
  }

  const skills = skillsOfMode(attempt.mode as ExamMode);
  const bandListening = skills.includes('listening') && totals.listening.count
    ? rawToBand(totals.listening.raw, totals.listening.count, 'listening')
    : null;
  const bandReading = skills.includes('reading') && totals.reading.count
    ? rawToBand(totals.reading.raw, totals.reading.count, 'reading')
    : null;

  const submittedAt = new Date();
  const startedAt = new Date(attempt.started_at);
  const timeSpent = Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000);

  const needsHumanGrading = skills.some((s) => s === 'writing' || s === 'speaking');
  const finalBand = finalOverallBand(attempt.mode as ExamMode, {
    listening: bandListening,
    reading: bandReading,
    writing: null,
    speaking: null,
  });

  const { error } = await admin
    .from('attempts')
    .update({
      state: 'submitted',
      submitted_at: submittedAt.toISOString(),
      time_spent_seconds: timeSpent,
      raw_listening: skills.includes('listening') ? totals.listening.raw : null,
      raw_reading: skills.includes('reading') ? totals.reading.raw : null,
      band_listening: bandListening,
      band_reading: bandReading,
      // Chi chot band tong khi moi ky nang cua de deu da co band
      band_overall: finalBand,
      auto_submitted: Boolean(reason),
      auto_submit_reason: reason ?? null,
    })
    .eq('id', attemptId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    bandListening,
    bandReading,
    needsHumanGrading,
    timeSpent,
  });
}
