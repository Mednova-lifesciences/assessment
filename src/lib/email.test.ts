import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: { emails: { send: typeof sendMock } }) {
    this.emails = { send: sendMock };
  })
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

  it('escapes HTML in user input fields to prevent injection', async () => {
    const maliciousInput = {
      ...baseInput,
      companyName: '<script>alert("xss")</script>',
      contactName: 'Jane<img src=x onerror="alert(1)">',
      email: 'test@example.com<script>',
      phone: '<a href="javascript:void(0)">Click me</a>'
    };
    await sendAssessmentNotification(maliciousInput);

    const call = sendMock.mock.calls[0][0];
    // Verify raw unescaped HTML tags are not present
    expect(call.html).not.toContain('<script>');
    expect(call.html).not.toContain('<img ');
    expect(call.html).not.toContain('<a ');
    // Verify escaped forms are present - these prevent XSS
    expect(call.html).toContain('&lt;script&gt;');
    expect(call.html).toContain('&lt;img');
    expect(call.html).toContain('&lt;a href');
  });
});
