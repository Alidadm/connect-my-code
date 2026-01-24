import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
import { format, differenceInYears, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Map field types to dashboard settings sections
type SettingsSection = "about" | "account";
const fieldToSection: Record<string, SettingsSection> = {
  fullName: "about",
  workplace: "about",
  school: "about",
  highSchool: "about",
  college: "about",
  city: "about",
  hometown: "about",
  relationship: "about",
  family: "about",
  phone: "account",
  email: "account",
  birthday: "account",
};

interface ProfileAboutSectionProps {
  userId: string | undefined;
}

type TabId = "overview" | "work" | "places" | "contact" | "family";

// Tab labels are handled with translation keys in the render

export const ProfileAboutSection = ({ userId }: ProfileAboutSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const handleEditClick = (fieldKey: string) => {
    const section = fieldToSection[fieldKey] || "about";
    navigate(`/dashboard?tab=${section}`);
  };

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

  // Fetch private profile for phone/email/birthday.
  // NOTE: Direct table reads are typically blocked by security policies.
  // We only fetch *your own* private profile via the backend function.
  const { data: privateProfile } = useQuery({
    queryKey: ["profile-private-about", userId, user?.id],
    queryFn: async () => {
      if (!userId || !user || userId !== user.id) return null;

      const { data, error } = await supabase.functions.invoke("get-my-private-profile");
      if (error) return null;

      return {
        phone: (data as any)?.phone ?? null,
        email: (data as any)?.email ?? null,
        birthday: (data as any)?.birthday ?? null,
      };
    },
    enabled: !!userId && !!user && userId === user.id,
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

  // Calculate age from birthday - use parseISO to avoid timezone shifts
  const calculateAge = (birthday: string | null) => {
    if (!birthday) return null;
    try {
      return differenceInYears(new Date(), parseISO(birthday));
    } catch {
      return null;
    }
  };

  const age = calculateAge(privateProfile?.birthday || null);

  const showEmail = profileDetails?.show_email === true;
  const showPhone = profileDetails?.show_phone === true;
  const emailToShow = showEmail ? privateProfile?.email ?? null : null;
  const phoneToShow = showPhone ? privateProfile?.phone ?? null : null;

  const InfoRow = ({ 
    icon: Icon, 
    text, 
    subtext,
    isAdd = false,
    fieldKey,
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    text: string;
    subtext?: string;
    isAdd?: boolean;
    fieldKey?: string;
  }) => {
    const content = (
      <div className="flex items-center gap-3">
        {isAdd ? (
          <div className="flex items-center justify-center w-7 h-7 rounded-full border border-primary">
            <Plus className="h-3.5 w-3.5 text-primary" />
          </div>
        ) : (
          <Icon className="h-5 w-5 text-blue-500" />
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
    );

    if (isAdd && fieldKey) {
      return (
        <button
          onClick={() => handleEditClick(fieldKey)}
          className="flex items-center py-2.5 group w-full text-left hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors cursor-pointer"
        >
          {content}
        </button>
      );
    }

    return (
      <div className="flex items-center py-2.5 group">
        {content}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-1">
            {/* Full Name */}
            {profileDetails?.full_name ? (
              <InfoRow icon={User} text={profileDetails.full_name} subtext={t("about.subtexts.fullName", "Full name")} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addFullName", "Add full name")} isAdd fieldKey="fullName" />
            )}

            {/* Work */}
            {profileDetails?.current_work ? (
              <InfoRow icon={Briefcase} text={t("about.worksAt", { place: profileDetails.current_work, defaultValue: `Works at ${profileDetails.current_work}` })} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addWorkplace", "Add a workplace")} isAdd fieldKey="workplace" />
            )}

            {/* Education */}
            {profileDetails?.college ? (
              <InfoRow icon={GraduationCap} text={t("about.studiedAt", { place: profileDetails.college, defaultValue: `Studied at ${profileDetails.college}` })} />
            ) : profileDetails?.high_school ? (
              <InfoRow icon={GraduationCap} text={t("about.wentTo", { place: profileDetails.high_school, defaultValue: `Went to ${profileDetails.high_school}` })} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addSchool", "Add school")} isAdd fieldKey="school" />
            )}

            {/* Current residence */}
            {profileDetails?.current_residence ? (
              <InfoRow icon={Home} text={t("about.livesIn", { place: profileDetails.current_residence, defaultValue: `Lives in ${profileDetails.current_residence}` })} />
            ) : profile?.location ? (
              <InfoRow icon={Home} text={t("about.livesIn", { place: profile.location, defaultValue: `Lives in ${profile.location}` })} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addCity", "Add current city")} isAdd fieldKey="city" />
            )}

            {/* Birthplace */}
            {profileDetails?.birthplace ? (
              <InfoRow icon={MapPin} text={t("about.from", { place: profileDetails.birthplace, defaultValue: `From ${profileDetails.birthplace}` })} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addHometown", "Add hometown")} isAdd fieldKey="hometown" />
            )}

            {/* Relationship */}
            {profileDetails?.relationship_status ? (
              <InfoRow icon={Heart} text={t(`about.relationshipOptions.${profileDetails.relationship_status.replace(/\s+/g, '')}`, profileDetails.relationship_status)} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addRelationship", "Add relationship status")} isAdd fieldKey="relationship" />
            )}
          </div>
        );

      case "work":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t("about.sections.work", "Work")}</h4>
              {profileDetails?.current_work ? (
                <InfoRow icon={Briefcase} text={t("about.worksAt", { place: profileDetails.current_work, defaultValue: `Works at ${profileDetails.current_work}` })} />
              ) : (
                <InfoRow icon={Plus} text={t("about.addWorkplace", "Add a workplace")} isAdd fieldKey="workplace" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t("about.sections.education", "Education")}</h4>
              {profileDetails?.high_school ? (
                <InfoRow icon={GraduationCap} text={profileDetails.high_school} subtext={t("about.subtexts.highSchool", "High School")} />
              ) : (
                <InfoRow icon={Plus} text={t("about.addHighSchool", "Add a high school")} isAdd fieldKey="highSchool" />
              )}
              {profileDetails?.college ? (
                <InfoRow icon={GraduationCap} text={profileDetails.college} subtext={t("about.subtexts.college", "College")} />
              ) : (
                <InfoRow icon={Plus} text={t("about.addCollege", "Add a college")} isAdd fieldKey="college" />
              )}
              {profileDetails?.major && (
                <InfoRow icon={GraduationCap} text={profileDetails.major} subtext={t("about.subtexts.major", "Major")} />
              )}
            </div>
          </div>
        );

      case "places":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">{t("about.sections.placesLived", "Places lived")}</h4>
            {profileDetails?.current_residence ? (
              <InfoRow icon={Home} text={profileDetails.current_residence} subtext={t("about.subtexts.currentCity", "Current city")} />
            ) : profile?.location ? (
              <InfoRow icon={Home} text={profile.location} subtext={t("about.subtexts.currentCity", "Current city")} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addCity", "Add current city")} isAdd fieldKey="city" />
            )}
            {profileDetails?.birthplace ? (
              <InfoRow icon={MapPin} text={profileDetails.birthplace} subtext={t("about.subtexts.hometown", "Hometown")} />
            ) : (
              <InfoRow icon={Plus} text={t("about.addHometown", "Add hometown")} isAdd fieldKey="hometown" />
            )}
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t("about.sections.contactInfo", "Contact info")}</h4>
              {emailToShow && (
                <InfoRow icon={Mail} text={emailToShow} subtext={t("about.subtexts.email", "Email")} />
              )}
              {phoneToShow && (
                <InfoRow icon={Phone} text={phoneToShow} subtext={t("about.subtexts.mobile", "Mobile")} />
              )}
              {!emailToShow && !phoneToShow && !profileDetails?.website && !profileDetails?.social_network_id && (
                <p className="text-sm text-muted-foreground py-2">{t("about.noContactInfo", "No contact info to show")}</p>
              )}
              {profileDetails?.website && (
                <InfoRow icon={Globe} text={profileDetails.website} subtext={t("about.subtexts.website", "Website")} />
              )}
              {profileDetails?.social_network_id && (
                <InfoRow icon={Link2} text={profileDetails.social_network_id} subtext={t("about.subtexts.socialNetworkId", "Social Network ID")} />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t("about.sections.basicInfo", "Basic info")}</h4>
              {profileDetails?.citizenships && profileDetails.citizenships.length > 0 && (
                <InfoRow 
                  icon={Flag} 
                  text={profileDetails.citizenships.join(" – ")} 
                  subtext={t("about.subtexts.citizenship", "Citizenship")} 
                />
              )}
              {profileDetails?.languages && profileDetails.languages.length > 0 && (
                <InfoRow 
                  icon={Languages} 
                  text={profileDetails.languages.join(" / ")} 
                  subtext={t("about.subtexts.languages", "Languages")} 
                />
              )}
              {profileDetails?.gender && (
                <InfoRow icon={User} text={t(`about.genderOptions.${profileDetails.gender.replace(/\s+/g, '')}`, profileDetails.gender)} subtext={t("about.subtexts.gender", "Gender")} />
              )}
              {privateProfile?.birthday && (
                <div className="flex items-center py-2.5">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div className="flex items-center gap-8">
                      <div>
                        <span className="text-sm text-foreground">
                          {format(parseISO(privateProfile.birthday), "MMMM d, yyyy")}
                        </span>
                        <p className="text-xs text-muted-foreground">{t("about.subtexts.birthday", "Birthday")}</p>
                      </div>
                      {age !== null && (
                        <div>
                          <span className="text-sm text-foreground">{t("about.yearsOld", { age, defaultValue: "{{age}} years old" })}</span>
                          <p className="text-xs text-muted-foreground">{t("about.subtexts.age", "Age")}</p>
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
                  subtext={t("about.subtexts.joined", "Joined")}
                />
              )}
            </div>
          </div>
        );

      case "family":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t("about.sections.relationship", "Relationship")}</h4>
              {profileDetails?.relationship_status ? (
                <InfoRow icon={Heart} text={t(`about.relationshipOptions.${profileDetails.relationship_status.replace(/\s+/g, '')}`, profileDetails.relationship_status)} />
              ) : (
                <InfoRow icon={Plus} text={t("about.addRelationship", "Add relationship status")} isAdd fieldKey="relationship" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t("about.sections.familyMembers", "Family members")}</h4>
              {familyMembers && familyMembers.length > 0 ? (
                <div className="space-y-2">
                  {familyMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || ""} />
                        <AvatarFallback>{member.profile?.display_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.profile?.display_name || t("about.unknown")}</p>
                        <p className="text-xs text-muted-foreground">{t(`about.familyRelationships.${member.relationship}`, { defaultValue: member.relationship }) as string}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <InfoRow icon={Plus} text={t("about.addFamily", "Add a family member")} isAdd fieldKey="family" />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-card">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Left Sidebar - Navigation (horizontal on mobile, vertical on desktop) */}
        <div className="sm:w-56 flex-shrink-0 sm:border-r border-border sm:pr-4">
          <h3 className="text-lg font-bold text-foreground mb-3 hidden sm:block">{t("about.title", "About")}</h3>
          <nav className="flex sm:flex-col gap-1 sm:gap-0.5 overflow-x-auto scrollbar-hide pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0">
            {(["overview", "work", "places", "contact", "family"] as TabId[]).map((tabId) => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={cn(
                  "whitespace-nowrap text-left px-3 py-2 rounded-md text-xs sm:text-sm transition-colors flex-shrink-0",
                  activeTab === tabId
                    ? "text-primary font-medium bg-primary/5 sm:border-l-2 sm:border-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {t(`about.tabs.${tabId}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 sm:pl-4 border-t sm:border-t-0 pt-4 sm:pt-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
