'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon, { SKILL_ICON, type IconName } from '@/components/Icon';
import { SKILL_LABEL, SKILL_ORDER } from '@/lib/ielts';
import type { ExamMode } from '@/lib/types';

const MODES: { value: ExamMode; label: string; icon: IconName }[] = [
  { value: 'full', label: 'Full test (4 kỹ năng)', icon: 'trophy' },
  ...SKILL_ORDER.map((s) => ({ value: s as ExamMode, label: `Chỉ ${SKILL_LABEL[s]}`, icon: SKILL_ICON[s] })),
];

export default function NewExamForm() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', level_tag: '', mode: 'full' as ExamMode });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (!res.ok) { setError(json.error); setLoading(false); return; }
    router.push(`/admin/exams/${json.examId}`);
  }

  return (
    <form onSubmit={submit} className="card">
      <label className="label" htmlFor="title">Tên đề</label>
      <input id="title" required className="input" placeholder="Cambridge IELTS 18 — Test 1"
             value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

      <label className="label mt-4" htmlFor="desc">Mô tả ngắn</label>
      <input id="desc" className="input" placeholder="Đề thi thử tháng 9 cho lớp 6.5"
             value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <label className="label mt-4" htmlFor="tag">Nhãn trình độ</label>
      <input id="tag" className="input" placeholder="Band 5.0 – 6.5"
             value={form.level_tag} onChange={(e) => setForm({ ...form, level_tag: e.target.value })} />

      <p className="label mt-5">Hình thức thi</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODES.map((m) => (
          <label key={m.value}
                 className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition ${
                   form.mode === m.value ? 'border-brand-400 bg-brand-50 font-semibold' : 'border-slate-200'
                 }`}>
            <input type="radio" name="mode" className="h-4 w-4 accent-brand-500"
                   checked={form.mode === m.value}
                   onChange={() => setForm({ ...form, mode: m.value })} />
            <Icon name={m.icon} className="h-5 w-5 text-brand-600" />
            <span>{m.label}</span>
          </label>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
        {loading ? 'Đang tạo…' : 'Tạo đề và thêm câu hỏi'}
      </button>
    </form>
  );
}
