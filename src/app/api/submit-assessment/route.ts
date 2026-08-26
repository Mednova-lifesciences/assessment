import { NextResponse } from 'next/server';
import { scoreAssessment, isValidAnswers, type Answers } from '@/lib/scoring';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { sendAssessmentNotification } from '@/lib/email';
import { QUESTIONS } from '@/lib/questions';

interface SubmitAssessmentBody {
  companyName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  answers?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 200;

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

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }

  const phoneValue = isNonEmptyString(phone) ? phone : null;

  if (
    companyName.length > MAX_FIELD_LENGTH ||
    contactName.length > MAX_FIELD_LENGTH ||
    email.length > MAX_FIELD_LENGTH ||
    (phoneValue !== null && phoneValue.length > MAX_FIELD_LENGTH)
  ) {
    return NextResponse.json(
      { error: 'Company name, contact name, email, and phone must be 200 characters or fewer.' },
      { status: 400 }
    );
  }

  if (!isValidAnswers(answers)) {
    return NextResponse.json({ error: 'All 10 questions must be answered.' }, { status: 400 });
  }

  const normalizedAnswers = Object.fromEntries(
    QUESTIONS.map((q) => [q.id, answers[q.id]])
  ) as Answers;

  const result = scoreAssessment(normalizedAnswers);

  const supabase = createServiceRoleSupabaseClient();
  const { data: insertedRow, error: insertError } = await supabase
    .from('nafdac_assessments')
    .insert({
      company_name: companyName,
      contact_name: contactName,
      email,
      phone: phoneValue,
      score: result.score,
      risk_level: result.riskLevel,
      answers: normalizedAnswers,
      critical_gaps: result.criticalGaps,
      general_gaps: result.generalGaps
    })
    .select('id')
    .single();

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

  return NextResponse.json({ result, id: insertedRow?.id ?? null });
}
