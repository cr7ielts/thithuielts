import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

const QUESTION_TYPES = [
  'multiple_choice', 'multi_select', 'true_false_notgiven', 'yes_no_notgiven',
  'matching', 'fill_blank', 'short_answer', 'essay', 'speaking_prompt',
];

const PARSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'instructions', 'passage_text', 'questions'],
  properties: {
    title: { type: 'string', description: 'Ten phan, vd "Reading Passage 1" hoac "Section 2"' },
    instructions: { type: 'string', description: 'Cau lenh chung cua phan, de trong neu khong co' },
    passage_text: {
      type: 'string',
      description: 'Bai doc Reading day du. De chuoi rong neu khong phai Reading.',
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['number_label', 'question_type', 'group_title', 'prompt', 'options', 'correct_answers'],
        properties: {
          number_label: { type: 'string', description: 'So cau, vd "1", "14", "Task 2"' },
          question_type: { type: 'string', enum: QUESTION_TYPES },
          group_title: { type: 'string', description: 'Tieu de nhom cau hoi, vd "Questions 1-5"' },
          prompt: { type: 'string', description: 'Noi dung cau hoi' },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cac lua chon, giu nguyen nhan "A. ...". Mang rong neu khong phai trac nghiem.',
          },
          correct_answers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Dap an dung. Nhieu cach viet dung thi liet ke nhieu phan tu. Rong neu la essay/speaking.',
          },
          word_limit: { type: ['integer', 'null'], description: 'Chi dung cho essay: 150 hoac 250' },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Bạn là trợ lý số hoá đề thi IELTS. Người dùng dán nội dung đề (copy từ Word/PDF),
nhiệm vụ của bạn là tách thành cấu trúc dữ liệu chuẩn.

Quy tắc:
- Giữ NGUYÊN VĂN tiếng Anh của đề bài và bài đọc. Không dịch, không viết lại, không tóm tắt.
- Nếu văn bản có phần đáp án (answer key) ở cuối, hãy ghép đáp án vào đúng câu hỏi rồi bỏ phần answer key ra khỏi passage_text.
- Với câu điền từ, đáp án có nhiều cách viết đúng thì liệt kê từng cách thành phần tử riêng.
- Với TRUE/FALSE/NOT GIVEN dùng question_type "true_false_notgiven", đáp án viết hoa: "TRUE", "FALSE", "NOT GIVEN".
- Với YES/NO/NOT GIVEN dùng "yes_no_notgiven".
- Câu trắc nghiệm chọn 1 đáp án dùng "multiple_choice", đáp án là chữ cái: "A", "B", "C", "D".
- Câu chọn nhiều đáp án dùng "multi_select".
- Writing Task 1 và Task 2 dùng "essay", word_limit là 150 và 250, correct_answers để rỗng.
- Câu Speaking dùng "speaking_prompt", correct_answers để rỗng.
- passage_text chỉ dùng cho Reading. Listening/Writing/Speaking để chuỗi rỗng.
- Nếu không chắc đáp án của một câu, để correct_answers là mảng rỗng — đừng bịa.`;

export interface ParsedSection {
  title: string;
  instructions: string;
  passage_text: string;
  questions: {
    number_label: string;
    question_type: string;
    group_title: string;
    prompt: string;
    options: string[];
    correct_answers: string[];
    word_limit?: number | null;
  }[];
}

export async function parseExamText(rawText: string, skill: string): Promise<ParsedSection> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: 'json_schema', schema: PARSE_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [
      {
        role: 'user',
        content: `Kỹ năng: ${skill}\n\nNội dung đề dán vào:\n\n${rawText}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return JSON.parse(text) as ParsedSection;
}
