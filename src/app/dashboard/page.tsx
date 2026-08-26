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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <img src="/logo.png" alt="MedNova Lifesciences logo" width={132} height={47} className="h-9 w-auto" />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">NAFDAC Readiness Submissions</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor incoming assessments from prospective clients.</p>
        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Unable to load submissions: {error.message}</p>
        ) : (
          <DashboardTable rows={(data ?? []) as AssessmentRow[]} />
        )}
      </main>
    </div>
  );
}
