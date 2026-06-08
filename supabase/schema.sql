-- ==========================================
-- Supabase Schema for Live Q&A and Polling
-- ==========================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Questions Table
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  author text not null default 'Anonymous',
  votes_count integer default 0 not null,
  is_pinned boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Question Votes Table (Prevents multiple votes per user per question)
create table if not exists public.question_votes (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  user_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (question_id, user_id)
);

-- 3. Create Polls Table
create table if not exists public.polls (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Poll Options Table
create table if not exists public.poll_options (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_text text not null
);

-- 5. Create Poll Votes Table (Prevents multiple votes per user per poll)
create table if not exists public.poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  user_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (poll_id, user_id)
);

-- 6. PostgreSQL trigger to automatically calculate question votes_count
create or replace function public.handle_question_vote()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.questions
    set votes_count = votes_count + 1
    where id = new.question_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.questions
    set votes_count = votes_count - 1
    where id = old.question_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists (so this script is idempotent)
drop trigger if exists on_question_vote on public.question_votes;

create trigger on_question_vote
after insert or delete on public.question_votes
for each row execute function public.handle_question_vote();

-- 7. Enable Supabase Realtime Replication for tables
-- Clean up existing realtime additions to avoid duplicates
begin;
  -- Remove tables from realtime if they were added before
  alter publication supabase_realtime drop table if exists public.questions;
  alter publication supabase_realtime drop table if exists public.question_votes;
  alter publication supabase_realtime drop table if exists public.polls;
  alter publication supabase_realtime drop table if exists public.poll_options;
  alter publication supabase_realtime drop table if exists public.poll_votes;
  
  -- Add tables to realtime publication
  alter publication supabase_realtime add table public.questions;
  alter publication supabase_realtime add table public.question_votes;
  alter publication supabase_realtime add table public.polls;
  alter publication supabase_realtime add table public.poll_options;
  alter publication supabase_realtime add table public.poll_votes;
commit;

-- ==========================================
-- Seed Data for Live Q&A and Polls
-- ==========================================

-- Insert sample questions
INSERT INTO public.questions (content, author, votes_count, is_pinned)
VALUES 
  ('How does the Gemini AI integration handle real-time question moderation under high load?', 'Sanjay', 8, true),
  ('What are the best practices for structuring Postgres schemas when utilizing Supabase Realtime replication?', 'Navya', 5, false),
  ('Can we export the question history and poll analytics to CSV/JSON after the session ends?', 'Developer #1', 2, false),
  ('Is there a limit to the number of active audience connections we can support in a single live room?', 'Event Coordinator', 1, false)
ON CONFLICT DO NOTHING;

-- Insert a sample poll
INSERT INTO public.polls (id, title)
VALUES ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Which technical topic are you most excited to learn next?')
ON CONFLICT (id) DO NOTHING;

-- Insert options for the sample poll
INSERT INTO public.poll_options (id, poll_id, option_text)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Next.js App Router & Server Actions'),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Supabase Database Design & Row Level Security (RLS)'),
  ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Integration of Gemini API for Smart Apps'),
  ('44444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Vercel Edge Functions & Advanced Deployments')
ON CONFLICT DO NOTHING;

-- Insert sample votes for the poll (uses dummy user IDs)
INSERT INTO public.poll_votes (poll_id, option_id, user_id)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '11111111-1111-1111-1111-111111111111', 'user-vote-1'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '11111111-1111-1111-1111-111111111111', 'user-vote-2'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '22222222-2222-2222-2222-222222222222', 'user-vote-3'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '33333333-3333-3333-3333-333333333333', 'user-vote-4'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '33333333-3333-3333-3333-333333333333', 'user-vote-5'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '33333333-3333-3333-3333-333333333333', 'user-vote-6')
ON CONFLICT DO NOTHING;

