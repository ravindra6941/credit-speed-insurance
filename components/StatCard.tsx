import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  accent?: "gold" | "emerald" | "sky" | "violet";
};

const accentMap = {
  gold:    "from-gold-300/20 to-gold-500/5 border-gold-400/15 text-gold-400",
  emerald: "from-emerald-400/20 to-emerald-600/5 border-emerald-400/15 text-emerald-400",
  sky:     "from-sky-400/20 to-sky-600/5 border-sky-400/15 text-sky-400",
  violet:  "from-violet-400/20 to-violet-600/5 border-violet-400/15 text-violet-400",
};

export default function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  accent = "gold",
}: StatCardProps) {
  return (
    <div className="relative glass rounded-2xl p-5 hover:border-white/[0.18] transition-colors group">
      {/* Icon badge */}
      <div
        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${accentMap[accent]} border mb-4`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/40 mb-1.5">
        {label}
      </p>
      <p className="font-display text-3xl text-white tracking-tight leading-none">
        {value}
      </p>
      {subValue && (
        <p className="mt-2 text-[11px] text-gold-400/80 font-medium">
          {subValue}
        </p>
      )}

      {/* Subtle bottom highlight on hover */}
      <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
