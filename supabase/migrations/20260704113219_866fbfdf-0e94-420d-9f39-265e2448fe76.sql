
-- 1. Enum
do $$ begin
  create type public.app_role as enum ('admin', 'client');
exception when duplicate_object then null; end $$;

-- 2. Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  industry text,
  created_at timestamptz not null default now()
);
grant select on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

-- 3. Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  org_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- 4. User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- 5. has_role security definer
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- 6. Engagements
create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  industry_slug text,
  use_case_slug text,
  stage text,
  next_step text,
  starts_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.engagements to authenticated;
grant all on public.engagements to service_role;
alter table public.engagements enable row level security;

-- 7. Extend contact_submissions
alter table public.contact_submissions
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists tags text[] not null default '{}';

grant select, update on public.contact_submissions to authenticated;

-- 8. Submission notes
create table public.submission_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.contact_submissions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  visibility text not null default 'internal', -- 'internal' | 'client'
  created_at timestamptz not null default now()
);
grant select, insert on public.submission_notes to authenticated;
grant all on public.submission_notes to service_role;
alter table public.submission_notes enable row level security;

-- 9. engine_events SELECT for admins
grant select on public.engine_events to authenticated;

-- 10. Policies
-- profiles
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());
create policy "Admins update any profile" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- user_roles
create policy "Users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "Admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- organizations
create policy "Members read their org" on public.organizations
  for select to authenticated using (
    id in (select org_id from public.profiles where id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

-- engagements
create policy "Members read their engagements" on public.engagements
  for select to authenticated using (
    org_id in (select org_id from public.profiles where id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

-- contact_submissions
create policy "Admins read all submissions" on public.contact_submissions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Clients read own org submissions" on public.contact_submissions
  for select to authenticated using (
    org_id is not null
    and org_id in (select org_id from public.profiles where id = auth.uid())
  );
create policy "Admins update submissions" on public.contact_submissions
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- submission_notes
create policy "Admins read all notes" on public.submission_notes
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Clients read visible notes on own submissions" on public.submission_notes
  for select to authenticated using (
    visibility = 'client'
    and submission_id in (
      select id from public.contact_submissions
      where org_id in (select org_id from public.profiles where id = auth.uid())
    )
  );
create policy "Authenticated insert notes" on public.submission_notes
  for insert to authenticated with check (author_id = auth.uid());

-- engine_events read for admin
create policy "Admins read events" on public.engine_events
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 11. updated_at trigger
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create trigger touch_profiles_updated before update on public.profiles
  for each row execute function public.tg_touch_updated_at();
create trigger touch_engagements_updated before update on public.engagements
  for each row execute function public.tg_touch_updated_at();

-- 12. New user handler: profile + role bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  select not exists (select 1 from public.user_roles where role = 'admin') into is_first;

  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'admin'::public.app_role else 'client'::public.app_role end)
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
