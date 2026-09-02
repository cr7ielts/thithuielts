-- =====================================================================
-- IELTS MOCK TEST - SCHEMA
-- Chay toan bo file nay trong Supabase Dashboard > SQL Editor > New query
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- ENUMS
do $$ begin
  create type user_role     as enum ('student', 'teacher', 'admin');
  create type skill_type    as enum ('listening', 'reading', 'writing', 'speaking');
  create type exam_mode     as enum ('full', 'listening', 'reading', 'writing', 'speaking');
  create type attempt_state as enum ('in_progress', 'submitted', 'ai_graded', 'graded');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- PROFILES
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text not null default '',
  class_name  text default '',
  phone       text default '',
  role        user_role not null default 'student',
  created_at  timestamptz not null default now()
);

-- Tu dong tao profile khi co user moi dang ky
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, class_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'class_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- EXAMS
create table if not exists public.exams (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text default '',
  mode         exam_mode not null default 'full',
  level_tag    text default '',            -- vd: "Band 5.0-6.5", "Cambridge 18 Test 1"
  is_published boolean not null default false,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------- SECTIONS
-- Moi ky nang gom nhieu section (Listening 4 section, Reading 3 passage...)
create table if not exists public.sections (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references public.exams(id) on delete cascade,
  skill            skill_type not null,
  order_index      int not null default 1,
  title            text not null default '',
  instructions     text default '',
  audio_url        text,                   -- Listening: file trong bucket exam-audio
  passage_text     text,                   -- Reading: noi dung bai doc (HTML/markdown nhe)
  image_url        text,                   -- Writing Task 1: bieu do
  duration_seconds int not null default 0  -- 0 = dung thoi gian mac dinh cua ky nang
);

-- ------------------------------------------------------------ QUESTIONS
-- question_type:
--   multiple_choice | multi_select | true_false_notgiven | yes_no_notgiven
--   matching | fill_blank | short_answer | essay | speaking_prompt
create table if not exists public.questions (
  id              uuid primary key default gen_random_uuid(),
  section_id      uuid not null references public.sections(id) on delete cascade,
  order_index     int not null default 1,
  number_label    text not null default '',   -- so cau hien thi cho HS: "1", "14", "Task 2"
  question_type   text not null,
  group_title     text default '',            -- vd "Questions 1-5: Complete the notes below"
  prompt          text not null default '',
  options         jsonb not null default '[]'::jsonb,   -- ["A. ...", "B. ..."]
  correct_answers jsonb not null default '[]'::jsonb,   -- ["B"] hoac ["library","the library"]
  points          numeric not null default 1,
  word_limit      int,                        -- Writing: 150 / 250
  prep_seconds    int default 0,              -- Speaking Part 2: 60
  speak_seconds   int default 0               -- Speaking: thoi gian noi toi da
);

-- ------------------------------------------------------------- ATTEMPTS
create table if not exists public.attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  exam_id            uuid not null references public.exams(id) on delete cascade,
  mode               exam_mode not null,
  state              attempt_state not null default 'in_progress',

  -- LICH SU THOI GIAN
  started_at         timestamptz not null default now(),
  submitted_at       timestamptz,
  deadline_at        timestamptz,             -- moc het gio da tinh san
  time_spent_seconds int,

  -- CHONG GIAN LAN
  violation_count    int not null default 0,
  auto_submitted     boolean not null default false,
  auto_submit_reason text,

  -- DIEM
  raw_listening      numeric,
  raw_reading        numeric,
  band_listening     numeric,
  band_reading       numeric,
  band_writing       numeric,
  band_speaking      numeric,
  band_overall       numeric,
  teacher_note       text,
  graded_by          uuid references public.profiles(id) on delete set null,
  graded_at          timestamptz
);

create index if not exists attempts_user_idx on public.attempts(user_id, started_at desc);
create index if not exists attempts_state_idx on public.attempts(state);

-- -------------------------------------------------- DONG HO TUNG KY NANG
-- Full test dung dong ho rieng cho moi ky nang, HS duoc nghi giua cac ky nang.
create table if not exists public.attempt_skills (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references public.attempts(id) on delete cascade,
  skill        skill_type not null,
  order_index  int not null default 1,

  started_at   timestamptz,   -- null = chua vao ky nang nay
  deadline_at  timestamptz,   -- moc het gio rieng cua ky nang
  completed_at timestamptz,   -- null = chua nop xong ky nang nay
  auto_closed  boolean not null default false,

  unique (attempt_id, skill)
);

create index if not exists attempt_skills_attempt_idx
  on public.attempt_skills(attempt_id, order_index);

-- --------------------------------------------------------------- ANSWERS
create table if not exists public.answers (
  id             uuid primary key default gen_random_uuid(),
  attempt_id     uuid not null references public.attempts(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  response       text default '',            -- dap an tu luan / trac nghiem
  audio_url      text,                       -- Speaking: file trong bucket speaking-answers
  word_count     int default 0,
  is_correct     boolean,
  points_awarded numeric default 0,
  ai_band        numeric,                    -- AI cham nhap
  ai_feedback    jsonb,                      -- {criteria:{TR,CC,LR,GRA}, comment_en, comment_vi, ...}
  teacher_band   numeric,                    -- GV duyet lai (uu tien hien thi)
  teacher_feedback text,
  updated_at     timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ------------------------------------------------------------ VIOLATIONS
-- Nhat ky "thoat man hinh" - phuc vu yeu cau khong duoc roi man hinh khi thi
create table if not exists public.violations (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null references public.attempts(id) on delete cascade,
  kind        text not null,      -- tab_hidden | window_blur | fullscreen_exit | copy | paste | contextmenu | devtools_key
  detail      text default '',
  occurred_at timestamptz not null default now()
);
create index if not exists violations_attempt_idx on public.violations(attempt_id, occurred_at);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.exams      enable row level security;
alter table public.sections   enable row level security;
alter table public.questions  enable row level security;
alter table public.attempts   enable row level security;
alter table public.attempt_skills enable row level security;
alter table public.answers    enable row level security;
alter table public.violations enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('teacher', 'admin')
  );
$$;

-- PROFILES
drop policy if exists "profiles self read"  on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
drop policy if exists "profiles staff read" on public.profiles;
create policy "profiles self read"  on public.profiles for select using (id = auth.uid());
create policy "profiles self write" on public.profiles for update using (id = auth.uid());
create policy "profiles staff read" on public.profiles for select using (public.is_staff());

-- EXAMS / SECTIONS / QUESTIONS: HS chi doc de da xuat ban
drop policy if exists "exams read"  on public.exams;
drop policy if exists "exams staff" on public.exams;
create policy "exams read"  on public.exams  for select using (is_published or public.is_staff());
create policy "exams staff" on public.exams  for all    using (public.is_staff()) with check (public.is_staff());

drop policy if exists "sections read"  on public.sections;
drop policy if exists "sections staff" on public.sections;
create policy "sections read"  on public.sections for select
  using (exists (select 1 from public.exams e where e.id = exam_id and (e.is_published or public.is_staff())));
create policy "sections staff" on public.sections for all using (public.is_staff()) with check (public.is_staff());

-- QUAN TRONG: hoc sinh KHONG duoc doc bang questions truc tiep, vi bang nay
-- chua cot correct_answers. Trang lam bai doc cau hoi o tang server bang
-- service role va chi gui ve trinh duyet nhung cot khong phai dap an.
drop policy if exists "questions read"  on public.questions;
drop policy if exists "questions staff" on public.questions;
create policy "questions staff" on public.questions for all using (public.is_staff()) with check (public.is_staff());

-- ATTEMPTS
drop policy if exists "attempts own"   on public.attempts;
drop policy if exists "attempts staff" on public.attempts;
create policy "attempts own"   on public.attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "attempts staff" on public.attempts for all
  using (public.is_staff()) with check (public.is_staff());

-- ATTEMPT SKILLS
drop policy if exists "attempt skills own"   on public.attempt_skills;
drop policy if exists "attempt skills staff" on public.attempt_skills;
create policy "attempt skills own" on public.attempt_skills for all
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy "attempt skills staff" on public.attempt_skills for all
  using (public.is_staff()) with check (public.is_staff());

-- ANSWERS
drop policy if exists "answers own"   on public.answers;
drop policy if exists "answers staff" on public.answers;
create policy "answers own" on public.answers for all
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy "answers staff" on public.answers for all using (public.is_staff()) with check (public.is_staff());

-- VIOLATIONS
drop policy if exists "violations own"      on public.violations;
drop policy if exists "violations read own" on public.violations;
drop policy if exists "violations staff"    on public.violations;
create policy "violations own" on public.violations for insert
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy "violations read own" on public.violations for select
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy "violations staff" on public.violations for all using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
insert into storage.buckets (id, name, public) values ('exam-audio', 'exam-audio', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('speaking-answers', 'speaking-answers', false)
  on conflict (id) do nothing;

drop policy if exists "exam audio public read" on storage.objects;
create policy "exam audio public read" on storage.objects for select
  using (bucket_id = 'exam-audio');

drop policy if exists "exam audio staff write" on storage.objects;
create policy "exam audio staff write" on storage.objects for insert
  with check (bucket_id = 'exam-audio' and public.is_staff());

drop policy if exists "speaking upload own" on storage.objects;
create policy "speaking upload own" on storage.objects for insert
  with check (bucket_id = 'speaking-answers' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "speaking read own or staff" on storage.objects;
create policy "speaking read own or staff" on storage.objects for select
  using (bucket_id = 'speaking-answers'
         and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));

-- =====================================================================
-- CAP QUYEN GIAO VIEN / ADMIN
-- Sau khi dang ky tai khoan dau tien, chay dong duoi day voi email cua ban:
--   update public.profiles set role = 'admin' where email = 'email-cua-ban@gmail.com';
-- =====================================================================
