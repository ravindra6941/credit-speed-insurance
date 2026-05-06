"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  LogOut,
} from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Logo from "./Logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/retailers", label: "Retailers", icon: Store },
  { href: "/plans", label: "Plans", icon: Package },
];

export default function Sidebar({
  userEmail,
  userName,
  userRole,
}: {
  userEmail: string;
  userName: string | null;
  userRole: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 lg:w-72 fixed top-0 left-0 h-screen z-30 flex flex-col bg-[#040A14]/80 backdrop-blur-xl border-r border-white/[0.06]">
      {/* Brand */}
      <div className="px-6 py-7 border-b border-white/[0.06]">
        <Logo size="md" variant="lockup" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="px-4 mb-3 text-[10px] font-semibold tracking-[0.22em] uppercase text-white/30">
          Manage
        </p>
        <LayoutGroup>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative sidebar-item ${
                  isActive ? "" : "sidebar-item-default"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500"
                    style={{
                      boxShadow:
                        "0 4px 18px -4px rgba(212,168,83,0.55), inset 0 1px 0 0 rgba(255,255,255,0.25)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  className={`relative z-10 w-4 h-4 ${
                    isActive ? "text-navy-500" : ""
                  }`}
                />
                <span
                  className={`relative z-10 ${
                    isActive ? "text-navy-500 font-semibold" : ""
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </LayoutGroup>
      </nav>

      {/* User card */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-500 font-bold text-sm flex-shrink-0">
              {(userName || userEmail).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {userName || userEmail.split("@")[0]}
              </p>
              <p className="text-[10px] tracking-wide uppercase text-gold-400/80 font-semibold">
                {userRole === "admin" ? "Admin" : "Team"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                       bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.06] hover:border-red-500/25
                       text-white/65 hover:text-red-300 text-xs font-medium transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
