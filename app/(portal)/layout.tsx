import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

// Auth check happens on every request — skip static generation entirely
// (env vars don't exist at build time on preview deployments).
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen relative">
      {/* Ambient gold glow — bottom right */}
      <div
        className="fixed bottom-0 right-0 w-[700px] h-[700px] rounded-full opacity-15 pointer-events-none blur-3xl translate-x-1/3 translate-y-1/3"
        style={{
          background:
            "radial-gradient(circle, rgba(212,168,83,0.25) 0%, transparent 60%)",
        }}
      />

      <Sidebar
        userEmail={user.email!}
        userName={profile?.full_name ?? null}
        userRole={profile?.role ?? "team_member"}
      />

      <div className="ml-64 lg:ml-72 relative">
        <Topbar />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
