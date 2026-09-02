import Anthropic from '@anthropic-ai/sdk';
import type { AiFeedback } from './types';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

/** Cau truc JSON bat buoc cua ket qua cham. */
const FEEDBACK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['criteria', 'overall_band', 'summary_vi', 'summary_en', 'fixes'],
  properties: {
    criteria: {
      type: 'object',
      additionalProperties: false,
      required: ['task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range'],
      properties: Object.fromEntries(
        ['task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range'].map((k) => [
          k,
          {
            type: 'object',
            additionalProperties: false,
            required: ['band', 'comment_vi', 'comment_en'],
            properties: {
              band: { type: 'number', description: 'Band 0-9, buoc nhay 0.5' },
              comment_vi: { type: 'string', description: 'Nhan xet tieng Viet, 2-3 cau' },
              comment_en: { type: 'string', description: 'Nhan xet tieng Anh, 1-2 cau' },
            },
          },
        ])
      ),
    },
    overall_band: { type: 'number', description: 'Band tong cua bai viet, buoc nhay 0.5' },
    summary_vi: { type: 'string', description: 'Tom tat tieng Viet cho hoc sinh, 3-5 cau' },
    summary_en: { type: 'string', description: 'Tom tat tieng Anh, 2-3 cau' },
    fixes: {
      type: 'array',
      description: 'Toi da 5 loi tieu bieu kem cach sua',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['original', 'better', 'why_vi'],
        properties: {
          original: { type: 'string' },
          better: { type: 'string' },
          why_vi: { type: 'string' },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Bạn là giám khảo IELTS Writing có kinh nghiệm chấm thi thật.
Chấm bài theo đúng 4 band descriptor chính thức của IELTS:
- Task Achievement / Task Response
- Coherence and Cohesion
- Lexical Resource
- Grammatical Range and Accuracy

Nguyên tắc:
- Chấm đúng thực lực, không nới tay. Bài dưới số từ tối thiểu bị trừ điểm Task Response.
- Band chỉ nhận giá trị bước 0.5 (vd 5.0, 5.5, 6.0).
- overall_band là trung bình 4 tiêu chí, làm tròn theo quy tắc IELTS (.25 lên .5, .75 lên 1.0).
- Nhận xét tiếng Việt viết cho học sinh Việt Nam, cụ thể và dễ hiểu, tránh nói chung chung.
- Phần fixes chỉ nêu lỗi thật sự có trong bài, trích đúng nguyên văn của học sinh.

Đây là bản chấm nháp — giáo viên sẽ duyệt lại, nên hãy nêu rõ căn cứ cho mỗi band.`;

export async function gradeWriting(input: {
  taskPrompt: string;
  essay: string;
  wordLimit: number | null;
  taskLabel: string;
}): Promise<AiFeedback> {
  const client = new Anthropic();

  const wordCount = input.essay.trim().split(/\s+/).filter(Boolean).length;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: 'json_schema', schema: FEEDBACK_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [
      {
        role: 'user',
        content: [
          `## ${input.taskLabel}`,
          '',
          '### Đề bài',
          input.taskPrompt,
          '',
          `### Yêu cầu số từ tối thiểu: ${input.wordLimit ?? 'không quy định'}`,
          `### Số từ học sinh viết: ${wordCount}`,
          '',
          '### Bài làm của học sinh',
          input.essay,
        ].join('\n'),
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return JSON.parse(text) as AiFeedback;
}
