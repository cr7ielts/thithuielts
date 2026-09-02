'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';
import type { Question, QuestionType, Section } from '@/lib/types';

const TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: 'Trắc nghiệm 1 đáp án',
  multi_select: 'Trắc nghiệm nhiều đáp án',
  true_false_notgiven: 'TRUE / FALSE / NOT GIVEN',
  yes_no_notgiven: 'YES / NO / NOT GIVEN',
  matching: 'Nối / chọn từ danh sách',
  fill_blank: 'Điền từ vào chỗ trống',
  short_answer: 'Trả lời ngắn',
  essay: 'Bài viết (Writing)',
  speaking_prompt: 'Câu hỏi nói (Speaking)',
};

const EMPTY_QUESTION = (index: number, skill: string): Question => ({
  id: `new-${Math.random().toString(36).slice(2)}`,
  section_id: '',
  order_index: index,
  number_label: String(index),
  question_type:
    skill === 'writing' ? 'essay' : skill === 'speaking' ? 'speaking_prompt' : 'fill_blank',
  group_title: '',
  prompt: '',
  options: [],
  correct_answers: [],
  points: 1,
  word_limit: skill === 'writing' ? 250 : null,
  prep_seconds: skill === 'speaking' ? 0 : 0,
  speak_seconds: skill === 'speaking' ? 120 : 0,
});

export default function SectionEditor({
  section,
  onChange,
  onDelete,
  onImport,
}: {
  section: Section;
  onChange: (s: Section) => void;
  onDelete: () => void;
  onImport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(section.questions ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  async function patchSection(patch: Partial<Section>) {
    onChange({ ...section, ...patch });
    await fetch('/api/admin/sections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: section.id, ...patch }),
    });
  }

  async function uploadAudio(file: File) {
    setUploading(true);
    const supabase = createClient();
    const path = `${section.exam_id}/${section.id}-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage
      .from('exam-audio')
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) {
      setMessage(`Lỗi tải audio: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('exam-audio').getPublicUrl(path);
    await patchSection({ audio_url: data.publicUrl });
    setUploading(false);
    setMessage('Đã tải audio lên ✓');
    setTimeout(() => setMessage(''), 2500);
  }

  async function saveQuestions(list: Question[]) {
    setSaving(true);
    const res = await fetch('/api/admin/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: section.id, questions: list }),
    });
    setSaving(false);
    setMessage(res.ok ? `Đã lưu ${list.length} câu ✓` : 'Lưu thất bại');
    setTimeout(() => setMessage(''), 2500);
    onChange({ ...section, questions: list });
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuestions((list) => list.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Thu gọn phần này' : 'Mở rộng phần này'}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
        >
          <Icon name="chevronDown" className={`h-5 w-5 transition ${open ? '' : '-rotate-90'}`} />
        </button>
        <input
          className="flex-1 min-w-[180px] rounded-xl border-2 border-transparent px-2 py-1 font-bold text-slate-900 outline-none hover:border-slate-200 focus:border-brand-300"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          onBlur={(e) => void patchSection({ title: e.target.value })}
        />
        <span className="chip bg-slate-100 text-slate-600">{questions.length} câu</span>
        {section.audio_url && (
          <span className="chip bg-mint-100 text-mint-800">
            <Icon name="headphones" className="h-3.5 w-3.5" />
            có audio
          </span>
        )}
        {message && <span className="chip bg-brand-100 text-brand-700">{message}</span>}
        <button onClick={onImport} className="btn-sun py-2 text-sm">
          <Icon name="upload" className="h-4 w-4" />
          Nhập từ Word/PDF
        </button>
        <button onClick={onDelete} className="text-sm font-semibold text-rose-500 hover:underline">Xoá phần</button>
      </div>

      {open && (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <div>
            <label className="label">Câu lệnh chung của phần</label>
            <input
              className="input"
              placeholder="Questions 1–10: Complete the notes below. Write ONE WORD ONLY."
              value={section.instructions ?? ''}
              onChange={(e) => onChange({ ...section, instructions: e.target.value })}
              onBlur={(e) => void patchSection({ instructions: e.target.value })}
            />
          </div>

          {section.skill === 'listening' && (
            <div>
              <label className="label">File nghe (mp3 / m4a)</label>
              <input
                type="file"
                accept="audio/*"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && void uploadAudio(e.target.files[0])}
                className="text-sm"
              />
              {uploading && <p className="mt-1 text-sm text-brand-700">Đang tải lên…</p>}
              {section.audio_url && (
                <audio controls src={section.audio_url} className="mt-2 w-full max-w-md" />
              )}
            </div>
          )}

          {section.skill === 'reading' && (
            <div>
              <label className="label">Bài đọc (passage)</label>
              <textarea
                className="input min-h-[200px] font-mono text-sm"
                placeholder="Dán nguyên văn bài đọc tiếng Anh vào đây…"
                value={section.passage_text ?? ''}
                onChange={(e) => onChange({ ...section, passage_text: e.target.value })}
                onBlur={(e) => void patchSection({ passage_text: e.target.value })}
              />
            </div>
          )}

          {section.skill === 'writing' && (
            <div>
              <label className="label">Ảnh biểu đồ cho Task 1 (dán link ảnh)</label>
              <input
                className="input"
                placeholder="https://…/chart.png"
                value={section.image_url ?? ''}
                onChange={(e) => onChange({ ...section, image_url: e.target.value })}
                onBlur={(e) => void patchSection({ image_url: e.target.value })}
              />
            </div>
          )}

          {/* --------------------------------------------------------- CAU HOI */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="font-bold text-slate-800">Danh sách câu hỏi</h4>
              <button
                onClick={() =>
                  setQuestions((l) => [...l, EMPTY_QUESTION(l.length + 1, section.skill)])
                }
                className="btn-ghost ml-auto py-1.5 text-sm"
              >
                <Icon name="plus" className="h-4 w-4" />
                Thêm câu
              </button>
              <button onClick={() => void saveQuestions(questions)} disabled={saving} className="btn-primary py-1.5 text-sm">
                {saving ? 'Đang lưu…' : 'Lưu câu hỏi'}
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-2xl border-2 border-slate-100 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="w-20 rounded-xl border-2 border-slate-200 px-2 py-1 text-sm font-bold"
                      value={q.number_label}
                      onChange={(e) => updateQuestion(i, { number_label: e.target.value })}
                      placeholder="Số câu"
                    />
                    <select
                      className="rounded-xl border-2 border-slate-200 px-2 py-1 text-sm"
                      value={q.question_type}
                      onChange={(e) => updateQuestion(i, { question_type: e.target.value as QuestionType })}
                    >
                      {Object.entries(TYPE_LABEL).map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                    <input
                      className="flex-1 min-w-[160px] rounded-xl border-2 border-slate-200 px-2 py-1 text-sm"
                      placeholder="Tiêu đề nhóm (Questions 1–5…)"
                      value={q.group_title}
                      onChange={(e) => updateQuestion(i, { group_title: e.target.value })}
                    />
                    <button
                      onClick={() => setQuestions((l) => l.filter((_, x) => x !== i))}
                      className="text-sm font-bold text-rose-500"
                    >
                      Xoá
                    </button>
                  </div>

                  <textarea
                    className="input mt-2 min-h-[70px] text-sm"
                    placeholder="Nội dung câu hỏi / đề bài"
                    value={q.prompt}
                    onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
                  />

                  {['multiple_choice', 'multi_select', 'matching'].includes(q.question_type) && (
                    <textarea
                      className="input mt-2 min-h-[70px] font-mono text-sm"
                      placeholder={'Mỗi lựa chọn một dòng:\nA. …\nB. …'}
                      value={(q.options ?? []).join('\n')}
                      onChange={(e) =>
                        updateQuestion(i, { options: e.target.value.split('\n').filter(Boolean) })
                      }
                    />
                  )}

                  {!['essay', 'speaking_prompt'].includes(q.question_type) && (
                    <input
                      className="input mt-2 text-sm"
                      placeholder="Đáp án đúng — nhiều cách viết thì ngăn bằng dấu | (vd: library|the library)"
                      value={(q.correct_answers ?? []).join('|')}
                      onChange={(e) =>
                        updateQuestion(i, {
                          correct_answers: e.target.value.split('|').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  )}

                  {q.question_type === 'essay' && (
                    <input
                      type="number"
                      className="input mt-2 max-w-[200px] text-sm"
                      placeholder="Số từ tối thiểu"
                      value={q.word_limit ?? ''}
                      onChange={(e) => updateQuestion(i, { word_limit: Number(e.target.value) || null })}
                    />
                  )}

                  {q.question_type === 'speaking_prompt' && (
                    <div className="mt-2 flex gap-2">
                      <label className="text-sm">
                        <span className="label">Giây chuẩn bị</span>
                        <input
                          type="number" className="input max-w-[140px] text-sm"
                          value={q.prep_seconds}
                          onChange={(e) => updateQuestion(i, { prep_seconds: Number(e.target.value) || 0 })}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="label">Giây nói tối đa</span>
                        <input
                          type="number" className="input max-w-[140px] text-sm"
                          value={q.speak_seconds}
                          onChange={(e) => updateQuestion(i, { speak_seconds: Number(e.target.value) || 0 })}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {questions.length === 0 && (
              <p className="text-sm text-slate-600">
                Chưa có câu nào. Bấm “Nhập từ Word/PDF” để tách đề tự động, hoặc “Thêm câu” để gõ tay.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
