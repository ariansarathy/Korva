import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { CommandPalette } from "@/components/shared/command-palette";
import { isDemoMode, DEMO_USER } from "@/lib/demo";

export const dynamic = "force-dynamic";

async function getUser() {
  // Demo mode — return mock user
  if (isDemoMode()) {
    return {
      email: DEMO_USER.email,
      user_metadata: { full_name: DEMO_USER.full_name },
    };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    // Supabase not configured yet — return null
    return null;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userEmail={user?.email}
          userName={user?.user_metadata?.full_name}
        />
        <CommandPalette />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
