import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, UserPlus, DollarSign, HandCoins, Clock, XCircle, 
  FileText, Flag, AlertTriangle, Activity, MessageSquare, Heart,
  TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatCard {
  title: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
  category: "members" | "financial" | "content" | "engagement";
  link?: string;
  trend?: {
    value: number;
    isPercentage: boolean;
  };
}

export const AdminStatsCards = () => {
  const navigate = useNavigate();
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

  // Yesterday's stats for trends
  const [yesterdayStats, setYesterdayStats] = useState({
    dailyJoins: 0,
    todayRevenue: 0,
    cancellations: 0,
    postsToday: 0,
    commentsToday: 0,
    reactionsToday: 0,
  });

  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // ========== MEMBER STATS ==========
      const { count: activeMembers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: dailyJoins } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Yesterday's joins for trend
      const { count: yesterdayJoins } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

      const { count: activeUsers24h } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", last24h.toISOString());

      // ========== FINANCIAL STATS ==========
      const { data: allSubscriptions } = await supabase
        .from("subscriptions")
        .select("amount, status, created_at");

      const totalRevenue = allSubscriptions?.reduce((sum, sub) => 
        ["active", "completed"].includes(sub.status) ? sum + (sub.amount || 0) : sum, 0) || 0;

      const todayRevenue = allSubscriptions?.reduce((sum, sub) => {
        const createdAt = new Date(sub.created_at);
        if (createdAt >= today && ["active", "completed"].includes(sub.status)) {
          return sum + (sub.amount || 0);
        }
        return sum;
      }, 0) || 0;

      // Yesterday's revenue for trend
      const yesterdayRevenue = allSubscriptions?.reduce((sum, sub) => {
        const createdAt = new Date(sub.created_at);
        if (createdAt >= yesterday && createdAt < today && ["active", "completed"].includes(sub.status)) {
          return sum + (sub.amount || 0);
        }
        return sum;
      }, 0) || 0;

      const cancellations = allSubscriptions?.filter(sub => {
        const createdAt = new Date(sub.created_at);
        return createdAt >= today && sub.status === "canceled";
      }).length || 0;

      // Yesterday's cancellations
      const yesterdayCancellations = allSubscriptions?.filter(sub => {
        const createdAt = new Date(sub.created_at);
        return createdAt >= yesterday && createdAt < today && sub.status === "canceled";
      }).length || 0;

      const { data: allCommissions } = await supabase
        .from("commissions")
        .select("amount, status");

      const totalCommissionsPaid = allCommissions?.reduce((sum, com) => 
        com.status === "paid" ? sum + (com.amount || 0) : sum, 0) || 0;

      const pendingCommissions = allCommissions?.reduce((sum, com) => 
        com.status === "pending" ? sum + (com.amount || 0) : sum, 0) || 0;

      // ========== CONTENT & MODERATION STATS ==========
      const { count: postsToday } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Yesterday's posts
      const { count: yesterdayPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

      const { count: pendingReports } = await supabase
        .from("group_content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: flaggedContent } = await supabase
        .from("group_content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "resolved");

      // ========== ENGAGEMENT STATS ==========
      const { count: commentsToday } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Yesterday's comments
      const { count: yesterdayComments } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

      const { count: reactionsToday } = await supabase
        .from("post_reactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Yesterday's reactions
      const { count: yesterdayReactions } = await supabase
        .from("post_reactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

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

      setYesterdayStats({
        dailyJoins: yesterdayJoins || 0,
        todayRevenue: yesterdayRevenue,
        cancellations: yesterdayCancellations,
        postsToday: yesterdayPosts || 0,
        commentsToday: yesterdayComments || 0,
        reactionsToday: yesterdayReactions || 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

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

  // Calculate trend percentage
  const calcTrend = (today: number, yesterday: number): number => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const statCards: StatCard[] = [
    // Member Stats
    {
      title: "Total Active Members",
      value: loading ? "..." : stats.activeMembers.toLocaleString(),
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      shadowColor: "shadow-blue-500/30",
      category: "members",
      link: "/admin/users/list",
    },
    {
      title: "Daily New Members",
      value: loading ? "..." : stats.dailyJoins.toLocaleString(),
      icon: UserPlus,
      gradient: "from-blue-600 to-blue-400",
      shadowColor: "shadow-blue-500/30",
      category: "members",
      link: "/admin/users/list?filter=today",
      trend: { value: calcTrend(stats.dailyJoins, yesterdayStats.dailyJoins), isPercentage: true },
    },
    {
      title: "Active Users (24h)",
      value: loading ? "..." : stats.activeUsers24h.toLocaleString(),
      icon: Activity,
      gradient: "from-cyan-500 to-teal-500",
      shadowColor: "shadow-cyan-500/30",
      category: "members",
      link: "/admin/users/list?filter=active24h",
    },
    // Financial Stats
    {
      title: "Total Revenue",
      value: loading ? "..." : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      gradient: "from-purple-500 to-pink-500",
      shadowColor: "shadow-purple-500/30",
      category: "financial",
      link: "/commissions",
    },
    {
      title: "Today's Revenue",
      value: loading ? "..." : formatCurrency(stats.todayRevenue),
      icon: Clock,
      gradient: "from-fuchsia-500 to-purple-500",
      shadowColor: "shadow-fuchsia-500/30",
      category: "financial",
      link: "/commissions",
      trend: { value: calcTrend(stats.todayRevenue, yesterdayStats.todayRevenue), isPercentage: true },
    },
    {
      title: "Commissions Paid",
      value: loading ? "..." : formatCurrency(stats.totalCommissionsPaid),
      icon: HandCoins,
      gradient: "from-violet-500 to-purple-500",
      shadowColor: "shadow-violet-500/30",
      category: "financial",
      link: "/commissions",
    },
    {
      title: "Pending Commissions",
      value: loading ? "..." : formatCurrency(stats.pendingCommissions),
      icon: Clock,
      gradient: "from-pink-500 to-rose-500",
      shadowColor: "shadow-pink-500/30",
      category: "financial",
      link: "/commissions",
    },
    {
      title: "Cancellations Today",
      value: loading ? "..." : stats.cancellations.toLocaleString(),
      icon: XCircle,
      gradient: "from-rose-500 to-red-500",
      shadowColor: "shadow-rose-500/30",
      category: "financial",
      trend: { value: calcTrend(stats.cancellations, yesterdayStats.cancellations), isPercentage: true },
    },
    // Content & Moderation Stats
    {
      title: "Posts Today",
      value: loading ? "..." : stats.postsToday.toLocaleString(),
      icon: FileText,
      gradient: "from-orange-500 to-amber-500",
      shadowColor: "shadow-orange-500/30",
      category: "content",
      trend: { value: calcTrend(stats.postsToday, yesterdayStats.postsToday), isPercentage: true },
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
    // Engagement Stats
    {
      title: "Comments Today",
      value: loading ? "..." : stats.commentsToday.toLocaleString(),
      icon: MessageSquare,
      gradient: "from-emerald-500 to-teal-500",
      shadowColor: "shadow-emerald-500/30",
      category: "engagement",
      trend: { value: calcTrend(stats.commentsToday, yesterdayStats.commentsToday), isPercentage: true },
    },
    {
      title: "Reactions Today",
      value: loading ? "..." : stats.reactionsToday.toLocaleString(),
      icon: Heart,
      gradient: "from-teal-500 to-green-500",
      shadowColor: "shadow-teal-500/30",
      category: "engagement",
      trend: { value: calcTrend(stats.reactionsToday, yesterdayStats.reactionsToday), isPercentage: true },
    },
  ];

  const categories = [
    { key: "members", title: "👥 Member Stats", color: "text-blue-600" },
    { key: "financial", title: "💰 Financial Stats", color: "text-purple-600" },
    { key: "content", title: "📝 Content & Moderation", color: "text-orange-600" },
    { key: "engagement", title: "💬 Engagement Stats", color: "text-emerald-600" },
  ];

  const TrendIndicator = ({ trend }: { trend?: { value: number; isPercentage: boolean } }) => {
    if (!trend || loading) return null;
    
    const { value } = trend;
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    return (
      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
        isNeutral ? 'text-white/60' : isPositive ? 'text-emerald-200' : 'text-red-200'
      }`}>
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{isPositive ? '+' : ''}{value}% vs yesterday</span>
      </div>
    );
  };

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
                    onClick={() => card.link && navigate(card.link)}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-lg ${card.shadowColor} transition-transform hover:scale-[1.02] ${card.link ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-white/80 mb-1">{card.title}</p>
                        <p className="text-2xl font-bold">{card.value}</p>
                        <TrendIndicator trend={card.trend} />
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
