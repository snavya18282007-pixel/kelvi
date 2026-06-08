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
