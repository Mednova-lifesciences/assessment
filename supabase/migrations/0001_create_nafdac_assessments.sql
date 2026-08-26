create table public.nafdac_assessments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  score int not null,
  risk_level text not null check (risk_level in ('Low', 'Moderate', 'High')),
  answers jsonb not null,
  critical_gaps text[] not null default '{}',
  general_gaps text[] not null default '{}'
);

alter table public.nafdac_assessments enable row level security;

create policy "service role can insert" on public.nafdac_assessments
  for insert to service_role with check (true);

create policy "authenticated can read" on public.nafdac_assessments
  for select to authenticated using (true);
