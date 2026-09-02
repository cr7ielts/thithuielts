-- =====================================================================
-- MIGRATION 02 — Đồng hồ riêng cho từng kỹ năng
-- Chạy file này nếu bạn ĐÃ chạy schema.sql trước đó.
-- Nếu tạo project mới thì schema.sql đã bao gồm sẵn phần này.
-- =====================================================================

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

alter table public.attempt_skills enable row level security;

drop policy if exists "attempt skills own"   on public.attempt_skills;
drop policy if exists "attempt skills staff" on public.attempt_skills;

create policy "attempt skills own" on public.attempt_skills for all
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

create policy "attempt skills staff" on public.attempt_skills for all
  using (public.is_staff()) with check (public.is_staff());
