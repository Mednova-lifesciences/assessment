'use client';

import { Fragment, useMemo, useState } from 'react';
import { QUESTIONS } from '@/lib/questions';

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
                    <div className="mb-2">
                      <p className="font-semibold">Answers</p>
                      <ul className="list-disc pl-5">
                        {QUESTIONS.map((question, index) => (
                          <li key={question.id}>
                            {index + 1}. {question.text} — <span className="font-medium">{row.answers[question.id] ?? '—'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
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
