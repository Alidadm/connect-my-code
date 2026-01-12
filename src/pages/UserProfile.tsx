import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  MapPin, Calendar, Users, Link as LinkIcon, 
  MessageCircle, UserPlus, MoreHorizontal, ArrowLeft,
  CheckCircle2, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PublicProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  is_verified: boolean | null;
  created_at: string;
}

// Country code to name mapping
const countryNames: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  DE: "Germany", FR: "France", ES: "Spain", IT: "Italy", JP: "Japan",
  CN: "China", IN: "India", BR: "Brazil", MX: "Mexico", NL: "Netherlands",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
  RU: "Russia", KR: "South Korea", SG: "Singapore", HK: "Hong Kong",
  NZ: "New Zealand", IE: "Ireland", CH: "Switzerland", AT: "Austria",
  BE: "Belgium", PT: "Portugal", GR: "Greece", CZ: "Czech Republic",
  HU: "Hungary", RO: "Romania", UA: "Ukraine", ZA: "South Africa",
  AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru", VE: "Venezuela",
  PH: "Philippines", TH: "Thailand", MY: "Malaysia", ID: "Indonesia",
  VN: "Vietnam", PK: "Pakistan", BD: "Bangladesh", EG: "Egypt", NG: "Nigeria",
  KE: "Kenya", GH: "Ghana", MA: "Morocco", SA: "Saudi Arabia", AE: "UAE",
  IL: "Israel", TR: "Turkey", TW: "Taiwan",
};

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, cover_url, bio, location, country, is_verified, created_at")
          .eq("username", username.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          setNotFound(true);
        } else if (!data) {
          setNotFound(true);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error("Error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-48 w-full" />
          <div className="px-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-20">
              <Skeleton className="w-32 h-32 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The user @{username} doesn't exist or may have changed their username.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile?.user_id;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Cover Image */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/30 to-primary/10">
          {profile?.cover_url && (
            <img 
              src={profile.cover_url} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Back Button */}
          <Link to="/" className="absolute top-4 left-4">
            <Button variant="secondary" size="sm" className="shadow-lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <div className="px-4 pb-4 bg-card border-b">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-20">
            {/* Avatar */}
            <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 pt-2 sm:pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {profile?.display_name || profile?.username || "Unknown User"}
                </h1>
                {profile?.is_verified && (
                  <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
                )}
              </div>
              <p className="text-muted-foreground">@{profile?.username}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 sm:pt-0">
              {isOwnProfile ? (
                <Link to="/dashboard">
                  <Button variant="outline">Edit Profile</Button>
                </Link>
              ) : (
                <>
                  <Button className="weshare-gradient">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                  <Button variant="outline" size="icon">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bio & Meta */}
          <div className="mt-4 space-y-3">
            {profile?.bio && (
              <p className="text-foreground">{profile.bio}</p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {(profile?.location || profile?.country) && (
                <span className="flex items-center gap-1.5">
                  {profile?.country && (
                    <img 
                      src={`https://flagcdn.com/w20/${profile.country.toLowerCase()}.png`}
                      alt={countryNames[profile.country] || profile.country}
                      className="w-5 h-auto rounded-sm"
                    />
                  )}
                  <MapPin className="w-4 h-4" />
                  {profile?.location ? `${profile.location}, ` : "City, "}
                  {profile?.country ? (countryNames[profile.country] || profile.country) : ""}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(profile?.created_at || "").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-2">
              <button className="hover:underline">
                <span className="font-bold">0</span>{" "}
                <span className="text-muted-foreground">Friends</span>
              </button>
              <button className="hover:underline">
                <span className="font-bold">0</span>{" "}
                <span className="text-muted-foreground">Posts</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="px-4 py-4">
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8" />
              </div>
              <p>No posts yet</p>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p>No photos yet</p>
            </div>
          </TabsContent>

          <TabsContent value="friends" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <p>No friends to show</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;
