import { Users, Store, IndianRupee, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";

export const dynamic = "force-dynamic";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default async function DashboardPage() {
  const supabase = await createClient();

  // Date helpers — IST
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 30);

  // Fetch customers in 4 buckets (Today / Week / Month / All)
  const customerRanges = [
    { label: "Today's", from: todayStart },
    { label: "Weekly", from: weekStart },
    { label: "Monthly", from: monthStart },
    { label: "All", from: null },
  ];

  const customerStats = await Promise.all(
    customerRanges.map(async ({ label, from }) => {
      let q = supabase
        .from("customers")
        .select("total_amount", { count: "exact" });
      if (from) q = q.gte("created_at", from.toISOString());
      const { data, count } = await q;
      const sum =
        data?.reduce((acc, r: { total_amount: number }) => acc + Number(r.total_amount || 0), 0) || 0;
      return { label, count: count || 0, sum };
    })
  );

  // Fetch retailers in 4 buckets
  const retailerStats = await Promise.all(
    customerRanges.map(async ({ label, from }) => {
      let q = supabase.from("retailers").select("id", { count: "exact", head: true });
      if (from) q = q.gte("created_at", from.toISOString());
      const { count } = await q;
      return { label, count: count || 0 };
    })
  );

  return (
    <div className="space-y-10 max-w-[1400px]">
      {/* Customers row */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-gold-400/90 mb-2">
              Customers
            </p>
            <h2 className="font-display text-2xl text-white">
              Warranty registrations
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {customerStats.map((s) => (
            <StatCard
              key={s.label}
              label={`${s.label} Customers`}
              value={s.count}
              subValue={fmtINR(s.sum)}
              icon={Users}
              accent="gold"
            />
          ))}
        </div>
      </section>

      {/* Retailers row */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-gold-400/90 mb-2">
              Retailers
            </p>
            <h2 className="font-display text-2xl text-white">
              Partner shops onboarded
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {retailerStats.map((s, i) => (
            <StatCard
              key={s.label}
              label={`${s.label} Retailers`}
              value={s.count}
              icon={[Store, TrendingUp, IndianRupee, Store][i]}
              accent={["sky", "emerald", "violet", "gold"][i] as "gold" | "emerald" | "sky" | "violet"}
            />
          ))}
        </div>
      </section>

      {/* Empty-state hint when nothing exists yet */}
      {customerStats[3].count === 0 && retailerStats[3].count === 0 && (
        <div className="glass-strong rounded-2xl p-8 text-center">
          <p className="font-display text-2xl text-white mb-3">
            Welcome to Credit Speed Insurance.
          </p>
          <p className="text-white/65 text-[15px] max-w-md mx-auto leading-relaxed">
            Start by adding your first retailer in the Retailers section, then
            register customers under that retailer to issue warranty documents.
          </p>
        </div>
      )}
    </div>
  );
}
