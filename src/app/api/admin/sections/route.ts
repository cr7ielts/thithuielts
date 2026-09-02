import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-guard';

export async function POST(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json();
  const { data, error } = await guard.admin
    .from('sections')
    .insert({
      exam_id: body.exam_id,
      skill: body.skill,
      order_index: body.order_index ?? 1,
      title: body.title ?? '',
      instructions: body.instructions ?? '',
      audio_url: body.audio_url ?? null,
      passage_text: body.passage_text ?? null,
      image_url: body.image_url ?? null,
      duration_seconds: body.duration_seconds ?? 0,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}

export async function PATCH(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id, ...patch } = await request.json();
  const { error } = await guard.admin.from('sections').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await request.json();
  const { error } = await guard.admin.from('sections').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
