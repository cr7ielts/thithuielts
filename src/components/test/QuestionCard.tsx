'use client';

import Icon from '@/components/Icon';
import SpeakingRecorder from './SpeakingRecorder';
import { countWords } from '@/lib/ielts';
import type { Question } from '@/lib/types';

const TFNG_OPTIONS = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YNNG_OPTIONS = ['YES', 'NO', 'NOT GIVEN'];

export default function QuestionCard({
  question,
  value,
  audioUrl,
  onChange,
  onAudio,
  attemptId,
  userId,
}: {
  question: Question;
  value: string;
  audioUrl: string | null;
  onChange: (v: string) => void;
  onAudio: (path: string) => void;
  attemptId: string;
  userId: string;
}) {
  const q = question;

  function radioGroup(options: string[]) {
    return (
      <div className="mt-2 grid gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 transition ${
                selected
                  ? 'border-brand-400 bg-brand-50 font-semibold text-brand-800'
                  : 'border-slate-200 bg-white hover:border-brand-200'
              }`}
            >
              <input
                type="radio"
                name={q.id}
                className="h-4 w-4 accent-brand-500"
                checked={selected}
                onChange={() => onChange(opt)}
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
    );
  }

  function checkboxGroup(options: string[]) {
    const picked = value ? value.split('|').filter(Boolean) : [];
    return (
      <div className="mt-2 grid gap-2">
        {options.map((opt) => {
          const selected = picked.includes(opt);
          return (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 transition ${
                selected
                  ? 'border-brand-400 bg-brand-50 font-semibold text-brand-800'
                  : 'border-slate-200 bg-white hover:border-brand-200'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-500"
                checked={selected}
                onChange={() =>
                  onChange(
                    (selected ? picked.filter((p) => p !== opt) : [...picked, opt]).join('|')
                  )
                }
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
    );
  }

  function body() {
    switch (q.question_type) {
      case 'multiple_choice':
      case 'matching':
        return radioGroup(q.options ?? []);
      case 'multi_select':
        return checkboxGroup(q.options ?? []);
      case 'true_false_notgiven':
        return radioGroup(TFNG_OPTIONS);
      case 'yes_no_notgiven':
        return radioGroup(YNNG_OPTIONS);
      case 'fill_blank':
      case 'short_answer':
        return (
          <input
            className="input mt-2"
            placeholder="Nhập câu trả lời…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'essay': {
        const words = countWords(value);
        const limit = q.word_limit ?? 0;
        return (
          <div className="mt-2">
            <textarea
              className="input min-h-[340px] resize-y leading-relaxed"
              placeholder="Viết bài của bạn tại đây…"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <p
              aria-live="polite"
              className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${
                limit && words < limit ? 'text-rose-700' : 'text-mint-700'
              }`}
            >
              {limit != null && words >= limit && <Icon name="checkCircle" className="h-4 w-4" />}
              {words} từ{limit ? ` / tối thiểu ${limit} từ` : ''}
              {limit && words < limit ? ' — viết thiếu số từ sẽ bị trừ điểm' : ''}
            </p>
          </div>
        );
      }
      case 'speaking_prompt':
        return (
          <div className="mt-3">
            <SpeakingRecorder
              question={q}
              attemptId={attemptId}
              userId={userId}
              savedAudioUrl={audioUrl}
              onUploaded={onAudio}
            />
          </div>
        );
      default:
        return (
          <input
            className="input mt-2"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  const answered = q.question_type === 'speaking_prompt' ? Boolean(audioUrl) : Boolean(value.trim());

  return (
    <div id={`q-${q.id}`} className="scroll-mt-28 rounded-3xl border-2 border-slate-100 bg-white/90 p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-sm font-extrabold ${
            answered ? 'bg-mint-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {q.number_label || q.order_index}
        </span>
        <div className="flex-1">
          <p className="whitespace-pre-wrap font-medium leading-relaxed text-slate-800">{q.prompt}</p>
          {body()}
        </div>
      </div>
    </div>
  );
}
