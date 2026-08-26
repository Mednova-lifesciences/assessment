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
      <img
        src="/logo.png"
        alt="MedNova Lifesciences logo"
        width={132}
        height={47}
        className="h-12 w-auto"
      />
      <h1 className="mt-4 text-3xl font-bold text-brand">MedNova Lifesciences</h1>
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
