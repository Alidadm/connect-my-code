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
  Flag,
  Plus,
  Globe,
  Languages,
  Link2,
  Mail
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileAboutSectionProps {
  userId: string | undefined;
}

type TabId = "overview" | "work" | "places" | "contact" | "family";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work and education" },
  { id: "places", label: "Places lived" },
  { id: "contact", label: "Contact and basic info" },
  { id: "family", label: "Family and relationships" },
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

  // Fetch profile details (extended about info)
  const { data: profileDetails } = useQuery({
    queryKey: ["profile-details-about", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profile_details")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") return null;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch private profile for phone/email (only if visibility is enabled)
  const { data: privateProfile } = useQuery({
    queryKey: ["profile-private-about", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles_private")
        .select("phone, email, birthday")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch family members
  const { data: familyMembers } = useQuery({
    queryKey: ["family-members-about", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("family_members")
        .select("id, family_member_id, relationship")
        .eq("user_id", userId);
      
      if (error) return [];

      if (data && data.length > 0) {
        const memberIds = data.map(m => m.family_member_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", memberIds);

        return data.map(member => ({
          ...member,
          profile: profiles?.find(p => p.user_id === member.family_member_id)
        }));
      }
      return [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex gap-6">
        <div className="w-64 space-y-2">
          {[...Array(5)].map((_, i) => (
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

  // Calculate age from birthday
  const calculateAge = (birthday: string | null) => {
    if (!birthday) return null;
    try {
      return differenceInYears(new Date(), new Date(birthday));
    } catch {
      return null;
    }
  };

  const age = calculateAge(privateProfile?.birthday || null);

  const InfoRow = ({ 
    icon: Icon, 
    text, 
    subtext,
    isAdd = false,
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    text: string;
    subtext?: string;
    isAdd?: boolean;
  }) => (
    <div className="flex items-center py-2.5 group">
      <div className="flex items-center gap-3">
        {isAdd ? (
          <div className="flex items-center justify-center w-7 h-7 rounded-full border border-primary">
            <Plus className="h-3.5 w-3.5 text-primary" />
          </div>
        ) : (
          <Icon className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <span className={cn("text-sm", isAdd ? "text-primary font-medium" : "text-foreground")}>
            {text}
          </span>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-1">
            {/* Full Name */}
            {profileDetails?.full_name ? (
              <InfoRow icon={User} text={profileDetails.full_name} subtext="Full name" />
            ) : (
              <InfoRow icon={Plus} text={t("about.addFullName", "Add full name")} isAdd />
            )}

            {/* Work */}
            {profileDetails?.current_work ? (
              <InfoRow icon={Briefcase} text={`Works at ${profileDetails.current_work}`} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addWorkplace", "Add a workplace")} isAdd />
            )}

            {/* Education */}
            {profileDetails?.college ? (
              <InfoRow icon={GraduationCap} text={`Studied at ${profileDetails.college}`} />
            ) : profileDetails?.high_school ? (
              <InfoRow icon={GraduationCap} text={`Went to ${profileDetails.high_school}`} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addSchool", "Add school")} isAdd />
            )}

            {/* Current residence */}
            {profileDetails?.current_residence ? (
              <InfoRow icon={Home} text={`Lives in ${profileDetails.current_residence}`} />
            ) : profile?.location ? (
              <InfoRow icon={Home} text={`Lives in ${profile.location}`} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addCity", "Add current city")} isAdd />
            )}

            {/* Birthplace */}
            {profileDetails?.birthplace ? (
              <InfoRow icon={MapPin} text={`From ${profileDetails.birthplace}`} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addHometown", "Add hometown")} isAdd />
            )}

            {/* Relationship */}
            {profileDetails?.relationship_status ? (
              <InfoRow icon={Heart} text={profileDetails.relationship_status} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addRelationship", "Add relationship status")} isAdd />
            )}
          </div>
        );

      case "work":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Work</h4>
              {profileDetails?.current_work ? (
                <InfoRow icon={Briefcase} text={`Works at ${profileDetails.current_work}`} />
              ) : (
                <InfoRow icon={Plus} text={t("about.addWorkplace", "Add a workplace")} isAdd />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Education</h4>
              {profileDetails?.high_school ? (
                <InfoRow icon={GraduationCap} text={profileDetails.high_school} subtext="High School" />
              ) : (
                <InfoRow icon={Plus} text={t("about.addHighSchool", "Add a high school")} isAdd />
              )}
              {profileDetails?.college ? (
                <InfoRow icon={GraduationCap} text={profileDetails.college} subtext="College" />
              ) : (
                <InfoRow icon={Plus} text={t("about.addCollege", "Add a college")} isAdd />
              )}
              {profileDetails?.major && (
                <InfoRow icon={GraduationCap} text={profileDetails.major} subtext="Major" />
              )}
            </div>
          </div>
        );

      case "places":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Places lived</h4>
            {profileDetails?.current_residence ? (
              <InfoRow icon={Home} text={profileDetails.current_residence} subtext="Current city" />
            ) : profile?.location ? (
              <InfoRow icon={Home} text={profile.location} subtext="Current city" />
            ) : (
              <InfoRow icon={Plus} text={t("about.addCity", "Add current city")} isAdd />
            )}
            {profileDetails?.birthplace ? (
              <InfoRow icon={MapPin} text={profileDetails.birthplace} subtext="Hometown" />
            ) : (
              <InfoRow icon={Plus} text={t("about.addHometown", "Add hometown")} isAdd />
            )}
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Contact info</h4>
              {profileDetails?.show_email && privateProfile?.email && (
                <InfoRow icon={Mail} text={privateProfile.email} subtext="Email" />
              )}
              {profileDetails?.show_phone && privateProfile?.phone && (
                <InfoRow icon={Phone} text={privateProfile.phone} subtext="Mobile" />
              )}
              {profileDetails?.website && (
                <InfoRow icon={Globe} text={profileDetails.website} subtext="Website" />
              )}
              {profileDetails?.social_network_id && (
                <InfoRow icon={Link2} text={profileDetails.social_network_id} subtext="Social Network ID" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Basic info</h4>
              {profileDetails?.citizenships && profileDetails.citizenships.length > 0 && (
                <InfoRow 
                  icon={Flag} 
                  text={profileDetails.citizenships.join(" – ")} 
                  subtext="Citizenship" 
                />
              )}
              {profileDetails?.languages && profileDetails.languages.length > 0 && (
                <InfoRow 
                  icon={Languages} 
                  text={profileDetails.languages.join(" / ")} 
                  subtext="Languages" 
                />
              )}
              {profileDetails?.gender && (
                <InfoRow icon={User} text={profileDetails.gender} subtext="Gender" />
              )}
              {privateProfile?.birthday && (
                <div className="flex items-center py-2.5">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-8">
                      <div>
                        <span className="text-sm text-foreground">
                          {format(new Date(privateProfile.birthday), "MMMM d, yyyy")}
                        </span>
                        <p className="text-xs text-muted-foreground">Birthday</p>
                      </div>
                      {age !== null && (
                        <div>
                          <span className="text-sm text-foreground">{age} years old</span>
                          <p className="text-xs text-muted-foreground">Age</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
              {profileDetails?.relationship_status ? (
                <InfoRow icon={Heart} text={profileDetails.relationship_status} />
              ) : (
                <InfoRow icon={Plus} text={t("about.addRelationship", "Add relationship status")} isAdd />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Family members</h4>
              {familyMembers && familyMembers.length > 0 ? (
                <div className="space-y-2">
                  {familyMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || ""} />
                        <AvatarFallback>{member.profile?.display_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.profile?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{member.relationship}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <InfoRow icon={Plus} text={t("about.addFamily", "Add a family member")} isAdd />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-card">
      <div className="flex gap-4">
        {/* Left Sidebar - Navigation */}
        <div className="w-56 flex-shrink-0 border-r border-border pr-4">
          <h3 className="text-lg font-bold text-foreground mb-3">About</h3>
          <nav className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === tab.id
                    ? "text-primary font-medium bg-primary/5 border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {t(`about.tabs.${tab.id}`, tab.label)}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 pl-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
