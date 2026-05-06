"use client";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/retailers": "Retailers",
  "/plans": "Plans",
};

export default function Topbar() {
  const pathname = usePathname();
  const title =
    titleMap[pathname] ||
    pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "";

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#050B17]/70 border-b border-white/[0.06]">
      <div className="px-8 py-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/35 tracking-wide mb-1">
            <span>Insurance Portal</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gold-400/80">{title}</span>
          </div>
          <h1 className="font-display text-2xl lg:text-3xl text-white tracking-tight leading-none">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
