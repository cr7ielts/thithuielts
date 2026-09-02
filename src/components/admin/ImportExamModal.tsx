'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import type { ParsedSection } from '@/lib/exam-parser';
import type { Question, Section } from '@/lib/types';

/**
 * Dan noi dung de tu Word/PDF (hoac tai file .docx) -> Claude tach thanh
 * cau hoi + dap an -> giao vien soat lai -> luu vao section.
 */
export default function ImportExamModal({
  section,
  onClose,
  onApplied,
}: {
  section: Section;
  onClose: () => void;
  onApplied: (s: Section) => void;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ParsedSection | null>(null);

  async function parseFromText() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/parse-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, skill: section.skill }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setParsed(json.parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tách được đề');
    } finally {
      setLoading(false);
    }
  }

  async function parseFromFile(file: File) {
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('skill', section.skill);
      const res = await fetch('/api/admin/parse-exam', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setParsed(json.parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được file');
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!parsed) return;
    setLoading(true);

    // Cap nhat thong tin phan (bai doc, cau lenh)
    const patch: Partial<Section> = {
      title: parsed.title || section.title,
      instructions: parsed.instructions || section.instructions,
      ...(parsed.passage_text ? { passage_text: parsed.passage_text } : {}),
    };
    await fetch('/api/admin/sections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: section.id, ...patch }),
    });

    await fetch('/api/admin/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: section.id, questions: parsed.questions }),
    });

    const questions = parsed.questions.map((q, i) => ({
      ...q,
      id: `imported-${i}`,
      section_id: section.id,
      order_index: i + 1,
      points: 1,
      prep_seconds: 0,
      speak_seconds: q.question_type === 'speaking_prompt' ? 120 : 0,
      word_limit: q.word_limit ?? null,
    })) as unknown as Question[];

    onApplied({ ...section, ...patch, questions });
  }

  const noAnswerCount = parsed?.questions.filter(
    (q) => !['essay', 'speaking_prompt'].includes(q.question_type) && q.correct_answers.length === 0
  ).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/70 p-5">
      <div className="card my-6 w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Icon name="upload" className="h-6 w-6 text-brand-600" />
            Nhập đề từ Word / PDF
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ nhập đề"
            className="ml-auto rounded-lg px-2 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {!parsed ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Mở file Word/PDF, bôi đen toàn bộ phần đề (kèm đáp án nếu có) rồi dán vào ô dưới.
              Hoặc tải thẳng file <b>.docx</b> lên. Nên nhập từng phần một để kết quả chính xác.
            </p>

            <div className="mt-4">
              <label className="label">Tải file .docx</label>
              <input
                type="file" accept=".docx,.txt"
                onChange={(e) => e.target.files?.[0] && void parseFromFile(e.target.files[0])}
                className="text-sm"
              />
            </div>

            <label className="label mt-4">Hoặc dán nội dung đề</label>
            <textarea
              className="input min-h-[280px] font-mono text-sm"
              placeholder={'READING PASSAGE 1\n\nYou should spend about 20 minutes…\n\nQuestions 1–5\nDo the following statements agree…\n\n1  The museum was built in 1890.\n…\n\nANSWERS\n1. TRUE\n2. FALSE'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            {error && <p role="alert" className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

            <button onClick={parseFromText} disabled={loading || text.trim().length < 40} className="btn-primary mt-4 w-full">
              {loading ? 'Đang tách đề… (20–60 giây)' : 'Tách thành câu hỏi'}
            </button>
          </>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip bg-mint-100 text-mint-800">Tách được {parsed.questions.length} câu</span>
              {noAnswerCount > 0 && (
                <span className="chip bg-mango-100 text-mango-800">{noAnswerCount} câu chưa có đáp án</span>
              )}
              {parsed.passage_text && (
                <span className="chip bg-brand-50 text-brand-700">Có bài đọc {parsed.passage_text.length} ký tự</span>
              )}
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Xem qua kết quả rồi bấm áp dụng. Sau khi áp dụng bạn vẫn sửa được từng câu trong phần chỉnh sửa.
            </p>

            <div className="mt-3 max-h-[45vh] space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-4">
              {parsed.questions.map((q, i) => (
                <div key={i} className="rounded-xl bg-white p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="chip bg-slate-100 text-slate-600">{q.number_label}</span>
                    <span className="text-xs font-semibold text-slate-600">{q.question_type}</span>
                  </div>
                  <p className="mt-1 text-slate-800">{q.prompt}</p>
                  {q.options.length > 0 && (
                    <ul className="mt-1 text-xs text-slate-500">
                      {q.options.map((o, j) => <li key={j}>{o}</li>)}
                    </ul>
                  )}
                  <p className={`mt-1 text-xs font-bold ${q.correct_answers.length ? 'text-mint-700' : 'text-mango-700'}`}>
                    Đáp án: {q.correct_answers.join(' / ') || '(chưa có — cần nhập tay)'}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={() => setParsed(null)} className="btn-ghost flex-1">Nhập lại</button>
              <button onClick={apply} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Đang lưu…' : `Áp dụng ${parsed.questions.length} câu vào phần này`}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-rose-600">
              Lưu ý: thao tác này thay thế toàn bộ câu hỏi hiện có của phần.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
