'use client';

import { useRef, useState, type FormEvent } from 'react';
import { QUESTIONS, type QuestionId } from '@/lib/questions';
import type { Answer, Answers, ScoreResult } from '@/lib/scoring';
import { gtagEvent } from '@/lib/analytics';

const ANSWER_OPTIONS: Answer[] = ['Yes', 'No', 'In Progress'];

const RISK_STYLES = {
  Low: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  Moderate: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  High: 'bg-red-100 text-red-700 ring-red-600/20'
} as const;

const CONTACT_MAILTO =
  'mailto:info@mednovalife.com?subject=PV%20Support%20Inquiry&body=Hello%20MedNova%20team%2C%0A%0AI%20would%20like%20to%20speak%20with%20you%20about%20your%20pharmacovigilance%20services.';

function initialAnswers(): Answers {
  const answers = {} as Answers;
  for (const question of QUESTIONS) {
    answers[question.id] = 'No';
  }
  return answers;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';
type ProposalStatus = 'idle' | 'sending' | 'done' | 'error';

export default function Home() {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('idle');
  const startedRef = useRef(false);

  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    gtagEvent('assessment_start');
  }

  function setAnswer(id: QuestionId, value: Answer) {
    markStarted();
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
      setSubmissionId(typeof data.id === 'string' ? data.id : null);
      setStatus('success');
      gtagEvent('assessment_complete', {
        score: data.result.score,
        risk_level: data.result.riskLevel
      });
      window.scrollTo({ top: 0 });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  async function handleRequestProposal() {
    setProposalStatus('sending');
    if (!submissionId) {
      setProposalStatus('error');
      return;
    }
    try {
      const response = await fetch('/api/request-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submissionId })
      });
      if (!response.ok) {
        throw new Error('Request failed');
      }
      setProposalStatus('done');
      gtagEvent('proposal_request', { score: result?.score, risk_level: result?.riskLevel });
    } catch {
      setProposalStatus('error');
    }
  }

  function resetForm() {
    setAnswers(initialAnswers());
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setStatus('idle');
    setErrorMessage('');
    setResult(null);
    setSubmissionId(null);
    setProposalStatus('idle');
    window.scrollTo({ top: 0 });
  }

  if (status === 'success' && result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
            <img src="/logo.png" alt="MedNova Lifesciences logo" width={132} height={47} className="h-9 w-auto" />
            <a href={CONTACT_MAILTO} className="text-sm font-medium text-gray-500 transition hover:text-brand">
              Contact us
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg sm:p-10">
            <p className="text-center text-sm font-medium uppercase tracking-widest text-gray-400">
              Your Compliance Score
            </p>

            <div className="mt-6 flex flex-col items-center">
              <div className="relative h-44 w-44 rounded-full"
                style={{ background: `conic-gradient(#0F52BA ${result.score * 3.6}deg, #E5E7EB 0deg)` }}>
                <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                  <span className="text-4xl font-extrabold text-gray-900">{result.score}%</span>
                  <span className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400">Ready</span>
                </div>
              </div>
              <span className={`mt-5 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${RISK_STYLES[result.riskLevel]}`}>
                {result.riskLevel} Risk
              </span>
            </div>

            {result.criticalGaps.length > 0 && (
              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  🛑 Critical Compliance Exposure Points
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">{result.criticalGaps.length}</span>
                </h2>
                <ul className="mt-4 space-y-3">
                  {result.criticalGaps.map((gap, index) => (
                    <li key={index} className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4 text-sm leading-relaxed text-gray-700">
                      {gap}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.generalGaps.length > 0 && (
              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  ⚠️ Process Optimization Gaps
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">{result.generalGaps.length}</span>
                </h2>
                <ul className="mt-4 space-y-3">
                  {result.generalGaps.map((gap, index) => (
                    <li key={index} className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4 text-sm leading-relaxed text-gray-700">
                      {gap}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-10 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-6 ring-1 ring-blue-100 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">🚀 Close Your Compliance Gaps with MedNova Lifesciences</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                MedNova provides fully outsourced, NAFDAC-compliant resident QPPV services, Local Safety
                Officers (LSOs), local literature monitoring, and turn-key inspection-readiness support.
              </p>

              {proposalStatus === 'done' ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 px-5 py-4 ring-1 ring-emerald-200">
                  <span className="text-xl leading-none">✅</span>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Request received!</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-emerald-700">
                      Thank you — our team will reach out to <span className="font-semibold">{email}</span> shortly
                      with your QPPV retainer proposal.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <button
                    onClick={handleRequestProposal}
                    disabled={proposalStatus === 'sending'}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                  >
                    {proposalStatus === 'sending' ? 'Sending request…' : 'Request a QPPV Retainer Proposal →'}
                  </button>
                  {proposalStatus === 'error' && (
                    <p className="mt-2 text-xs text-red-600">
                      We couldn&apos;t record your request automatically — please email us directly instead.
                    </p>
                  )}
                  <p className="mt-3 text-xs text-gray-400">
                    Prefer email?{' '}
                    <a
                      className="font-medium text-brand underline"
                      href="mailto:info@mednovalife.com?subject=NAFDAC%20Ready%20Proposal%20Request"
                    >
                      Request a QPPV Retainer Proposal by email
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-brand hover:text-brand"
            >
              ↺ Submit Another Response
            </button>
          </div>
        </main>
        <footer className="pb-10 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} MedNova Lifesciences · Pharmacovigilance done right.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <img src="/logo.png" alt="MedNova Lifesciences logo" width={132} height={47} className="h-9 w-auto" />
          <a href={CONTACT_MAILTO} className="text-sm font-medium text-gray-500 transition hover:text-brand">
            Contact us
          </a>
        </div>
      </header>

      <section className="bg-gradient-to-br from-brand to-[#062d6e]">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            NAFDAC QPPV &amp; PV Compliance Readiness Assessment
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100">
            Under NAFDAC&apos;s pharmacovigilance guidelines — reinforced by Nigeria&apos;s WHO ML3
            status — Marketing Authorization Holders must maintain strict, continuous, in-country safety monitoring.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {['⏱ Takes ~2 minutes', '📊 Instant score & gap report', '🔒 No signup needed'].map((chip) => (
              <span key={chip} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-blue-50 ring-1 ring-white/20 backdrop-blur">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-8 max-w-3xl px-6 pb-16">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-sm font-semibold text-gray-700">Your details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="companyName">Company Name</label>
                <input
                  id="companyName"
                  required
                  value={companyName}
                  onChange={(event) => { markStarted(); setCompanyName(event.target.value); }}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="contactName">Contact Name</label>
                <input
                  id="contactName"
                  required
                  value={contactName}
                  onChange={(event) => { markStarted(); setContactName(event.target.value); }}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => { markStarted(); setEmail(event.target.value); }}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="phone">Phone Number <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => { markStarted(); setPhone(event.target.value); }}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {QUESTIONS.map((question, index) => (
              <div key={question.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-medium leading-relaxed text-gray-900">{question.text}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 pl-12">
                  {ANSWER_OPTIONS.map((option) => {
                    const selected = answers[question.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAnswer(question.id, option)}
                        aria-pressed={selected}
                        className={`rounded-full border px-5 py-1.5 text-sm font-medium transition ${
                          selected
                            ? 'border-brand bg-brand text-white shadow-sm'
                            : 'border-gray-300 bg-white text-gray-500 hover:border-brand hover:text-brand'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {status === 'error' && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-[#0B3F91] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:min-w-[280px]"
          >
            {status === 'submitting' ? 'Scoring your assessment…' : 'Get My Readiness Score →'}
          </button>
        </form>
      </main>

      <footer className="border-t border-gray-100 bg-white py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} MedNova Lifesciences · info@mednovalife.com
      </footer>
    </div>
  );
}
