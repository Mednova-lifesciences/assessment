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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
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
      : `<h3>${escapeHtml(title)}</h3><ul>${gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join('')}</ul>`;

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <h1 style="color:#0F52BA;">New NAFDAC Readiness Assessment Submission</h1>
      <table cellpadding="6">
        <tr><td><strong>Company</strong></td><td>${escapeHtml(input.companyName)}</td></tr>
        <tr><td><strong>Contact</strong></td><td>${escapeHtml(input.contactName)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(input.email)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(input.phone ?? 'Not provided')}</td></tr>
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
