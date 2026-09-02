import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-guard';

export async function POST(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json();

  const { data, error } = await guard.admin
    .from('exams')
    .insert({
      title: body.title,
      description: body.description ?? '',
      mode: body.mode ?? 'full',
      level_tag: body.level_tag ?? '',
      is_published: false,
      created_by: guard.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ examId: data.id });
}

export async function PATCH(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id, ...patch } = await request.json();
  const { error } = await guard.admin.from('exams').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await request.json();
  const { error } = await guard.admin.from('exams').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
