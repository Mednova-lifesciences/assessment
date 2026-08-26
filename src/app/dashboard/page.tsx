import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DashboardTable, type AssessmentRow } from './DashboardTable';
import { SignOutButton } from './SignOutButton';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('nafdac_assessments')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">NAFDAC Readiness Assessment Submissions</h1>
        <SignOutButton />
      </div>
      {error ? (
        <p className="mt-6 text-red-600">Unable to load submissions: {error.message}</p>
      ) : (
        <DashboardTable rows={(data ?? []) as AssessmentRow[]} />
      )}
    </main>
  );
}
