'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
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
  proposal_requested?: boolean;
}

type RiskFilter = 'All' | 'Low' | 'Moderate' | 'High';
type ProposalFilter = 'All' | 'Requested' | 'Not requested';

const PAGE_SIZE = 10;

const RISK_BADGE_STYLES = {
  Low: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Moderate: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  High: 'bg-red-50 text-red-700 ring-red-600/20'
} as const;

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}

export function DashboardTable({ rows }: { rows: AssessmentRow[] }) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('All');
  const [proposalFilter, setProposalFilter] = useState<ProposalFilter>('All');
  const [sortAscending, setSortAscending] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: rows.length,
      avgScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0,
      high: rows.filter((row) => row.risk_level === 'High').length,
      low: rows.filter((row) => row.risk_level === 'Low').length,
      proposals: rows.filter((row) => row.proposal_requested).length
    }),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let filtered = rows;
    if (riskFilter !== 'All') {
      filtered = filtered.filter((row) => row.risk_level === riskFilter);
    }
    if (proposalFilter !== 'All') {
      filtered = filtered.filter((row) =>
        proposalFilter === 'Requested' ? Boolean(row.proposal_requested) : !row.proposal_requested
      );
    }
    if (query) {
      filtered = filtered.filter((row) =>
        [row.company_name, row.contact_name, row.email].some((field) => field.toLowerCase().includes(query))
      );
    }
    return [...filtered].sort((a, b) => (sortAscending ? a.score - b.score : b.score - a.score));
  }, [rows, search, riskFilter, proposalFilter, sortAscending]);

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [search, riskFilter, proposalFilter, sortAscending]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = visibleRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, visibleRows.length);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Companies" value={String(stats.total)} accent="text-brand" />
        <StatCard label="Average Score" value={`${stats.avgScore}%`} accent="text-gray-900" />
        <StatCard label="High Risk" value={String(stats.high)} accent="text-red-600" />
        <StatCard label="Low Risk" value={String(stats.low)} accent="text-emerald-600" />
        <StatCard label="Proposals" value={String(stats.proposals)} accent="text-amber-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="sr-only" htmlFor="tableSearch">Search</label>
          <input
            id="tableSearch"
            type="search"
            placeholder="Search company, contact or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="riskFilter">Filter by risk</label>
          <select
            id="riskFilter"
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          >
            <option value="All">All risks</option>
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="proposalFilter">Filter by proposal</label>
          <select
            id="proposalFilter"
            value={proposalFilter}
            onChange={(event) => setProposalFilter(event.target.value as ProposalFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          >
            <option value="All">All proposals</option>
            <option value="Requested">Proposal requested</option>
            <option value="Not requested">No proposal request</option>
          </select>
        </div>
        <button
          onClick={() => setSortAscending((value) => !value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-brand hover:text-brand"
        >
          Score {sortAscending ? '↑ Low → High' : '↓ High → Low'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500">Company</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Contact</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Score</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Risk</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Proposal</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className={`cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/40 ${
                    expandedId === row.id ? 'bg-blue-50/60' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                >
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{row.company_name}</td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {row.contact_name} · {row.email}{row.phone ? ` · ${row.phone}` : ''}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-gray-900">{row.score}%</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${RISK_BADGE_STYLES[row.risk_level]}`}>
                      {row.risk_level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {row.proposal_requested ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-900 ring-1 ring-amber-400">
                        ★ Requested
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
                {expandedId === row.id && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td colSpan={6} className="px-8 py-4">
                      <div className="mb-3">
                        <p className="font-semibold text-gray-900">Answers</p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-gray-700">
                          {QUESTIONS.map((question, index) => (
                            <li key={question.id}>
                              {index + 1}. {question.text} — <span className="font-medium text-gray-900">{row.answers[question.id] ?? '—'}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {row.critical_gaps.length > 0 && (
                        <div className="mb-3">
                          <p className="font-semibold text-red-700">Critical gaps</p>
                          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-gray-700">
                            {row.critical_gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                          </ul>
                        </div>
                      )}
                      {row.general_gaps.length > 0 && (
                        <div>
                          <p className="font-semibold text-blue-700">General gaps</p>
                          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-gray-700">
                            {row.general_gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                          </ul>
                        </div>
                      )}
                      {row.critical_gaps.length === 0 && row.general_gaps.length === 0 && (
                        <p className="text-gray-500">No gaps flagged.</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">No submissions match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3.5 text-sm text-gray-500">
          <span>
            Showing {rangeStart}–{rangeEnd} of {visibleRows.length} submission{visibleRows.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.min(currentPage - 1, totalPages))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium transition enabled:hover:border-brand enabled:hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="min-w-[80px] text-center text-xs font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.max(1, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium transition enabled:hover:border-brand enabled:hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
