import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Save, Loader2, User, Globe, Link2, Flag, Languages, 
  Calendar, Briefcase, GraduationCap, Home, Heart, Users,
  X, Plus, Eye, EyeOff
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supportedLanguages } from "@/lib/i18n";

interface ProfileDetails {
  full_name: string;
  website: string;
  social_network_id: string;
  citizenships: string[];
  languages: string[];
  gender: string;
  high_school: string;
  college: string;
  major: string;
  current_work: string;
  birthplace: string;
  current_residence: string;
  relationship_status: string;
  show_email: boolean;
  show_phone: boolean;
}

interface FamilyMember {
  id: string;
  family_member_id: string;
  relationship: string;
  profile?: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
}

const relationshipOptions = [
  "Single", "In a relationship", "Engaged", "Married", "In a civil union",
  "In a domestic partnership", "In an open relationship", "It's complicated",
  "Separated", "Divorced", "Widowed"
];

const familyRelationships = [
  "Mother", "Father", "Sister", "Brother", "Son", "Daughter",
  "Grandmother", "Grandfather", "Aunt", "Uncle", "Cousin",
  "Niece", "Nephew", "Stepmother", "Stepfather", "Stepsister",
  "Stepbrother", "Mother-in-law", "Father-in-law", "Sister-in-law",
  "Brother-in-law", "Spouse"
];

const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say", "Custom"];

export const AboutSettings = () => {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [newCitizenship, setNewCitizenship] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [showFamilySearch, setShowFamilySearch] = useState(false);
  const [familySearchQuery, setFamilySearchQuery] = useState("");
  const [selectedFamilyRelationship, setSelectedFamilyRelationship] = useState("Brother");
  const [hasInitialized, setHasInitialized] = useState(false);

  const [formData, setFormData] = useState<ProfileDetails>({
    full_name: "",
    website: "",
    social_network_id: "",
    citizenships: [],
    languages: [],
    gender: "",
    high_school: "",
    college: "",
    major: "",
    current_work: "",
    birthplace: "",
    current_residence: "",
    relationship_status: "",
    show_email: false,
    show_phone: false,
  });

  // Fetch profile details
  const { data: profileDetails, refetch: refetchDetails } = useQuery({
    queryKey: ["profile-details", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profile_details")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile details:", error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch family members
  const { data: familyMembers, refetch: refetchFamily } = useQuery({
    queryKey: ["family-members", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("family_members")
        .select("id, family_member_id, relationship")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching family members:", error);
        return [];
      }

      // Get profile info for each family member
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
    enabled: !!user?.id,
  });

  // Fetch friends for family member selection
  const { data: friends } = useQuery({
    queryKey: ["friends-for-family", user?.id, familySearchQuery],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      let query = supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", friendIds);

      if (familySearchQuery) {
        query = query.or(`display_name.ilike.%${familySearchQuery}%,username.ilike.%${familySearchQuery}%`);
      }

      const { data } = await query.limit(10);
      return data || [];
    },
    enabled: !!user?.id && showFamilySearch,
  });

  // Update form when data loads - auto-populate from profile if no existing data
  useEffect(() => {
    if (hasInitialized) return;
    
    if (profileDetails) {
      // Use existing profile_details data
      setFormData({
        full_name: profileDetails.full_name || "",
        website: profileDetails.website || "",
        social_network_id: profileDetails.social_network_id || profile?.username ? `@${profile.username}` : "",
        citizenships: profileDetails.citizenships || [],
        languages: profileDetails.languages || [],
        gender: profileDetails.gender || "",
        high_school: profileDetails.high_school || "",
        college: profileDetails.college || "",
        major: profileDetails.major || "",
        current_work: profileDetails.current_work || "",
        birthplace: profileDetails.birthplace || "",
        current_residence: profileDetails.current_residence || profile?.location || "",
        relationship_status: profileDetails.relationship_status || "",
        show_email: profileDetails.show_email || false,
        show_phone: profileDetails.show_phone || false,
      });
      setHasInitialized(true);
    } else if (profile && !profileDetails) {
      // No existing profile_details - auto-populate from profile
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
      setFormData(prev => ({
        ...prev,
        full_name: fullName || profile.display_name || "",
        social_network_id: profile.username ? `@${profile.username}` : "",
        current_residence: profile.location || "",
      }));
      setHasInitialized(true);
    }
  }, [profileDetails, profile, hasInitialized]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profile_details")
        .upsert({
          user_id: user.id,
          ...formData,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("About information saved successfully!");
      refetchDetails();
    } catch (error) {
      console.error("Error saving profile details:", error);
      toast.error("Failed to save information");
    } finally {
      setSaving(false);
    }
  };

  const addCitizenship = () => {
    if (newCitizenship.trim() && !formData.citizenships.includes(newCitizenship.trim())) {
      setFormData({
        ...formData,
        citizenships: [...formData.citizenships, newCitizenship.trim()]
      });
      setNewCitizenship("");
    }
  };

  const removeCitizenship = (citizenship: string) => {
    setFormData({
      ...formData,
      citizenships: formData.citizenships.filter(c => c !== citizenship)
    });
  };

  const addLanguage = (langName: string) => {
    if (langName && !formData.languages.includes(langName)) {
      setFormData({
        ...formData,
        languages: [...formData.languages, langName]
      });
      setNewLanguage("");
    }
  };

  const removeLanguage = (language: string) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter(l => l !== language)
    });
  };

  const addFamilyMember = async (friendId: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from("family_members")
        .insert({
          user_id: user.id,
          family_member_id: friendId,
          relationship: selectedFamilyRelationship
        });

      if (error) throw error;
      toast.success("Family member added!");
      refetchFamily();
      setShowFamilySearch(false);
      setFamilySearchQuery("");
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("This person is already added as a family member");
      } else {
        toast.error("Failed to add family member");
      }
    }
  };

  const removeFamilyMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Family member removed");
      refetchFamily();
    } catch (error) {
      toast.error("Failed to remove family member");
    }
  };

  return (
    <div className="space-y-8">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Basic Information
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://yourwebsite.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="social_network_id">Social Network ID</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="social_network_id"
                value={formData.social_network_id}
                onChange={(e) => setFormData({ ...formData, social_network_id: e.target.value })}
                placeholder="@yourusername"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Citizenship(s)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.citizenships.map((citizenship) => (
                <Badge key={citizenship} variant="secondary" className="flex items-center gap-1">
                  <Flag className="w-3 h-3" />
                  {citizenship}
                  <button onClick={() => removeCitizenship(citizenship)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCitizenship}
                onChange={(e) => setNewCitizenship(e.target.value)}
                placeholder="Add citizenship (e.g., USA)"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCitizenship())}
              />
              <Button type="button" variant="outline" onClick={addCitizenship}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Multiple citizenships will display as: USA – France</p>
          </div>

          <div className="space-y-2">
            <Label>Language(s)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.languages.map((language) => (
                <Badge key={language} variant="secondary" className="flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  {language}
                  <button onClick={() => removeLanguage(language)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value="" onValueChange={(value) => addLanguage(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a language to add" />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages
                    .filter(lang => !formData.languages.includes(lang.name))
                    .map((lang) => (
                      <SelectItem key={lang.code} value={lang.name}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={`https://flagcdn.com/w20/${lang.flag}.png`}
                            alt={lang.name}
                            className="w-4 h-auto rounded-sm"
                          />
                          <span>{lang.nativeName}</span>
                          <span className="text-muted-foreground text-sm">({lang.name})</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Multiple languages will display as: English / Spanish</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Visibility */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Contact Visibility
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {formData.show_email ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
              <div>
                <p className="font-medium">Show Email</p>
                <p className="text-sm text-muted-foreground">Allow others to see your email on your profile</p>
              </div>
            </div>
            <Switch
              checked={formData.show_email}
              onCheckedChange={(checked) => setFormData({ ...formData, show_email: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {formData.show_phone ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
              <div>
                <p className="font-medium">Show Phone</p>
                <p className="text-sm text-muted-foreground">Allow others to see your phone number on your profile</p>
              </div>
            </div>
            <Switch
              checked={formData.show_phone}
              onCheckedChange={(checked) => setFormData({ ...formData, show_phone: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Family and Relationships */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Family and Relationships
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="relationship_status">Relationship Status</Label>
            <Select 
              value={formData.relationship_status} 
              onValueChange={(value) => setFormData({ ...formData, relationship_status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {relationshipOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Family Members</Label>
            {familyMembers && familyMembers.length > 0 && (
              <div className="space-y-2">
                {familyMembers.map((member: FamilyMember) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || ""} />
                        <AvatarFallback>{member.profile?.display_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profile?.display_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{member.relationship}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFamilyMember(member.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!showFamilySearch ? (
              <Button variant="outline" onClick={() => setShowFamilySearch(true)} className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Add Family Member
              </Button>
            ) : (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex gap-2">
                  <Select value={selectedFamilyRelationship} onValueChange={setSelectedFamilyRelationship}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {familyRelationships.map((rel) => (
                        <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={familySearchQuery}
                    onChange={(e) => setFamilySearchQuery(e.target.value)}
                    placeholder="Search friends..."
                    className="flex-1"
                  />
                  <Button variant="ghost" onClick={() => setShowFamilySearch(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {friends?.map((friend) => (
                    <button
                      key={friend.user_id}
                      onClick={() => addFamilyMember(friend.user_id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar_url || ""} />
                        <AvatarFallback>{friend.display_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{friend.display_name}</span>
                    </button>
                  ))}
                  {friends?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No friends found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Education & Work */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Education & Work
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="high_school">High School Name</Label>
            <Input
              id="high_school"
              value={formData.high_school}
              onChange={(e) => setFormData({ ...formData, high_school: e.target.value })}
              placeholder="Enter your high school"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="college">College</Label>
            <Input
              id="college"
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              placeholder="Enter your college"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="major">Your Major</Label>
            <Input
              id="major"
              value={formData.major}
              onChange={(e) => setFormData({ ...formData, major: e.target.value })}
              placeholder="Enter your major"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_work">Currently Work At</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="current_work"
                value={formData.current_work}
                onChange={(e) => setFormData({ ...formData, current_work: e.target.value })}
                placeholder="Enter your workplace"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Places */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Places to Live
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="birthplace">Where Were You Born</Label>
            <Input
              id="birthplace"
              value={formData.birthplace}
              onChange={(e) => setFormData({ ...formData, birthplace: e.target.value })}
              placeholder="City, Country"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_residence">Where You Live</Label>
            <Input
              id="current_residence"
              value={formData.current_residence}
              onChange={(e) => setFormData({ ...formData, current_residence: e.target.value })}
              placeholder="City, Country"
            />
          </div>
        </div>
      </div>

      <Separator />

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save About Information
          </>
        )}
      </Button>
    </div>
  );
};
