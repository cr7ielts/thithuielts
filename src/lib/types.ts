export type UserRole = 'student' | 'teacher' | 'admin';
export type Skill = 'listening' | 'reading' | 'writing' | 'speaking';
export type ExamMode = 'full' | Skill;
export type AttemptState = 'in_progress' | 'submitted' | 'ai_graded' | 'graded';

export type QuestionType =
  | 'multiple_choice'
  | 'multi_select'
  | 'true_false_notgiven'
  | 'yes_no_notgiven'
  | 'matching'
  | 'fill_blank'
  | 'short_answer'
  | 'essay'
  | 'speaking_prompt';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  class_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  mode: ExamMode;
  level_tag: string;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Section {
  id: string;
  exam_id: string;
  skill: Skill;
  order_index: number;
  title: string;
  instructions: string;
  audio_url: string | null;
  passage_text: string | null;
  image_url: string | null;
  duration_seconds: number;
  questions?: Question[];
}

export interface Question {
  id: string;
  section_id: string;
  order_index: number;
  number_label: string;
  question_type: QuestionType;
  group_title: string;
  prompt: string;
  options: string[];
  correct_answers?: string[]; // chi tra ve cho giao vien / sau khi nop bai
  points: number;
  word_limit: number | null;
  prep_seconds: number;
  speak_seconds: number;
}

export interface Attempt {
  id: string;
  user_id: string;
  exam_id: string;
  mode: ExamMode;
  state: AttemptState;
  started_at: string;
  submitted_at: string | null;
  deadline_at: string | null;
  time_spent_seconds: number | null;
  violation_count: number;
  auto_submitted: boolean;
  auto_submit_reason: string | null;
  raw_listening: number | null;
  raw_reading: number | null;
  band_listening: number | null;
  band_reading: number | null;
  band_writing: number | null;
  band_speaking: number | null;
  band_overall: number | null;
  teacher_note: string | null;
  graded_by: string | null;
  graded_at: string | null;
}

export interface AnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  response: string;
  audio_url: string | null;
  word_count: number;
  is_correct: boolean | null;
  points_awarded: number;
  ai_band: number | null;
  ai_feedback: AiFeedback | null;
  teacher_band: number | null;
  teacher_feedback: string | null;
  updated_at: string;
}

export interface AiFeedback {
  criteria: Record<string, { band: number; comment_vi: string; comment_en: string }>;
  overall_band: number;
  summary_vi: string;
  summary_en: string;
  fixes: { original: string; better: string; why_vi: string }[];
}

export interface ViolationRow {
  id: string;
  attempt_id: string;
  kind: string;
  detail: string;
  occurred_at: string;
}

export interface AttemptSkill {
  id: string;
  attempt_id: string;
  skill: Skill;
  order_index: number;
  started_at: string | null;
  deadline_at: string | null;
  completed_at: string | null;
  auto_closed: boolean;
}
