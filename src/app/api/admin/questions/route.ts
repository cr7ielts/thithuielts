import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-guard';

/** Ghi de toan bo danh sach cau hoi cua mot section. */
export async function PUT(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { section_id, questions } = (await request.json()) as {
    section_id: string;
    questions: Record<string, unknown>[];
  };

  const { error: delError } = await guard.admin
    .from('questions')
    .delete()
    .eq('section_id', section_id);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  if (!questions.length) return NextResponse.json({ ok: true, count: 0 });

  const rows = questions.map((q, i) => ({
    section_id,
    order_index: i + 1,
    number_label: String(q.number_label ?? i + 1),
    question_type: q.question_type ?? 'fill_blank',
    group_title: q.group_title ?? '',
    prompt: q.prompt ?? '',
    options: q.options ?? [],
    correct_answers: q.correct_answers ?? [],
    points: q.points ?? 1,
    word_limit: q.word_limit ?? null,
    prep_seconds: q.prep_seconds ?? 0,
    speak_seconds: q.speak_seconds ?? 0,
  }));

  const { error } = await guard.admin.from('questions').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}
