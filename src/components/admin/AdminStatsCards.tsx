import { useState, useEffect } from "react";
import { Users, UserPlus, DollarSign, HandCoins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatCard {
  title: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
}

export const AdminStatsCards = () => {
  const [stats, setStats] = useState({
    activeMembers: 0,
    dailyJoins: 0,
    totalRevenue: 0,
    totalCommissionsPaid: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Get total active members (profiles count)
      const { count: activeMembers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get daily joins (profiles created today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: dailyJoins } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Get total subscription revenue (sum of all active/completed subscriptions)
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("amount")
        .in("status", ["active", "completed"]);

      const totalRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;

      // Get total commissions paid
      const { data: commissions } = await supabase
        .from("commissions")
        .select("amount")
        .eq("status", "paid");

      const totalCommissionsPaid = commissions?.reduce((sum, com) => sum + (com.amount || 0), 0) || 0;

      setStats({
        activeMembers: activeMembers || 0,
        dailyJoins: dailyJoins || 0,
        totalRevenue,
        totalCommissionsPaid,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription for profiles
    const profilesChannel = supabase
      .channel("admin-profiles-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchStats()
      )
      .subscribe();

    // Set up real-time subscription for subscriptions
    const subscriptionsChannel = supabase
      .channel("admin-subscriptions-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => fetchStats()
      )
      .subscribe();

    // Set up real-time subscription for commissions
    const commissionsChannel = supabase
      .channel("admin-commissions-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commissions" },
        () => fetchStats()
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(subscriptionsChannel);
      supabase.removeChannel(commissionsChannel);
      clearInterval(interval);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const statCards: StatCard[] = [
    {
      title: "Total Active Members",
      value: loading ? "..." : stats.activeMembers.toLocaleString(),
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      shadowColor: "shadow-blue-500/30",
    },
    {
      title: "Daily New Members",
      value: loading ? "..." : stats.dailyJoins.toLocaleString(),
      icon: UserPlus,
      gradient: "from-emerald-500 to-teal-500",
      shadowColor: "shadow-emerald-500/30",
    },
    {
      title: "Total Subscription Revenue",
      value: loading ? "..." : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      gradient: "from-purple-500 to-pink-500",
      shadowColor: "shadow-purple-500/30",
    },
    {
      title: "Total Commissions Paid",
      value: loading ? "..." : formatCurrency(stats.totalCommissionsPaid),
      icon: HandCoins,
      gradient: "from-orange-500 to-amber-500",
      shadowColor: "shadow-orange-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.title}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-6 text-white shadow-lg ${card.shadowColor} transition-transform hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80 mb-1">{card.title}</p>
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <IconComponent className="w-6 h-6 text-white" />
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
          </div>
        );
      })}
    </div>
  );
};
