import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { id } = body;
  if (typeof id !== 'string' || id.trim().length === 0) {
    return NextResponse.json({ error: 'A valid assessment id is required.' }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase
    .from('nafdac_assessments')
    .update({ proposal_requested: true })
    .eq('id', id);

  if (error) {
    console.error('[request-proposal] Failed to mark proposal request:', error.message);
    return NextResponse.json({ error: 'Unable to record your request right now.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
