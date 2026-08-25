# NAFDAC PV Readiness Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a standalone Next.js web app that replaces the Streamlit NAFDAC PV readiness assessment prototype with a real public assessment page (10 questions + lead capture) and a password-protected dashboard for viewing submissions.

**Architecture:** Next.js (App Router, TypeScript) deployed on Vercel. A public page posts assessment answers + contact info to a server API route, which recomputes the score, writes a row to a new Supabase table, and emails the team via Resend. A Supabase-Auth-gated `/dashboard` page lists and filters submissions.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, `@supabase/ssr` + `@supabase/supabase-js`, `resend`, Vitest (+ Testing Library for one component).

**Spec:** `docs/superpowers/specs/2026-08-25-nafdac-readiness-assessment-design.md`

## Global Constraints

- Standalone app, separate git repo (`https://github.com/Mednova-lifesciences/assessment.git`), NOT merged into the existing `mednova-final-deploy` project.
- Shares the Supabase project already used by `mednova-final-deploy` (same `SUPABASE_URL`) but writes only to a new, dedicated table `nafdac_assessments` — never touches the existing CRM `leads`/`organizations`/`contacts` tables.
- Shares the existing Resend account and verified `FROM_EMAIL` sender from `mednova-final-deploy` — no new Resend account.
- Score, risk level, and gap lists are always recomputed server-side from raw answers — the server never trusts a client-submitted score.
- Dashboard access requires a Supabase Auth session (email/password). No public self-registration — staff accounts are created manually.
- Notification email recipient: `info@mednovalife.com`.
- Out of scope: literature screener, PV Academy platform, investor pitch deck, and all of blueprint section 3 (MedDRA/WHO Drug autocomplete, E2B(R3) compiler, 21 CFR Part 11 dual-signature auth, public intake portal) — those belong to SafetyCore, a different system.
- Real secret values (Supabase service role key, Resend API key, etc.) must never be printed to a command's visible stdout during setup — copy them file-to-file or enter them directly into the Vercel/Supabase dashboards.

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`

**Interfaces:**
- Produces: a running `npm run dev` server on `http://localhost:3000`, Tailwind utility classes available, `@/*` path alias resolving to `src/*`, a `brand` Tailwind color (`#0F52BA`).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "nafdac-readiness-assessment",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run (from the `assessment` project root):

```bash
npm install next@latest react@latest react-dom@latest @supabase/ssr @supabase/supabase-js resend
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer eslint eslint-config-next vitest @vitejs/plugin-react
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: '#0F52BA'
      }
    }
  },
  plugins: []
};

export default config;
```

- [ ] **Step 6: Create `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
.next/
.env
.env.local
.env*.local
```

- [ ] **Step 8: Create `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedNova NAFDAC PV Readiness Assessment',
  description: "Interactive NAFDAC QPPV & PV Compliance Readiness Assessment"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Create a placeholder `src/app/page.tsx`**

```tsx
export default function Home() {
  return <main className="p-8">MedNova NAFDAC PV Readiness Assessment — coming soon.</main>;
}
```

- [ ] **Step 11: Verify the dev server boots and renders**

Run in background: `npm run dev`
Then: `curl -s http://localhost:3000`
Expected: HTML output containing `MedNova NAFDAC PV Readiness Assessment — coming soon.`
Then stop the dev server process.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js .gitignore src/app/layout.tsx src/app/globals.css src/app/page.tsx
git commit -m "Scaffold Next.js app with TypeScript and Tailwind"
```

---

### Task 2: Question data and scoring logic

**Files:**
- Create: `src/lib/questions.ts`
- Create: `src/lib/scoring.ts`
- Create: `src/lib/scoring.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `QuestionId` (union of `'q1'`…`'q10'`), `Question` interface, `QUESTIONS: Question[]` from `src/lib/questions.ts`.
- Produces: `Answer` (`'Yes' | 'No' | 'In Progress'`), `Answers` (`Record<QuestionId, Answer>`), `RiskLevel` (`'Low' | 'Moderate' | 'High'`), `ScoreResult { score, riskLevel, criticalGaps, generalGaps }`, `scoreAssessment(answers: Answers): ScoreResult`, `isValidAnswers(value: unknown): value is Answers` from `src/lib/scoring.ts`.

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node'
  }
});
```

- [ ] **Step 2: Create `src/lib/questions.ts`**

```ts
export type QuestionId =
  | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9' | 'q10';

export interface Question {
  id: QuestionId;
  text: string;
  critical: boolean;
  advice: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Do you have a permanently resident, qualified QPPV physically located in Nigeria?',
    critical: true,
    advice: 'NAFDAC requires a permanently resident, qualified QPPV in-country. Outsourcing this to MedNova ensures immediate, continuous compliance.'
  },
  {
    id: 'q2',
    text: 'Do you have a formally designated deputy/backup QPPV in Nigeria to ensure continuous coverage?',
    critical: true,
    advice: 'Continuous PV coverage is legally mandated. You must have backup provisions in place for when your primary QPPV is unavailable.'
  },
  {
    id: 'q3',
    text: 'Is there a named Local Safety Officer (LSO) or Local Contact Person for PV registered with NAFDAC?',
    critical: false,
    advice: 'Having an explicit, registered in-country point of contact streamlines regulatory queries and prevents administrative delays.'
  },
  {
    id: 'q4',
    text: 'Is your Pharmacovigilance System Master File (PSMF) fully localized and regularly updated for Nigerian operations?',
    critical: true,
    advice: 'A global PSMF is not enough. NAFDAC expects local annexes or a localized PSMF detailing Nigerian safety infrastructure.'
  },
  {
    id: 'q5',
    text: 'Do you have an active, validated pathway for capturing and processing local Adverse Drug Reactions (ADRs)?',
    critical: true,
    advice: "You must be able to ingest, process, and report local spontaneous ADR cases (ICSRs) within NAFDAC's strict timelines."
  },
  {
    id: 'q6',
    text: 'Do you conduct weekly literature monitoring across local Nigerian medical journals and news sources?',
    critical: false,
    advice: 'Global literature databases often miss regional Nigerian publications. MedNova offers automated local screening to solve this exact bottleneck.'
  },
  {
    id: 'q7',
    text: 'Are you actively tracking and submitting PSURs/PBRERs in alignment with NAFDAC regulatory cycles?',
    critical: false,
    advice: 'Periodic safety reports must be synchronized with NAFDAC schedules. MedNova manages the entire authoring and submission cycle.'
  },
  {
    id: 'q8',
    text: 'Have you submitted product-specific Risk Management Plans (RMP) or educational materials to NAFDAC?',
    critical: false,
    advice: 'Products with specific risk profiles require customized RMPs and localized risk minimization measures (aRMMs).'
  },
  {
    id: 'q9',
    text: 'Do you have a formalized process for safety signal detection and escalation of safety concerns in Nigeria?',
    critical: true,
    advice: 'NAFDAC expects proactive safety screening, not just passive reporting. Signal management is a core QPPV requirement.'
  },
  {
    id: 'q10',
    text: 'Are your local PV SOPs and training records audit-ready for a surprise NAFDAC inspection?',
    critical: true,
    advice: 'Inspection readiness is key. MedNova conducts gap analyses and pre-audit dry runs to protect your marketing authorization.'
  }
];
```

- [ ] **Step 3: Write the failing test file `src/lib/scoring.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { scoreAssessment } from './scoring';
import { QUESTIONS } from './questions';
import type { Answers } from './scoring';

function answersWith(value: 'Yes' | 'No' | 'In Progress'): Answers {
  const answers = {} as Answers;
  for (const q of QUESTIONS) {
    answers[q.id] = value;
  }
  return answers;
}

describe('scoreAssessment', () => {
  it('scores all Yes as 100 and Low risk with no gaps', () => {
    const result = scoreAssessment(answersWith('Yes'));
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe('Low');
    expect(result.criticalGaps).toHaveLength(0);
    expect(result.generalGaps).toHaveLength(0);
  });

  it('scores all No as 0 and High risk, splitting gaps by criticality', () => {
    const result = scoreAssessment(answersWith('No'));
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe('High');
    expect(result.criticalGaps).toHaveLength(6);
    expect(result.generalGaps).toHaveLength(4);
  });

  it('scores all In Progress as 50 and flags critical questions as in-progress gaps', () => {
    const result = scoreAssessment(answersWith('In Progress'));
    expect(result.score).toBe(50);
    expect(result.riskLevel).toBe('Moderate');
    expect(result.criticalGaps).toHaveLength(6);
    expect(result.criticalGaps[0]).toMatch(/^\(In Progress\)/);
    expect(result.generalGaps).toHaveLength(0);
  });

  it('scores a mixed answer set correctly', () => {
    const answers = answersWith('Yes');
    answers.q1 = 'No';
    answers.q3 = 'No';
    const result = scoreAssessment(answers);
    expect(result.score).toBe(80);
    expect(result.riskLevel).toBe('Low');
    expect(result.criticalGaps).toHaveLength(1);
    expect(result.generalGaps).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

Run: `npx vitest run src/lib/scoring.test.ts`
Expected: FAIL — `Cannot find module './scoring'` (or similar).

- [ ] **Step 5: Implement `src/lib/scoring.ts`**

```ts
import { QUESTIONS, type QuestionId } from './questions';

export type Answer = 'Yes' | 'No' | 'In Progress';
export type Answers = Record<QuestionId, Answer>;
export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface ScoreResult {
  score: number;
  riskLevel: RiskLevel;
  criticalGaps: string[];
  generalGaps: string[];
}

export function scoreAssessment(answers: Answers): ScoreResult {
  let score = 0;
  const criticalGaps: string[] = [];
  const generalGaps: string[] = [];

  for (const question of QUESTIONS) {
    const answer = answers[question.id];

    if (answer === 'Yes') {
      score += 10;
    } else if (answer === 'In Progress') {
      score += 5;
      if (question.critical) {
        criticalGaps.push(`(In Progress) ${question.advice}`);
      }
    } else if (answer === 'No') {
      if (question.critical) {
        criticalGaps.push(question.advice);
      } else {
        generalGaps.push(question.advice);
      }
    }
  }

  const riskLevel: RiskLevel = score >= 80 ? 'Low' : score >= 50 ? 'Moderate' : 'High';

  return { score, riskLevel, criticalGaps, generalGaps };
}

export function isValidAnswers(value: unknown): value is Answers {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return QUESTIONS.every((question) => {
    const answer = record[question.id];
    return answer === 'Yes' || answer === 'No' || answer === 'In Progress';
  });
}
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npx vitest run src/lib/scoring.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/lib/questions.ts src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "Add readiness question data and scoring logic"
```

---

### Task 3: Supabase clients, migration, and environment config

**Files:**
- Create: `supabase/migrations/0001_create_nafdac_assessments.sql`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `.env.local.example`
- Create (untracked, not committed): `.env.local`

**Interfaces:**
- Produces: `createBrowserSupabaseClient()` from `src/lib/supabase/client.ts`.
- Produces: `createServerSupabaseClient(): Promise<SupabaseClient>` (cookie-based, user session) and `createServiceRoleSupabaseClient(): SupabaseClient` (service role, no session) from `src/lib/supabase/server.ts`.

- [ ] **Step 1: Create `supabase/migrations/0001_create_nafdac_assessments.sql`**

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

create policy "service role can insert" on public.nafdac_assessments
  for insert to service_role with check (true);

create policy "authenticated can read" on public.nafdac_assessments
  for select to authenticated using (true);
```

- [ ] **Step 2: Apply the migration to the shared Supabase project**

Open the Supabase SQL editor for the same project used by `mednova-final-deploy` (or use the Supabase CLI/MCP connection if available) and run the SQL from Step 1. Confirm success by listing tables and seeing `nafdac_assessments`, or running `select count(*) from public.nafdac_assessments;` (expect `0`).

- [ ] **Step 3: Create `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with a read-only cookie store —
            // safe to ignore because middleware refreshes the session on every request.
          }
        }
      }
    }
  );
}

export function createServiceRoleSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 5: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
FROM_EMAIL=
NOTIFY_EMAIL=info@mednovalife.com
```

- [ ] **Step 6: Populate real `.env.local` from the shared project's existing backend config**

This copies real secret values file-to-file — it does not print them to the terminal. Adjust the `SRC` path if `mednova-final-deploy` lives somewhere else on disk.

```bash
SRC="../mednova-final-deploy/final-deploy/backend/.env"
{
  echo "NEXT_PUBLIC_SUPABASE_URL=$(grep '^SUPABASE_URL=' "$SRC" | cut -d= -f2-)"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep '^SUPABASE_ANON_KEY=' "$SRC" | cut -d= -f2-)"
  echo "SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$SRC" | cut -d= -f2-)"
  echo "RESEND_API_KEY=$(grep '^RESEND_API_KEY=' "$SRC" | cut -d= -f2-)"
  echo "FROM_EMAIL=$(grep '^FROM_EMAIL=' "$SRC" | cut -d= -f2-)"
  echo "NOTIFY_EMAIL=info@mednovalife.com"
} > .env.local
```

Verify (without exposing values): `grep -c '=' .env.local` should print `6`.

- [ ] **Step 7: Commit (excludes `.env.local`, already gitignored)**

```bash
git add supabase/migrations/0001_create_nafdac_assessments.sql src/lib/supabase/client.ts src/lib/supabase/server.ts .env.local.example
git commit -m "Add Supabase clients, migration, and env template"
```

---

### Task 4: Public assessment form page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `QUESTIONS` and `QuestionId` from `@/lib/questions`; `Answer`, `Answers`, `ScoreResult` types from `@/lib/scoring`.
- Produces: a form that `POST`s `{ companyName, contactName, email, phone, answers }` JSON to `/api/submit-assessment` and renders the returned `{ result: ScoreResult }`.

- [ ] **Step 1: Replace `src/app/page.tsx` with the full form + results UI**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { QUESTIONS, type QuestionId } from '@/lib/questions';
import type { Answer, Answers, ScoreResult } from '@/lib/scoring';

const ANSWER_OPTIONS: Answer[] = ['Yes', 'No', 'In Progress'];

function initialAnswers(): Answers {
  const answers = {} as Answers;
  for (const question of QUESTIONS) {
    answers[question.id] = 'No';
  }
  return answers;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function Home() {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);

  function setAnswer(id: QuestionId, value: Answer) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/submit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, contactName, email, phone, answers })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setResult(data.result as ScoreResult);
      setStatus('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success' && result) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-brand">Your Compliance Score</h1>
        <p className="mt-2 text-4xl font-bold">{result.score}%</p>
        <p className="mt-1 text-lg font-medium">{result.riskLevel} Risk</p>

        {result.criticalGaps.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">🛑 Critical Compliance Exposure Points</h2>
            <ul className="mt-3 space-y-2">
              {result.criticalGaps.map((gap, index) => (
                <li key={index} className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-sm">
                  {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.generalGaps.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">⚠️ Process Optimization Gaps</h2>
            <ul className="mt-3 space-y-2">
              {result.generalGaps.map((gap, index) => (
                <li key={index} className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                  {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold">🚀 Close Your Compliance Gaps with MedNova Lifesciences</h2>
          <p className="mt-2 text-sm text-gray-700">
            MedNova provides fully outsourced, NAFDAC-compliant resident QPPV services, Local Safety
            Officers (LSOs), local literature monitoring, and turn-key inspection-readiness support.
          </p>
          <a
            className="mt-4 inline-block font-semibold text-brand underline"
            href="mailto:info@mednovalife.com?subject=NAFDAC%20Ready%20Proposal%20Request"
          >
            Request a QPPV Retainer Proposal
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold text-brand">MedNova Lifesciences</h1>
      <p className="mt-1 text-lg text-gray-600">
        Interactive NAFDAC QPPV &amp; PV Compliance Readiness Assessment
      </p>
      <p className="mt-4 text-sm text-gray-700">
        Under NAFDAC&apos;s pharmacovigilance guidelines (reinforced by Nigeria&apos;s WHO ML3
        status), Marketing Authorization Holders (MAHs) must maintain strict, continuous, and
        in-country safety monitoring. Take this quick 2-minute assessment to identify gaps in your
        Nigerian PV compliance.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-5">
          <legend className="px-1 text-sm font-semibold text-gray-700">Your details</legend>
          <div>
            <label className="block text-sm font-medium" htmlFor="companyName">Company Name</label>
            <input
              id="companyName"
              required
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="contactName">Contact Name</label>
            <input
              id="contactName"
              required
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </fieldset>

        {QUESTIONS.map((question, index) => (
          <div key={question.id} className="rounded-xl border-l-4 border-brand bg-gray-50 p-4">
            <p className="text-sm font-medium">{index + 1}. {question.text}</p>
            <div className="mt-3 flex gap-4">
              {ANSWER_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() => setAnswer(question.id, option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}

        {status === 'error' && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {status === 'submitting' ? 'Submitting…' : 'Get My Readiness Score'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run in background: `npm run dev`
Then: `curl -s http://localhost:3000`
Expected: HTML containing `MedNova Lifesciences`, `Company Name`, `Get My Readiness Score`, and the text of question 1 (`permanently resident, qualified QPPV`).
Then stop the dev server process.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Build the public assessment form page"
```

---

### Task 5: Resend email notification module

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/lib/email.test.ts`

**Interfaces:**
- Consumes: `RiskLevel` from `@/lib/scoring`; `process.env.RESEND_API_KEY`, `process.env.FROM_EMAIL`, `process.env.NOTIFY_EMAIL`.
- Produces: `AssessmentNotificationInput` interface and `sendAssessmentNotification(input: AssessmentNotificationInput): Promise<void>` from `src/lib/email.ts`.

- [ ] **Step 1: Write the failing test file `src/lib/email.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock }
  }))
}));

import { sendAssessmentNotification } from './email';

const baseInput = {
  companyName: 'Acme Pharma',
  contactName: 'Jane Doe',
  email: 'jane@acme.com',
  phone: null,
  score: 80,
  riskLevel: 'Low' as const,
  criticalGaps: ['Gap A'],
  generalGaps: []
};

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'abc' }, error: null });
  process.env.RESEND_API_KEY = 'test-key';
  process.env.FROM_EMAIL = 'notifications@mednovalife.com';
  process.env.NOTIFY_EMAIL = 'info@mednovalife.com';
});

describe('sendAssessmentNotification', () => {
  it('sends a notification email to the configured recipient', async () => {
    await sendAssessmentNotification(baseInput);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe('info@mednovalife.com');
    expect(call.subject).toContain('Acme Pharma');
    expect(call.html).toContain('Gap A');
  });

  it('throws when Resend returns an error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'bad request' } });
    await expect(sendAssessmentNotification(baseInput)).rejects.toThrow('bad request');
  });

  it('throws when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendAssessmentNotification(baseInput)).rejects.toThrow('RESEND_API_KEY');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/email.test.ts`
Expected: FAIL — `Cannot find module './email'`.

- [ ] **Step 3: Implement `src/lib/email.ts`**

```ts
import { Resend } from 'resend';
import type { RiskLevel } from './scoring';

export interface AssessmentNotificationInput {
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  score: number;
  riskLevel: RiskLevel;
  criticalGaps: string[];
  generalGaps: string[];
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }
  return new Resend(apiKey);
}

function buildNotificationHtml(input: AssessmentNotificationInput): string {
  const gapsHtml = (title: string, gaps: string[]) =>
    gaps.length === 0
      ? ''
      : `<h3>${title}</h3><ul>${gaps.map((gap) => `<li>${gap}</li>`).join('')}</ul>`;

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <h1 style="color:#0F52BA;">New NAFDAC Readiness Assessment Submission</h1>
      <table cellpadding="6">
        <tr><td><strong>Company</strong></td><td>${input.companyName}</td></tr>
        <tr><td><strong>Contact</strong></td><td>${input.contactName}</td></tr>
        <tr><td><strong>Email</strong></td><td>${input.email}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${input.phone ?? 'Not provided'}</td></tr>
        <tr><td><strong>Score</strong></td><td>${input.score}%</td></tr>
        <tr><td><strong>Risk Level</strong></td><td>${input.riskLevel}</td></tr>
      </table>
      ${gapsHtml('Critical Compliance Exposure Points', input.criticalGaps)}
      ${gapsHtml('Process Optimization Gaps', input.generalGaps)}
    </div>
  `;
}

export async function sendAssessmentNotification(input: AssessmentNotificationInput): Promise<void> {
  const resend = getResendClient();
  const fromEmail = process.env.FROM_EMAIL;
  const notifyEmail = process.env.NOTIFY_EMAIL || 'info@mednovalife.com';

  if (!fromEmail) {
    throw new Error('FROM_EMAIL is not configured.');
  }

  const { error } = await resend.emails.send({
    from: `MedNova <${fromEmail}>`,
    to: notifyEmail,
    replyTo: input.email,
    subject: `New NAFDAC Readiness Assessment — ${input.companyName} (${input.score}%)`,
    html: buildNotificationHtml(input)
  });

  if (error) {
    throw new Error(typeof error === 'string' ? error : error.message);
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/lib/email.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "Add Resend notification email module"
```

---

### Task 6: `/api/submit-assessment` route

**Files:**
- Create: `src/app/api/submit-assessment/route.ts`
- Create: `src/app/api/submit-assessment/route.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: `scoreAssessment`, `isValidAnswers` from `@/lib/scoring`; `createServiceRoleSupabaseClient` from `@/lib/supabase/server`; `sendAssessmentNotification` from `@/lib/email`.
- Produces: `POST` handler returning `{ result: ScoreResult }` on success (200) or `{ error: string }` on failure (400/500).

- [ ] **Step 1: Add the `@` path alias to `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'node'
  }
});
```

- [ ] **Step 2: Write the failing test file `src/app/api/submit-assessment/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const sendAssessmentNotificationMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleSupabaseClient: () => ({ from: fromMock })
}));

vi.mock('@/lib/email', () => ({
  sendAssessmentNotification: sendAssessmentNotificationMock
}));

import { POST } from './route';
import { QUESTIONS } from '@/lib/questions';

function validAnswers() {
  const answers: Record<string, string> = {};
  for (const question of QUESTIONS) {
    answers[question.id] = 'Yes';
  }
  return answers;
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/submit-assessment', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockClear();
  sendAssessmentNotificationMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  sendAssessmentNotificationMock.mockResolvedValue(undefined);
});

describe('POST /api/submit-assessment', () => {
  it('rejects a request missing contact fields', async () => {
    const response = await POST(makeRequest({ answers: validAnswers() }));
    expect(response.status).toBe(400);
  });

  it('rejects a request with incomplete answers', async () => {
    const response = await POST(
      makeRequest({ companyName: 'Acme', contactName: 'Jane', email: 'jane@acme.com', answers: { q1: 'Yes' } })
    );
    expect(response.status).toBe(400);
  });

  it('saves a valid submission and returns the computed score', async () => {
    const response = await POST(
      makeRequest({
        companyName: 'Acme Pharma',
        contactName: 'Jane Doe',
        email: 'jane@acme.com',
        phone: '+2348000000000',
        answers: validAnswers()
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.score).toBe(100);
    expect(fromMock).toHaveBeenCalledWith('nafdac_assessments');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ company_name: 'Acme Pharma', score: 100, risk_level: 'Low' })
    );
    expect(sendAssessmentNotificationMock).toHaveBeenCalled();
  });

  it('still saves the submission when the notification email fails', async () => {
    sendAssessmentNotificationMock.mockRejectedValue(new Error('Resend down'));

    const response = await POST(
      makeRequest({
        companyName: 'Acme Pharma',
        contactName: 'Jane Doe',
        email: 'jane@acme.com',
        answers: validAnswers()
      })
    );

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx vitest run src/app/api/submit-assessment/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 4: Implement `src/app/api/submit-assessment/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { scoreAssessment, isValidAnswers } from '@/lib/scoring';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { sendAssessmentNotification } from '@/lib/email';

interface SubmitAssessmentBody {
  companyName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  answers?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request: Request) {
  let body: SubmitAssessmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { companyName, contactName, email, phone, answers } = body;

  if (!isNonEmptyString(companyName) || !isNonEmptyString(contactName) || !isNonEmptyString(email)) {
    return NextResponse.json(
      { error: 'Company name, contact name, and email are required.' },
      { status: 400 }
    );
  }

  if (!isValidAnswers(answers)) {
    return NextResponse.json({ error: 'All 10 questions must be answered.' }, { status: 400 });
  }

  const result = scoreAssessment(answers);
  const phoneValue = isNonEmptyString(phone) ? phone : null;

  const supabase = createServiceRoleSupabaseClient();
  const { error: insertError } = await supabase.from('nafdac_assessments').insert({
    company_name: companyName,
    contact_name: contactName,
    email,
    phone: phoneValue,
    score: result.score,
    risk_level: result.riskLevel,
    answers,
    critical_gaps: result.criticalGaps,
    general_gaps: result.generalGaps
  });

  if (insertError) {
    console.error('[submit-assessment] Failed to insert assessment:', insertError.message);
    return NextResponse.json({ error: 'Unable to save your assessment right now.' }, { status: 500 });
  }

  // Save succeeded even if the email fails — don't lose the lead over a transient email issue.
  try {
    await sendAssessmentNotification({
      companyName,
      contactName,
      email,
      phone: phoneValue,
      score: result.score,
      riskLevel: result.riskLevel,
      criticalGaps: result.criticalGaps,
      generalGaps: result.generalGaps
    });
  } catch (emailError) {
    console.error(
      '[submit-assessment] Notification email failed, but the assessment was saved:',
      emailError instanceof Error ? emailError.message : emailError
    );
  }

  return NextResponse.json({ result });
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx vitest run src/app/api/submit-assessment/route.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all suites pass (scoring, email, route).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/app/api/submit-assessment/route.ts src/app/api/submit-assessment/route.test.ts
git commit -m "Add submit-assessment API route with score recomputation and notification email"
```

---

### Task 7: Dashboard authentication (login page + middleware)

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient` from `@/lib/supabase/client`.
- Produces: redirect behavior — unauthenticated `/dashboard/*` requests redirect to `/login`; authenticated `/login` requests redirect to `/dashboard`.

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
};
```

- [ ] **Step 2: Create `src/app/login/page.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-bold text-brand">MedNova Dashboard Login</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verify the redirect behavior**

Run in background: `npm run dev`
Then: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/dashboard`
Expected: a redirect status (`307`) with a `redirect_url` ending in `/login`.
Then stop the dev server process.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/app/login/page.tsx
git commit -m "Add Supabase Auth login page and dashboard route protection"
```

---

### Task 8: Dashboard page and submissions table

**Files:**
- Create: `src/app/dashboard/DashboardTable.tsx`
- Create: `src/app/dashboard/DashboardTable.test.tsx`
- Create: `src/app/dashboard/SignOutButton.tsx`
- Create: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient` from `@/lib/supabase/server`; `createBrowserSupabaseClient` from `@/lib/supabase/client`.
- Produces: `AssessmentRow` interface and `DashboardTable({ rows: AssessmentRow[] })` from `src/app/dashboard/DashboardTable.tsx`, consumed by `src/app/dashboard/page.tsx`.

- [ ] **Step 1: Install component-testing dependencies**

Run: `npm install -D @testing-library/react @testing-library/jest-dom jsdom`

- [ ] **Step 2: Write the failing test file `src/app/dashboard/DashboardTable.test.tsx`**

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardTable, type AssessmentRow } from './DashboardTable';

const rows: AssessmentRow[] = [
  {
    id: '1',
    created_at: '2026-08-20T10:00:00Z',
    company_name: 'Acme Pharma',
    contact_name: 'Jane Doe',
    email: 'jane@acme.com',
    phone: null,
    score: 90,
    risk_level: 'Low',
    answers: {},
    critical_gaps: [],
    general_gaps: []
  },
  {
    id: '2',
    created_at: '2026-08-21T10:00:00Z',
    company_name: 'Beta Biotech',
    contact_name: 'John Smith',
    email: 'john@beta.com',
    phone: '+2348000000000',
    score: 30,
    risk_level: 'High',
    answers: {},
    critical_gaps: ['Missing resident QPPV.'],
    general_gaps: []
  }
];

describe('DashboardTable', () => {
  it('renders every submission', () => {
    render(<DashboardTable rows={rows} />);
    expect(screen.getByText('Acme Pharma')).toBeInTheDocument();
    expect(screen.getByText('Beta Biotech')).toBeInTheDocument();
  });

  it('filters by risk level', () => {
    render(<DashboardTable rows={rows} />);
    fireEvent.change(screen.getByLabelText('Filter by risk'), { target: { value: 'High' } });
    expect(screen.queryByText('Acme Pharma')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Biotech')).toBeInTheDocument();
  });

  it('expands a row to show its gaps on click', () => {
    render(<DashboardTable rows={rows} />);
    fireEvent.click(screen.getByText('Beta Biotech'));
    expect(screen.getByText('Missing resident QPPV.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx vitest run src/app/dashboard/DashboardTable.test.tsx`
Expected: FAIL — `Cannot find module './DashboardTable'`.

- [ ] **Step 4: Implement `src/app/dashboard/DashboardTable.tsx`**

```tsx
'use client';

import { Fragment, useMemo, useState } from 'react';

export interface AssessmentRow {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  score: number;
  risk_level: 'Low' | 'Moderate' | 'High';
  answers: Record<string, string>;
  critical_gaps: string[];
  general_gaps: string[];
}

type RiskFilter = 'All' | 'Low' | 'Moderate' | 'High';

export function DashboardTable({ rows }: { rows: AssessmentRow[] }) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('All');
  const [sortAscending, setSortAscending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const filtered = riskFilter === 'All' ? rows : rows.filter((row) => row.risk_level === riskFilter);
    return [...filtered].sort((a, b) => (sortAscending ? a.score - b.score : b.score - a.score));
  }, [rows, riskFilter, sortAscending]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium" htmlFor="riskFilter">Filter by risk</label>
        <select
          id="riskFilter"
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="All">All</option>
          <option value="Low">Low</option>
          <option value="Moderate">Moderate</option>
          <option value="High">High</option>
        </select>
        <button
          onClick={() => setSortAscending((value) => !value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          Sort by score: {sortAscending ? 'Low → High' : 'High → Low'}
        </button>
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 pr-4">Company</th>
            <th className="py-2 pr-4">Contact</th>
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Risk</th>
            <th className="py-2 pr-4">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <Fragment key={row.id}>
              <tr
                className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <td className="py-2 pr-4">{row.company_name}</td>
                <td className="py-2 pr-4">
                  {row.contact_name} — {row.email}{row.phone ? ` — ${row.phone}` : ''}
                </td>
                <td className="py-2 pr-4">{row.score}%</td>
                <td className="py-2 pr-4">{row.risk_level}</td>
                <td className="py-2 pr-4">{new Date(row.created_at).toLocaleString()}</td>
              </tr>
              {expandedId === row.id && (
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td colSpan={5} className="px-4 py-3">
                    {row.critical_gaps.length > 0 && (
                      <div className="mb-2">
                        <p className="font-semibold">Critical gaps</p>
                        <ul className="list-disc pl-5">
                          {row.critical_gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                    {row.general_gaps.length > 0 && (
                      <div>
                        <p className="font-semibold">General gaps</p>
                        <ul className="list-disc pl-5">
                          {row.general_gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                    {row.critical_gaps.length === 0 && row.general_gaps.length === 0 && (
                      <p>No gaps flagged.</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {visibleRows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-500">No submissions yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx vitest run src/app/dashboard/DashboardTable.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Create `src/app/dashboard/SignOutButton.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="text-sm font-medium text-brand underline">
      Sign out
    </button>
  );
}
```

- [ ] **Step 7: Create `src/app/dashboard/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DashboardTable, type AssessmentRow } from './DashboardTable';
import { SignOutButton } from './SignOutButton';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('nafdac_assessments')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">NAFDAC Readiness Assessment Submissions</h1>
        <SignOutButton />
      </div>
      {error ? (
        <p className="mt-6 text-red-600">Unable to load submissions: {error.message}</p>
      ) : (
        <DashboardTable rows={(data ?? []) as AssessmentRow[]} />
      )}
    </main>
  );
}
```

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/dashboard/DashboardTable.tsx src/app/dashboard/DashboardTable.test.tsx src/app/dashboard/SignOutButton.tsx src/app/dashboard/page.tsx
git commit -m "Add dashboard page with sortable, filterable submissions table"
```

---

### Task 9: Deploy to Vercel and verify end-to-end

**Files:** none (infrastructure/deployment task)

**Interfaces:**
- Consumes: everything built in Tasks 1–8.
- Produces: a live deployment URL with a working assessment form, notification email, and authenticated dashboard.

- [ ] **Step 1: Push all commits to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Create a Vercel project linked to `https://github.com/Mednova-lifesciences/assessment.git`**

Use the Vercel dashboard (or Vercel CLI/MCP tooling if connected) to import the repo, framework preset "Next.js", root directory `.`.

- [ ] **Step 3: Set environment variables on the Vercel project**

Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `NOTIFY_EMAIL` for the Production environment, using the same values already in local `.env.local`. Enter these directly into the Vercel dashboard's environment variable form (or `vercel env add <NAME>` one at a time, pasting the value at its interactive prompt) — never echo the values to a terminal.

- [ ] **Step 4: Create a Supabase Auth user for dashboard access**

In the Supabase dashboard for the shared project: Authentication → Users → Add user. Create at least one email/password account for MedNova staff. (This is manual — the app has no self-registration flow, by design.)

- [ ] **Step 5: Trigger the deploy and confirm it builds successfully**

Deploy via the Vercel dashboard's "Deploy" action (or `git push` if auto-deploy is already wired up). Confirm the build log shows a successful `next build` and the deployment status is "Ready".

- [ ] **Step 6: End-to-end verification against the live URL**

1. Open the deployed URL, fill out and submit the assessment form with test data (e.g. company "E2E Test Co").
2. Confirm the results panel renders with a score, risk badge, and gap lists.
3. Confirm a new row exists in `nafdac_assessments` for "E2E Test Co" (via the Supabase SQL editor or table editor).
4. Confirm the notification email arrived at `info@mednovalife.com`.
5. Visit `/dashboard` while logged out — confirm it redirects to `/login`.
6. Log in with the staff account created in Step 4 — confirm `/dashboard` now loads and lists the "E2E Test Co" submission, and that filtering/sorting/expanding it works.
7. Click "Sign out" — confirm it redirects to `/login` and `/dashboard` is inaccessible again.

- [ ] **Step 7: Commit anything left uncommitted (e.g. deployment config files Vercel adds)**

```bash
git status
git add -A
git commit -m "Add Vercel deployment config" --allow-empty
git push origin main
```
