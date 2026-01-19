import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronDown, 
  ChevronUp, 
  User, 
  MapPin, 
  Calendar, 
  Heart, 
  Shield, 
  Sparkles,
  Globe,
  Users,
  Briefcase
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface ProfileAboutSectionProps {
  userId: string | undefined;
}

interface AboutSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const AboutSection = ({ title, icon: Icon, children, defaultOpen = false }: AboutSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground">{title}</span>
            </div>
            <div className="text-muted-foreground">
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-border/50">
            <div className="pt-4">{children}</div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const ProfileAboutSection = ({ userId }: ProfileAboutSectionProps) => {
  const { t } = useTranslation();

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

  // Fetch posts count
  const { data: postsCount } = useQuery({
    queryKey: ["posts-count-about", userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      
      return count || 0;
    },
    enabled: !!userId,
  });

  // Fetch groups count
  const { data: groupsCount } = useQuery({
    queryKey: ["groups-count-about", userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      
      return count || 0;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div>
          <span className="text-sm text-muted-foreground">{label}: </span>
          <span className="text-sm text-foreground">{value}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-3">
      {/* Overview Section */}
      <AboutSection 
        title={t("about.overview", "Overview")} 
        icon={User}
        defaultOpen={true}
      >
        <div className="space-y-1">
          {profile?.bio ? (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{profile.bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic mb-4">
              {t("about.noBio", "No bio added yet")}
            </p>
          )}
          
          <InfoRow 
            icon={User} 
            label={t("about.name", "Name")} 
            value={profile?.display_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || null}
          />
          <InfoRow 
            icon={User} 
            label={t("about.username", "Username")} 
            value={profile?.username ? `@${profile.username}` : null}
          />
        </div>
      </AboutSection>

      {/* Contact & Basic Info Section */}
      <AboutSection 
        title={t("about.contactBasicInfo", "Contact and Basic Info")} 
        icon={Globe}
      >
        <div className="space-y-1">
          <InfoRow 
            icon={MapPin} 
            label={t("about.location", "Location")} 
            value={profile?.location}
          />
          <InfoRow 
            icon={Globe} 
            label={t("about.country", "Country")} 
            value={profile?.country}
          />
          <InfoRow 
            icon={Calendar} 
            label={t("about.joined", "Joined")} 
            value={profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : null}
          />
        </div>
      </AboutSection>

      {/* Social Stats Section */}
      <AboutSection 
        title={t("about.socialConnections", "Social Connections")} 
        icon={Users}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{friendsCount || 0}</div>
            <div className="text-xs text-muted-foreground">{t("about.friends", "Friends")}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{postsCount || 0}</div>
            <div className="text-xs text-muted-foreground">{t("about.posts", "Posts")}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{groupsCount || 0}</div>
            <div className="text-xs text-muted-foreground">{t("about.groups", "Groups")}</div>
          </div>
        </div>
      </AboutSection>

      {/* Platform Features Section */}
      <AboutSection 
        title={t("about.platformFeatures", "Platform Features")} 
        icon={Sparkles}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Heart className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("about.shareTitle", "Share Your Story")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("about.shareDesc", "Express yourself through posts, photos, videos, and stories.")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("about.privacyTitle", "Privacy First")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("about.privacyDesc", "Your data is protected with industry-leading security.")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Briefcase className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("about.businessTitle", "Business Tools")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("about.businessDesc", "Create and manage your business profile.")}
              </p>
            </div>
          </div>
        </div>
      </AboutSection>
    </div>
  );
};
