'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';

/** Tu dong goi AI cham nhap phan Writing ngay khi HS mo trang ket qua. */
export default function AiGradeTrigger({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'running' | 'done' | 'skipped' | 'error'>('running');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/ai-grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
        });
        const json = await res.json();
        if (cancelled) return;

        if (json.skipped) setStatus('skipped');
        else if (json.ok) { setStatus('done'); router.refresh(); }
        else setStatus('error');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [attemptId, router]);

  if (status === 'skipped') return null;

  return (
    <div className="card mt-4 flex items-center gap-4 border-2 border-brand-200 bg-brand-50">
      <Icon
        name={status === 'running' ? 'cpu' : status === 'done' ? 'checkCircle' : 'alertTriangle'}
        className={`h-8 w-8 ${status === 'running' ? 'animate-pulse text-brand-600' : status === 'done' ? 'text-mint-600' : 'text-mango-600'}`}
      />
      <div>
        <p className="font-bold text-brand-900">
          {status === 'running' && 'AI đang chấm nháp phần Writing…'}
          {status === 'done' && 'AI đã chấm xong phần Writing'}
          {status === 'error' && 'Chưa chấm được phần Writing'}
        </p>
        <p className="text-sm text-brand-800">
          {status === 'running' && 'Việc này mất khoảng 20–40 giây, bạn đợi một chút nhé.'}
          {status === 'done' && 'Giáo viên sẽ duyệt lại điểm cuối cùng.'}
          {status === 'error' && 'Giáo viên sẽ chấm trực tiếp bài của bạn.'}
        </p>
      </div>
    </div>
  );
}
