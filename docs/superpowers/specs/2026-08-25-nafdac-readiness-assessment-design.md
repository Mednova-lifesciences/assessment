# NAFDAC PV Readiness Assessment — Design Spec

## Context

MedNova's technical hand-off blueprint (`mednova-technical-handoff-blueprint.docx`) describes
five assets. This spec covers asset 2.1 only: turning the Streamlit prototype
(`mednova_readiness_assessment.py`) into a real, deployable web page with lead capture, plus a
dashboard for MedNova staff to view submissions.

This is a **standalone app**, separate from the existing `mednova-final-deploy` site and its CRM
schema. It shares that project's Supabase instance and Resend account (to avoid provisioning
duplicate infrastructure) but writes to its own dedicated table — it does not touch the existing
`leads`/CRM tables.

Out of scope: the literature screener, PV Academy platform, investor pitch deck integration, and
the GxP items in section 3 of the blueprint (MedDRA/WHO Drug autocomplete, E2B(R3) compiler,
21 CFR Part 11 dual-signature auth, public intake portal). Those belong to SafetyCore, a different
system, and are not part of this task.

## Architecture

- **Framework:** Next.js (App Router), deployed on Vercel.
- **Database:** Supabase Postgres — same project/instance already used by `mednova-final-deploy`
  (shared `SUPABASE_URL`), but a new dedicated table (`nafdac_assessments`) rather than the
  existing CRM `leads` table, which has unrelated required foreign keys (`product_id`, etc.) that
  don't fit this use case.
- **Email:** Resend — same account and verified `FROM_EMAIL` sender already configured for
  `mednova-final-deploy`, so outbound mail keeps a consistent "MedNova" sender identity.
- **Auth:** Supabase Auth (email/password) gates the dashboard. Accounts for MedNova staff are
  created manually (via Supabase dashboard or CLI) — no public self-registration.

## Data model

```sql
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

-- Inserts only via the server-side service role key (from the API route).
create policy "service role can insert" on public.nafdac_assessments
  for insert to service_role with check (true);

-- Reads only for authenticated (logged-in) users.
create policy "authenticated can read" on public.nafdac_assessments
  for select to authenticated using (true);
```

## Pages

- **`/` — assessment form (public).** Intro copy from the Streamlit app. The same 10 NAFDAC GVP
  questions (Yes / No / In Progress), plus new fields: **Company Name, Contact Name, Email,
  Phone**. On submit, shows results inline (no page reload): score %, risk badge (Low/Moderate/
  High), critical vs. general gap lists, and the "Request a QPPV Retainer Proposal" CTA. Visual
  language carries over the original blue (`#0F52BA`) branding and card layout, rebuilt with
  Tailwind and responsive.
- **`/login` — Supabase Auth email/password login** for the dashboard.
- **`/dashboard` — protected.** Table of all submissions: company, contact, email, phone, score,
  risk badge, submitted date. Sortable, filterable by risk level, expandable per row to show the
  full answer set and gap lists. Requires an active Supabase session (redirects to `/login`
  otherwise).

## Submission flow

1. Form posts to `POST /api/submit-assessment` with raw answers + contact fields.
2. The API route **recomputes score, risk level, and gap lists server-side** from the raw
   answers — it never trusts a client-submitted score.
3. Insert the row into `nafdac_assessments` using the Supabase service-role client (server-only,
   never exposed to the browser).
4. Send a Resend email to `info@mednovalife.com` (the team) with the lead's contact info, score,
   and flagged gaps, so a real person sees every submission as it happens.
5. Return the computed results to the client to render inline.

## Scoring logic (ported from `mednova_readiness_assessment.py`)

- 10 questions; 6 are `critical` (Q1, Q2, Q4, Q5, Q9, Q10), 4 are general (Q3, Q6, Q7, Q8).
- `Yes` → +10 points. `In Progress` → +5 points, and if critical, also logged as a gap (prefixed
  "(In Progress)"). `No` → 0 points, logged as a gap (critical or general list per the question).
- Risk level: score ≥ 80 → Low risk. Score ≥ 50 → Moderate risk. Otherwise → High risk.
- Each question's `advice` text (already written in the Streamlit script) is reused verbatim as
  the gap-list explanation text.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `FROM_EMAIL`, `NOTIFY_EMAIL` (defaults to `info@mednovalife.com`) — values for
the shared Supabase/Resend project copied in as this app's own Vercel env vars (not a shared
`.env` file between repos).

## Testing

- Unit tests for the scoring function (all-Yes, all-No, all-In-Progress, and a mixed case,
  checking score, risk tier, and gap-list contents).
- Manual end-to-end pass: submit the form → row appears in `nafdac_assessments` → notification
  email arrives → dashboard shows the new row after login → logged-out access to `/dashboard`
  redirects to `/login`.

## Open implementation note

Creating the first Supabase Auth user(s) for staff login is a manual provisioning step (via the
Supabase dashboard/CLI), not something the app code does — flagged here so it isn't missed during
implementation/handoff.
