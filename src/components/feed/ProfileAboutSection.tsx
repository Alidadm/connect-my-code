import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  MapPin, 
  Calendar, 
  Heart, 
  Briefcase,
  GraduationCap,
  Home,
  Phone,
  Users,
  Info,
  Flag,
  Plus,
  Settings,
  MoreHorizontal,
  Lock,
  Pencil,
  Globe
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProfileAboutSectionProps {
  userId: string | undefined;
}

type TabId = "overview" | "work" | "places" | "contact" | "family" | "details" | "events";

const tabs: { id: TabId; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work and education" },
  { id: "places", label: "Places lived" },
  { id: "contact", label: "Contact and basic info" },
  { id: "family", label: "Family and relationships" },
  { id: "details", label: "Details about you" },
  { id: "events", label: "Life events" },
];

export const ProfileAboutSection = ({ userId }: ProfileAboutSectionProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-about", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch private profile for phone
  const { data: privateProfile } = useQuery({
    queryKey: ["profile-private-about", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles_private")
        .select("phone, email")
        .eq("user_id", userId)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch friends count
  const { data: friendsCount } = useQuery({
    queryKey: ["friends-count-about", userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const { count } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted");
      
      return count || 0;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex gap-6">
        <div className="w-64 space-y-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const InfoRow = ({ 
    icon: Icon, 
    text, 
    subtext,
    isAdd = false,
    showActions = false
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    text: string;
    subtext?: string;
    isAdd?: boolean;
    showActions?: boolean;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full",
          isAdd ? "border-2 border-primary border-dashed" : "bg-muted"
        )}>
          <Icon className={cn("h-5 w-5", isAdd ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <span className={cn("text-sm", isAdd ? "text-primary font-medium" : "text-foreground")}>
            {text}
          </span>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-1">
            <InfoRow icon={Plus} text={t("about.addWorkplace", "Add a workplace")} isAdd />
            
            {profile?.bio && (
              <InfoRow 
                icon={GraduationCap} 
                text={`Studied at ${profile.bio}`}
                showActions
              />
            )}
            
            {profile?.location && (
              <InfoRow 
                icon={Home} 
                text={`Lives in ${profile.location}`}
                showActions
              />
            )}
            
            <InfoRow icon={Plus} text={t("about.addHometown", "Add hometown")} isAdd />
            <InfoRow icon={Plus} text={t("about.addRelationship", "Add a relationship status")} isAdd />
            
            {privateProfile?.phone && (
              <InfoRow 
                icon={Phone} 
                text={privateProfile.phone}
                subtext="Mobile"
                showActions
              />
            )}
          </div>
        );

      case "work":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Work</h4>
              <InfoRow icon={Plus} text={t("about.addWorkplace", "Add a workplace")} isAdd />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Education</h4>
              <InfoRow icon={Plus} text={t("about.addSchool", "Add a high school")} isAdd />
              <InfoRow icon={Plus} text={t("about.addCollege", "Add a college")} isAdd />
            </div>
          </div>
        );

      case "places":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Places lived</h4>
              {profile?.location && (
                <InfoRow 
                  icon={Home} 
                  text={`Lives in ${profile.location}`}
                  showActions
                />
              )}
              <InfoRow icon={Plus} text={t("about.addHometown", "Add hometown")} isAdd />
              <InfoRow icon={Plus} text={t("about.addCity", "Add a city")} isAdd />
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Contact info</h4>
              {privateProfile?.phone && (
                <InfoRow 
                  icon={Phone} 
                  text={privateProfile.phone}
                  subtext="Mobile"
                  showActions
                />
              )}
              {privateProfile?.email && (
                <InfoRow 
                  icon={Globe} 
                  text={privateProfile.email}
                  subtext="Email"
                  showActions
                />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Basic info</h4>
              {profile?.country && (
                <InfoRow 
                  icon={Flag} 
                  text={profile.country}
                  subtext="Country"
                  showActions
                />
              )}
              {profile?.created_at && (
                <InfoRow 
                  icon={Calendar} 
                  text={format(new Date(profile.created_at), "MMMM d, yyyy")}
                  subtext="Joined"
                />
              )}
            </div>
          </div>
        );

      case "family":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Relationship</h4>
              <InfoRow icon={Plus} text={t("about.addRelationship", "Add a relationship status")} isAdd />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Family members</h4>
              <InfoRow icon={Plus} text={t("about.addFamily", "Add a family member")} isAdd />
            </div>
          </div>
        );

      case "details":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">About you</h4>
              {profile?.bio ? (
                <InfoRow 
                  icon={Info} 
                  text={profile.bio}
                  showActions
                />
              ) : (
                <InfoRow icon={Plus} text={t("about.addBio", "Write some details about yourself")} isAdd />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Name pronunciation</h4>
              <InfoRow icon={Plus} text={t("about.addPronunciation", "Add a name pronunciation")} isAdd />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Other names</h4>
              <InfoRow icon={Plus} text={t("about.addNickname", "Add a nickname, birth name...")} isAdd />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Favorite quotes</h4>
              <InfoRow icon={Plus} text={t("about.addQuote", "Add your favorite quotations")} isAdd />
            </div>
          </div>
        );

      case "events":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Life events</h4>
            <InfoRow icon={Plus} text={t("about.addLifeEvent", "Add a life event")} isAdd />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex gap-6">
        {/* Left Sidebar - Navigation */}
        <div className="w-64 flex-shrink-0">
          <h3 className="text-xl font-bold text-foreground mb-4">About</h3>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t(`about.tabs.${tab.id}`, tab.label)}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-lg border border-border p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
