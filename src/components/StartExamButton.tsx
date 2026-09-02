'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { useRouter } from 'next/navigation';
import type { ExamMode } from '@/lib/types';

export default function StartExamButton({
  examId,
  mode,
  existingAttemptId,
}: {
  examId: string;
  mode: ExamMode;
  existingAttemptId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    if (existingAttemptId) {
      router.push(`/test/${existingAttemptId}`);
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, mode }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Không tạo được bài thi. Bạn thử lại nhé.');
      setLoading(false);
      return;
    }
    router.push(`/test/${json.attemptId}`);
  }

  return (
    <div className="mt-4">
      <button onClick={start} disabled={loading} className="btn-primary w-full text-base">
        {!loading && <Icon name={existingAttemptId ? 'clock' : 'play'} className="h-5 w-5" />}
        {loading ? 'Đang mở phòng thi…' : existingAttemptId ? 'Tiếp tục bài đang làm' : 'Bắt đầu thi'}
      </button>
      {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <p className="mt-2 text-center text-xs text-slate-500">
        Đồng hồ bắt đầu chạy ngay khi bạn bấm nút này.
      </p>
    </div>
  );
}
