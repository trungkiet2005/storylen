-- ============================================================
-- StoryLens — Wibu (Gamification) Tables
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Bookmarks ─────────────────────────────────────────────────────────────────
create table if not exists user_bookmarks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  page_id        text not null,
  page_number    integer,
  series_id      text,
  series_title   text,
  chapter_number integer,
  thumbnail_url  text,
  note           text not null default '',
  saved_at       timestamptz not null default now(),
  unique(user_id, page_id)
);

-- 2. Series ratings ────────────────────────────────────────────────────────────
create table if not exists user_ratings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  series_id  text not null,
  rating     smallint not null check (rating between 1 and 5),
  rated_at   timestamptz not null default now(),
  primary key (user_id, series_id)
);

-- 3. Reading lists (reading / want / done / dropped) ──────────────────────────
create table if not exists user_reading_lists (
  user_id    uuid not null references auth.users(id) on delete cascade,
  series_id  text not null,
  status     text not null check (status in ('reading', 'want', 'done', 'dropped')),
  updated_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

-- 4. Reading goals ─────────────────────────────────────────────────────────────
create table if not exists user_reading_goals (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  daily_pages  integer not null default 20,
  weekly_pages integer not null default 100,
  updated_at   timestamptz not null default now()
);

-- 5. Aggregate reading stats ───────────────────────────────────────────────────
create table if not exists user_reading_stats (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  total_pages_read   integer not null default 0,
  total_minutes_read integer not null default 0,
  current_streak     integer not null default 0,
  longest_streak     integer not null default 0,
  last_read_date     date,
  daily_history      jsonb not null default '{}',
  updated_at         timestamptz not null default now()
);

-- 6. Achievements ──────────────────────────────────────────────────────────────
create table if not exists user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- 7. Individual pages read (for dedup) ────────────────────────────────────────
create table if not exists user_read_pages (
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, page_id)
);

-- 8. Series reading progress (last position per series) ───────────────────────
create table if not exists user_read_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  series_id      text not null,
  series_title   text not null default '',
  cover_url      text,
  chapter_id     text,
  chapter_number integer,
  page_id        text not null,
  page_number    integer not null default 0,
  total_pages    integer not null default 0,
  read_at        timestamptz not null default now(),
  primary key (user_id, series_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_user_bookmarks_user    on user_bookmarks(user_id);
create index if not exists idx_user_ratings_user      on user_ratings(user_id);
create index if not exists idx_user_lists_user        on user_reading_lists(user_id);
create index if not exists idx_user_achievements_user on user_achievements(user_id);
create index if not exists idx_user_read_pages_user   on user_read_pages(user_id);
create index if not exists idx_user_progress_user     on user_read_progress(user_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Backend uses service-role key (bypasses RLS). Policies protect direct client access.

alter table user_bookmarks    enable row level security;
alter table user_ratings      enable row level security;
alter table user_reading_lists enable row level security;
alter table user_reading_goals enable row level security;
alter table user_reading_stats enable row level security;
alter table user_achievements  enable row level security;
alter table user_read_pages    enable row level security;
alter table user_read_progress enable row level security;

create policy "own bookmarks"    on user_bookmarks    for all using (auth.uid() = user_id);
create policy "own ratings"      on user_ratings      for all using (auth.uid() = user_id);
create policy "own lists"        on user_reading_lists for all using (auth.uid() = user_id);
create policy "own goals"        on user_reading_goals for all using (auth.uid() = user_id);
create policy "own stats"        on user_reading_stats for all using (auth.uid() = user_id);
create policy "own achievements" on user_achievements  for all using (auth.uid() = user_id);
create policy "own read pages"   on user_read_pages    for all using (auth.uid() = user_id);
create policy "own progress"     on user_read_progress for all using (auth.uid() = user_id);
