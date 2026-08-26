create table if not exists public.nafdac_assessments (
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
  general_gaps text[] not null default '{}',
  proposal_requested boolean not null default false
);

-- For projects where the table already exists (adds the column only if missing):
alter table public.nafdac_assessments add column if not exists proposal_requested boolean not null default false;
