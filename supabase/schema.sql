-- 定格今日 · 复盘闪卡 — Supabase 用户数据表 + RLS
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 若已有旧版 app_states（id text 主键），可先备份后删除重建，或自行迁移数据

create table if not exists public.app_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

drop policy if exists "users read own state" on public.app_states;
drop policy if exists "users insert own state" on public.app_states;
drop policy if exists "users update own state" on public.app_states;
drop policy if exists "users delete own state" on public.app_states;

create policy "users read own state"
  on public.app_states for select
  using (auth.uid() = user_id);

create policy "users insert own state"
  on public.app_states for insert
  with check (auth.uid() = user_id);

create policy "users update own state"
  on public.app_states for update
  using (auth.uid() = user_id);

create policy "users delete own state"
  on public.app_states for delete
  using (auth.uid() = user_id);
