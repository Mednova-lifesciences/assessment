// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('filters by risk level', async () => {
    const user = userEvent.setup();
    render(<DashboardTable rows={rows} />);
    await user.selectOptions(screen.getByLabelText('Filter by risk'), 'High');
    await waitFor(() => {
      expect(screen.queryByText('Acme Pharma')).not.toBeInTheDocument();
      expect(screen.getByText('Beta Biotech')).toBeInTheDocument();
    });
  });

  it('expands a row to show its gaps on click', async () => {
    const user = userEvent.setup();
    render(<DashboardTable rows={rows} />);
    await user.click(screen.getAllByText('Beta Biotech')[0]);
    expect(screen.getByText('Missing resident QPPV.')).toBeInTheDocument();
  });
});
