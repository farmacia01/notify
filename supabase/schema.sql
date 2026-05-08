create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  url text,
  type text not null default 'demo',
  source text default 'n8n',
  status text default 'sent',
  total_sent integer default 0,
  total_failed integer default 0,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('demo', 'teste', 'real'))
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index if not exists push_subscriptions_updated_at_idx
  on public.push_subscriptions (updated_at desc);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_type_idx
  on public.notifications (user_id, type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant select on public.notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;
grant select, insert, update, delete on public.notifications to service_role;
revoke all on function public.set_updated_at() from anon, authenticated;

drop policy if exists "Users can read own push subscriptions"
  on public.push_subscriptions;
create policy "Users can read own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own push subscriptions"
  on public.push_subscriptions;
create policy "Users can insert own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own push subscriptions"
  on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own notifications"
  on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using ((select auth.uid()) = user_id);
