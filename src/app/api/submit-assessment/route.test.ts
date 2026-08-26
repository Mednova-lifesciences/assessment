import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertMock, singleMock, fromMock, sendAssessmentNotificationMock } = vi.hoisted(() => {
  return {
    insertMock: vi.fn(),
    singleMock: vi.fn(() => Promise.resolve({ data: { id: 'row-1' }, error: null })),
    fromMock: vi.fn(),
    sendAssessmentNotificationMock: vi.fn(() => Promise.resolve(undefined))
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleSupabaseClient: () => ({ from: fromMock })
}));

vi.mock('@/lib/email', () => ({
  sendAssessmentNotification: sendAssessmentNotificationMock
}));

fromMock.mockReturnValue({ insert: insertMock });
insertMock.mockReturnValue({ select: () => ({ single: singleMock }) });

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
  vi.clearAllMocks();
  singleMock.mockResolvedValue({ data: { id: 'row-1' }, error: null });
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
    expect(data.id).toBe('row-1');
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
