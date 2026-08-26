'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignOutButton() {
  async function handleSignOut() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out API failures — still send the user to the login page.
    }
    window.location.assign('/login');
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-sm font-medium text-gray-500 transition hover:border-red-300 hover:text-red-600"
    >
      Sign out
    </button>
  );
}
