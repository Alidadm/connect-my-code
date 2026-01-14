import { useState, useEffect } from "react";
import { 
  Users, UserPlus, DollarSign, HandCoins, Clock, XCircle, 
  FileText, Flag, AlertTriangle, Activity, MessageSquare, Heart,
  UserX, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatCard {
  title: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
  category: "members" | "financial" | "content" | "engagement";
}

export const AdminStatsCards = () => {
  const [stats, setStats] = useState({
    // Member stats
    activeMembers: 0,
    dailyJoins: 0,
    activeUsers24h: 0,
    // Financial stats
    totalRevenue: 0,
    todayRevenue: 0,
    totalCommissionsPaid: 0,
    pendingCommissions: 0,
    cancellations: 0,
    // Content & Moderation stats
    postsToday: 0,
    pendingReports: 0,
    flaggedContent: 0,
    // Engagement stats
    commentsToday: 0,
    reactionsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // ========== MEMBER STATS ==========
      // Get total active members
      const { count: activeMembers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get daily joins
      const { count: dailyJoins } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Get active users in last 24h (users who updated their profile or posted)
      const { count: activeUsers24h } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", last24h.toISOString());

      // ========== FINANCIAL STATS ==========
      // Get total subscription revenue
      const { data: allSubscriptions } = await supabase
        .from("subscriptions")
        .select("amount, status, created_at");

      const totalRevenue = allSubscriptions?.reduce((sum, sub) => 
        ["active", "completed"].includes(sub.status) ? sum + (sub.amount || 0) : sum, 0) || 0;

      // Today's revenue
      const todayRevenue = allSubscriptions?.reduce((sum, sub) => {
        const createdAt = new Date(sub.created_at);
        if (createdAt >= today && ["active", "completed"].includes(sub.status)) {
          return sum + (sub.amount || 0);
        }
        return sum;
      }, 0) || 0;

      // Cancellations today
      const cancellations = allSubscriptions?.filter(sub => {
        const createdAt = new Date(sub.created_at);
        return createdAt >= today && sub.status === "canceled";
      }).length || 0;

      // Get commissions data
      const { data: allCommissions } = await supabase
        .from("commissions")
        .select("amount, status");

      const totalCommissionsPaid = allCommissions?.reduce((sum, com) => 
        com.status === "paid" ? sum + (com.amount || 0) : sum, 0) || 0;

      const pendingCommissions = allCommissions?.reduce((sum, com) => 
        com.status === "pending" ? sum + (com.amount || 0) : sum, 0) || 0;

      // ========== CONTENT & MODERATION STATS ==========
      // Posts created today
      const { count: postsToday } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Pending content reports
      const { count: pendingReports } = await supabase
        .from("group_content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Flagged content (resolved reports count as flagged items caught)
      const { count: flaggedContent } = await supabase
        .from("group_content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "resolved");

      // ========== ENGAGEMENT STATS ==========
      // Comments today
      const { count: commentsToday } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Reactions today
      const { count: reactionsToday } = await supabase
        .from("post_reactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      setStats({
        activeMembers: activeMembers || 0,
        dailyJoins: dailyJoins || 0,
        activeUsers24h: activeUsers24h || 0,
        totalRevenue,
        todayRevenue,
        totalCommissionsPaid,
        pendingCommissions,
        cancellations,
        postsToday: postsToday || 0,
        pendingReports: pendingReports || 0,
        flaggedContent: flaggedContent || 0,
        commentsToday: commentsToday || 0,
        reactionsToday: reactionsToday || 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscriptions
    const channels = [
      supabase.channel("admin-profiles").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchStats),
      supabase.channel("admin-subscriptions").on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, fetchStats),
      supabase.channel("admin-commissions").on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, fetchStats),
      supabase.channel("admin-posts").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, fetchStats),
      supabase.channel("admin-reports").on("postgres_changes", { event: "*", schema: "public", table: "group_content_reports" }, fetchStats),
      supabase.channel("admin-comments").on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, fetchStats),
      supabase.channel("admin-reactions").on("postgres_changes", { event: "*", schema: "public", table: "post_reactions" }, fetchStats),
    ];

    channels.forEach(ch => ch.subscribe());

    const interval = setInterval(fetchStats, 30000);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
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
    // Member Stats (Blue theme)
    {
      title: "Total Active Members",
      value: loading ? "..." : stats.activeMembers.toLocaleString(),
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      shadowColor: "shadow-blue-500/30",
      category: "members",
    },
    {
      title: "Daily New Members",
      value: loading ? "..." : stats.dailyJoins.toLocaleString(),
      icon: UserPlus,
      gradient: "from-blue-600 to-blue-400",
      shadowColor: "shadow-blue-500/30",
      category: "members",
    },
    {
      title: "Active Users (24h)",
      value: loading ? "..." : stats.activeUsers24h.toLocaleString(),
      icon: Activity,
      gradient: "from-cyan-500 to-teal-500",
      shadowColor: "shadow-cyan-500/30",
      category: "members",
    },
    // Financial Stats (Purple/Pink theme)
    {
      title: "Total Revenue",
      value: loading ? "..." : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      gradient: "from-purple-500 to-pink-500",
      shadowColor: "shadow-purple-500/30",
      category: "financial",
    },
    {
      title: "Today's Revenue",
      value: loading ? "..." : formatCurrency(stats.todayRevenue),
      icon: Clock,
      gradient: "from-fuchsia-500 to-purple-500",
      shadowColor: "shadow-fuchsia-500/30",
      category: "financial",
    },
    {
      title: "Commissions Paid",
      value: loading ? "..." : formatCurrency(stats.totalCommissionsPaid),
      icon: HandCoins,
      gradient: "from-violet-500 to-purple-500",
      shadowColor: "shadow-violet-500/30",
      category: "financial",
    },
    {
      title: "Pending Commissions",
      value: loading ? "..." : formatCurrency(stats.pendingCommissions),
      icon: Clock,
      gradient: "from-pink-500 to-rose-500",
      shadowColor: "shadow-pink-500/30",
      category: "financial",
    },
    {
      title: "Cancellations Today",
      value: loading ? "..." : stats.cancellations.toLocaleString(),
      icon: XCircle,
      gradient: "from-rose-500 to-red-500",
      shadowColor: "shadow-rose-500/30",
      category: "financial",
    },
    // Content & Moderation Stats (Orange/Amber theme)
    {
      title: "Posts Today",
      value: loading ? "..." : stats.postsToday.toLocaleString(),
      icon: FileText,
      gradient: "from-orange-500 to-amber-500",
      shadowColor: "shadow-orange-500/30",
      category: "content",
    },
    {
      title: "Pending Reports",
      value: loading ? "..." : stats.pendingReports.toLocaleString(),
      icon: Flag,
      gradient: "from-red-500 to-orange-500",
      shadowColor: "shadow-red-500/30",
      category: "content",
    },
    {
      title: "Flagged Content",
      value: loading ? "..." : stats.flaggedContent.toLocaleString(),
      icon: AlertTriangle,
      gradient: "from-amber-500 to-yellow-500",
      shadowColor: "shadow-amber-500/30",
      category: "content",
    },
    // Engagement Stats (Green theme)
    {
      title: "Comments Today",
      value: loading ? "..." : stats.commentsToday.toLocaleString(),
      icon: MessageSquare,
      gradient: "from-emerald-500 to-teal-500",
      shadowColor: "shadow-emerald-500/30",
      category: "engagement",
    },
    {
      title: "Reactions Today",
      value: loading ? "..." : stats.reactionsToday.toLocaleString(),
      icon: Heart,
      gradient: "from-teal-500 to-green-500",
      shadowColor: "shadow-teal-500/30",
      category: "engagement",
    },
  ];

  const categories = [
    { key: "members", title: "👥 Member Stats", color: "text-blue-600" },
    { key: "financial", title: "💰 Financial Stats", color: "text-purple-600" },
    { key: "content", title: "📝 Content & Moderation", color: "text-orange-600" },
    { key: "engagement", title: "💬 Engagement Stats", color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6 mb-6">
      {categories.map((category) => {
        const categoryCards = statCards.filter(card => card.category === category.key);
        return (
          <div key={category.key}>
            <h3 className={`text-sm font-semibold ${category.color} uppercase tracking-wider mb-3`}>
              {category.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categoryCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.title}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-lg ${card.shadowColor} transition-transform hover:scale-[1.02] cursor-pointer`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-white/80 mb-1">{card.title}</p>
                        <p className="text-2xl font-bold">{card.value}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/10" />
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
