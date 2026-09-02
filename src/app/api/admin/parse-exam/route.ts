import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { requireStaff } from '@/lib/admin-guard';
import { parseExamText } from '@/lib/exam-parser';

export const maxDuration = 300;

/**
 * Nhan noi dung de dan tu Word/PDF (hoac file .docx tai len) va tra ve
 * cau truc section + questions de giao vien soat lai truoc khi luu.
 */
export async function POST(request: Request) {
  const guard = await requireStaff();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Chưa cấu hình ANTHROPIC_API_KEY nên không dùng được chức năng nhập tự động. Bạn có thể gõ tay câu hỏi.' },
      { status: 400 }
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  let rawText = '';
  let skill = 'reading';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    skill = String(form.get('skill') ?? 'reading');
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Chưa chọn file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (file.name.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = buffer.toString('utf-8');
    }
  } else {
    const body = await request.json();
    rawText = String(body.text ?? '');
    skill = String(body.skill ?? 'reading');
  }

  if (rawText.trim().length < 40) {
    return NextResponse.json({ error: 'Nội dung quá ngắn, chưa đủ để tách đề.' }, { status: 400 });
  }

  try {
    const parsed = await parseExamText(rawText, skill);
    return NextResponse.json({ parsed });
  } catch (err) {
    console.error('parse-exam failed', err);
    return NextResponse.json(
      { error: 'Không tách được đề. Bạn thử dán ít nội dung hơn (từng phần một) hoặc nhập tay.' },
      { status: 500 }
    );
  }
}
