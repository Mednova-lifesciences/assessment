// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DashboardTable, type AssessmentRow } from './DashboardTable';

afterEach(cleanup);

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
    answers: { q1: 'No', q2: 'Yes', q3: 'In Progress' },
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

  it('expands a row to show full question text with each answer', () => {
    render(<DashboardTable rows={rows} />);
    fireEvent.click(screen.getByText('Beta Biotech'));
    expect(screen.getByText(/permanently resident, qualified QPPV/)).toHaveTextContent('No');
    expect(screen.getByText(/formally designated deputy\/backup QPPV/)).toHaveTextContent('Yes');
    expect(screen.getByText(/named Local Safety Officer/)).toHaveTextContent('In Progress');
  });
});
