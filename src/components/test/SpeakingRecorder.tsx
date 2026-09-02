'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';
import { formatClock } from '@/lib/ielts';
import type { Question } from '@/lib/types';

type Phase = 'idle' | 'prep' | 'recording' | 'uploading' | 'done' | 'error';

/**
 * Thu am cho mot cau Speaking: dem gio chuan bi (Part 2 co 1 phut),
 * ghi am toi da speak_seconds giay, roi tai file len Supabase Storage.
 */
export default function SpeakingRecorder({
  question,
  attemptId,
  userId,
  savedAudioUrl,
  onUploaded,
}: {
  question: Question;
  attemptId: string;
  userId: string;
  savedAudioUrl: string | null;
  onUploaded: (path: string) => void;
}) {
  const prepSeconds = question.prep_seconds || 0;
  const maxSeconds = question.speak_seconds || 120;

  const [phase, setPhase] = useState<Phase>(savedAudioUrl ? 'done' : 'idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  function startTimer(from: number, limit: number, onDone: () => void) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(from);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= limit) {
          if (timerRef.current) clearInterval(timerRef.current);
          onDone();
        }
        return next;
      });
    }, 1000);
  }

  async function begin() {
    setError('');
    if (prepSeconds > 0) {
      setPhase('prep');
      startTimer(0, prepSeconds, () => void startRecording());
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void upload();
      recorder.start();
      recorderRef.current = recorder;

      setPhase('recording');
      startTimer(0, maxSeconds, () => stopRecording());
    } catch {
      setError('Không truy cập được micro. Hãy cho phép quyền micro trong trình duyệt rồi thử lại.');
      setPhase('error');
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function upload() {
    setPhase('uploading');
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setPreviewUrl(URL.createObjectURL(blob));

    const path = `${userId}/${attemptId}/${question.id}.webm`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from('speaking-answers')
      .upload(path, blob, { contentType: 'audio/webm', upsert: true });

    if (error) {
      setError(`Không tải được file ghi âm: ${error.message}`);
      setPhase('error');
      return;
    }

    onUploaded(path);
    setPhase('done');
  }

  const remaining =
    phase === 'prep' ? prepSeconds - seconds
    : phase === 'recording' ? maxSeconds - seconds
    : 0;

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
      {phase === 'idle' && (
        <div className="text-center">
          <p className="mb-3 text-sm text-slate-600">
            {prepSeconds > 0
              ? `Bạn có ${prepSeconds} giây chuẩn bị, sau đó nói tối đa ${Math.round(maxSeconds / 60)} phút.`
              : `Bấm để bắt đầu trả lời. Thời gian nói tối đa ${maxSeconds} giây.`}
          </p>
          <button type="button" onClick={begin} className="btn-primary">
            <Icon name="mic" className="h-5 w-5" />
            Bắt đầu
          </button>
        </div>
      )}

      {phase === 'prep' && (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-mango-800">
            <Icon name="clock" className="h-4 w-4" />
            Thời gian chuẩn bị
          </p>
          <p className="font-display text-5xl font-extrabold text-mango-600">{formatClock(remaining)}</p>
          <p className="mt-2 text-sm text-slate-600">Hãy ghi nhanh ý chính, sắp hết giờ là tự động thu âm.</p>
          <button type="button" onClick={() => void startRecording()} className="btn-ghost mt-4 py-2 text-sm">
            Nói luôn, bỏ qua chuẩn bị
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-rose-700" aria-live="polite">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-rose-500" />
            ĐANG GHI ÂM
          </p>
          <p className="font-display text-5xl font-extrabold text-rose-600">{formatClock(remaining)}</p>
          <button type="button" onClick={stopRecording} className="btn-primary mt-4">
            <span className="h-3 w-3 rounded-[2px] bg-current" aria-hidden="true" />
            Dừng và nộp câu này
          </button>
        </div>
      )}

      {phase === 'uploading' && (
        <p className="flex items-center justify-center gap-2 text-center font-bold text-brand-700">
          <Icon name="upload" className="h-5 w-5" />
          Đang tải file ghi âm lên…
        </p>
      )}

      {phase === 'done' && (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 font-bold text-mint-700">
            <Icon name="checkCircle" className="h-5 w-5" />
            Đã ghi âm xong câu này
          </p>
          {previewUrl && <audio controls src={previewUrl} className="mx-auto mt-3 w-full max-w-sm" />}
          <button
            type="button"
            onClick={() => { setPhase('idle'); setSeconds(0); }}
            className="btn-ghost mt-3 py-2 text-sm"
          >
            Ghi âm lại
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="text-center">
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          <button type="button" onClick={() => setPhase('idle')} className="btn-ghost mt-3 py-2 text-sm">
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
