'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BandPill from '@/components/BandPill';
import Icon, { SKILL_ICON } from '@/components/Icon';
import { SKILL_LABEL } from '@/lib/ielts';
import type { AiFeedback, AnswerRow, Question, Section } from '@/lib/types';

const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

const CRITERIA_LABEL: Record<string, string> = {
  task_response: 'Task Response',
  coherence_cohesion: 'Coherence & Cohesion',
  lexical_resource: 'Lexical Resource',
  grammatical_range: 'Grammar',
};

interface Item {
  section: Section;
  question: Question;
  answer: AnswerRow | null;
}

export default function GradingForm({
  attemptId,
  items,
  audioLinks,
  initialNote,
}: {
  attemptId: string;
  items: Item[];
  audioLinks: Record<string, string>;
  initialNote: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [scores, setScores] = useState<Record<string, { band: number | null; feedback: string }>>(() => {
    const map: Record<string, { band: number | null; feedback: string }> = {};
    for (const it of items) {
      if (!it.answer) continue;
      map[it.answer.id] = {
        band: it.answer.teacher_band ?? it.answer.ai_band ?? null,
        feedback: it.answer.teacher_feedback ?? '',
      };
    }
    return map;
  });

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        teacherNote: note,
        answers: Object.entries(scores).map(([answerId, v]) => ({
          answerId,
          band: v.band,
          feedback: v.feedback,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  if (!items.length) {
    return (
      <p className="card mt-6 text-sm text-slate-600">
        Đề này không có phần Writing hoặc Speaking nên không cần chấm tay.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-extrabold text-slate-900">Chấm Writing &amp; Speaking</h2>

      <div className="mt-4 space-y-5">
        {items.map((it) => {
          const a = it.answer;
          const fb = a?.ai_feedback as AiFeedback | null;
          const current = a ? scores[a.id] : null;

          return (
            <div key={it.question.id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-brand-50 text-brand-800">
                  <Icon name={SKILL_ICON[it.section.skill]} className="h-3.5 w-3.5" />
                  {SKILL_LABEL[it.section.skill]}
                </span>
                <span className="font-bold text-slate-800">
                  {it.question.number_label} — {it.section.title}
                </span>
                {a?.ai_band != null && (
                  <span className="chip bg-slate-100 text-slate-600">AI chấm nháp: {a.ai_band.toFixed(1)}</span>
                )}
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{it.question.prompt}</p>

              {/* Bai lam */}
              {it.section.skill === 'speaking' ? (
                a && audioLinks[a.id] ? (
                  <audio controls src={audioLinks[a.id]} className="mt-3 w-full max-w-lg" />
                ) : (
                  <p className="mt-3 text-sm text-rose-600">Học sinh không nộp bản ghi âm.</p>
                )
              ) : a?.response?.trim() ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase text-slate-600">
                    Bài viết • {a.word_count} từ
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{a.response}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-rose-600">Học sinh không làm phần này.</p>
              )}

              {/* Nhan xet AI */}
              {fb && (
                <details className="mt-3 rounded-2xl border-2 border-brand-100 bg-brand-50 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-brand-800">
                    Xem bản chấm nháp của AI
                  </summary>
                  <p className="mt-2 text-sm text-brand-900">{fb.summary_vi}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {Object.entries(fb.criteria ?? {}).map(([k, c]) => (
                      <div key={k} className="rounded-xl bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">{CRITERIA_LABEL[k] ?? k}</span>
                          <BandPill band={c.band} size="sm" />
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{c.comment_vi}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Cham diem */}
              {a && current && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="label">Band giáo viên duyệt</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() =>
                          setScores((s) => ({ ...s, [a.id]: { ...s[a.id], band: b } }))
                        }
                        className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                          current.band === b
                            ? 'bg-brand-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-brand-100'
                        }`}
                      >
                        {b.toFixed(1)}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="input mt-3 min-h-[90px] text-sm"
                    placeholder="Nhận xét gửi cho học sinh…"
                    value={current.feedback}
                    onChange={(e) =>
                      setScores((s) => ({ ...s, [a.id]: { ...s[a.id], feedback: e.target.value } }))
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card mt-6">
        <label className="label">Nhận xét chung cho cả bài thi</label>
        <textarea
          className="input min-h-[110px]"
          placeholder="Em làm tốt phần Reading, cần luyện thêm Task 2…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button onClick={save} disabled={saving} className="btn-primary mt-4 w-full">
          {saving ? 'Đang lưu…' : done ? 'Đã chốt điểm — lưu lại lần nữa' : 'Chốt điểm và gửi cho học sinh'}
        </button>
        {done && (
          <p className="mt-2 text-center text-sm font-semibold text-mint-700">
            Đã lưu. Học sinh xem được điểm và nhận xét ngay bây giờ.
          </p>
        )}
      </div>
    </div>
  );
}
