'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SectionEditor from './SectionEditor';
import ImportExamModal from './ImportExamModal';
import Icon, { SKILL_ICON } from '@/components/Icon';
import { SKILL_LABEL, SKILL_ORDER, skillsOfMode } from '@/lib/ielts';
import type { Exam, ExamMode, Section, Skill } from '@/lib/types';

export default function ExamEditor({
  exam,
  initialSections,
}: {
  exam: Exam;
  initialSections: Section[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [meta, setMeta] = useState(exam);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [importFor, setImportFor] = useState<Section | null>(null);

  const allowedSkills = skillsOfMode(meta.mode as ExamMode);

  async function saveMeta(patch: Partial<Exam>) {
    setSaving(true);
    const next = { ...meta, ...patch };
    setMeta(next);
    await fetch('/api/admin/exams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: exam.id, ...patch }),
    });
    setSaving(false);
    setMessage('Đã lưu ✓');
    setTimeout(() => setMessage(''), 2000);
  }

  async function addSection(skill: Skill) {
    const order = sections.filter((s) => s.skill === skill).length + 1;
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_id: exam.id,
        skill,
        order_index: order,
        title: `${SKILL_LABEL[skill]} ${order}`,
      }),
    });
    const json = await res.json();
    if (json.section) setSections((s) => [...s, { ...json.section, questions: [] }]);
  }

  async function removeSection(sectionId: string) {
    if (!confirm('Xoá phần này cùng toàn bộ câu hỏi bên trong?')) return;
    await fetch('/api/admin/sections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sectionId }),
    });
    setSections((s) => s.filter((x) => x.id !== sectionId));
  }

  async function deleteExam() {
    if (!confirm(`Xoá hẳn đề "${meta.title}"? Mọi bài thi của học sinh với đề này cũng bị xoá.`)) return;
    await fetch('/api/admin/exams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: exam.id }),
    });
    router.push('/admin');
  }

  const questionTotal = sections.reduce((n, s) => n + (s.questions?.length ?? 0), 0);

  return (
    <>
      <div className="card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[260px]">
            <input
              className="w-full border-none bg-transparent font-display text-3xl font-extrabold text-slate-900 outline-none"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              onBlur={(e) => void saveMeta({ title: e.target.value })}
            />
            <input
              className="mt-1 w-full border-none bg-transparent text-slate-600 outline-none"
              placeholder="Mô tả ngắn về đề…"
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              onBlur={(e) => void saveMeta({ description: e.target.value })}
            />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="chip bg-brand-50 text-brand-800">
                <Icon name={meta.mode === 'full' ? 'trophy' : SKILL_ICON[meta.mode as Skill]} className="h-3.5 w-3.5" />
                {meta.mode === 'full' ? 'Full test' : SKILL_LABEL[meta.mode as Skill]}
              </span>
              <span className="chip bg-slate-100 text-slate-600">{sections.length} phần</span>
              <span className="chip bg-slate-100 text-slate-600">{questionTotal} câu hỏi</span>
              {message && <span className="chip bg-mint-100 text-mint-800">{message}</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => void saveMeta({ is_published: !meta.is_published })}
              disabled={saving}
              className={meta.is_published ? 'btn-mint' : 'btn-ghost'}
            >
              <Icon name={meta.is_published ? 'unlock' : 'lock'} className="h-4 w-4" />
              {meta.is_published ? 'Đang mở cho học sinh' : 'Bản nháp — bấm để mở'}
            </button>
            <button onClick={deleteExam} className="text-sm font-semibold text-rose-500 hover:underline">
              Xoá đề này
            </button>
          </div>
        </div>
      </div>

      {!meta.is_published && questionTotal > 0 && (
        <p className="card mt-4 border-2 border-mango-300 bg-mango-50 text-sm font-semibold text-mango-900">
          Đề đang ở chế độ nháp. Bấm “Bản nháp — bấm để mở” ở trên để học sinh nhìn thấy và thi được.
        </p>
      )}

      {/* Cac phan theo tung ky nang */}
      {allowedSkills.map((skill) => {
        const inSkill = sections.filter((s) => s.skill === skill);
        return (
          <section key={skill} className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
                <Icon name={SKILL_ICON[skill]} className="h-6 w-6 text-brand-600" />
                {SKILL_LABEL[skill]}
              </h2>
              <span className="text-sm text-slate-600">{inSkill.length} phần</span>
              <button onClick={() => void addSection(skill)} className="btn-ghost ml-auto py-2 text-sm">
                <Icon name="plus" className="h-4 w-4" />
                Thêm phần {SKILL_LABEL[skill]}
              </button>
            </div>

            {inSkill.length === 0 ? (
              <p className="card text-sm text-slate-600">
                Chưa có phần nào. IELTS chuẩn: Listening 4 sections, Reading 3 passages,
                Writing 2 tasks, Speaking 3 parts.
              </p>
            ) : (
              <div className="space-y-4">
                {inSkill.map((section) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    onChange={(updated) =>
                      setSections((list) => list.map((s) => (s.id === updated.id ? updated : s)))
                    }
                    onDelete={() => void removeSection(section.id)}
                    onImport={() => setImportFor(section)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {SKILL_ORDER.filter((s) => !allowedSkills.includes(s)).length > 0 && (
        <p className="mt-8 text-sm text-slate-500">
          Đề này chỉ gồm {allowedSkills.map((s) => SKILL_LABEL[s]).join(', ')}.
        </p>
      )}

      {importFor && (
        <ImportExamModal
          section={importFor}
          onClose={() => setImportFor(null)}
          onApplied={(updated) => {
            setSections((list) => list.map((s) => (s.id === updated.id ? updated : s)));
            setImportFor(null);
          }}
        />
      )}
    </>
  );
}
