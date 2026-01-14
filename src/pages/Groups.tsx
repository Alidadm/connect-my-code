import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Image, Send, Lock, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
  description: string | null;
  privacy: string;
  category: string;
}

const Groups = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [postContent, setPostContent] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUserGroups();
  }, [user]);

  const fetchUserGroups = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const groupIds = memberGroups?.map(g => g.group_id) || [];

      if (groupIds.length === 0) {
        setGroups([]);
        setIsLoading(false);
        return;
      }

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("id, name, avatar_url, cover_url, member_count, description, privacy, category")
        .in("id", groupIds)
        .order("name");

      if (groupError) throw groupError;

      setGroups(groupData || []);
      if (groupData && groupData.length > 0 && !selectedGroup) {
        setSelectedGroup(groupData[0]);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePost = () => {
    if (!postContent.trim() || !selectedGroup) return;
    console.log("Posting to group:", selectedGroup.name, postContent);
    setPostContent("");
    toast.success("Post created!");
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Users className="h-3 w-3" />;
      case "private_visible":
        return <Eye className="h-3 w-3" />;
      case "private_hidden":
        return <EyeOff className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case "public":
        return "Public";
      case "private_visible":
        return "Private";
      case "private_hidden":
        return "Hidden";
      default:
        return privacy;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              {t("nav.groups", { defaultValue: "Groups" })}
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect with communities that share your interests
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group or join existing communities
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Group
            </Button>
          </Card>
        ) : (
          <>
            {/* Selected Group Post Box */}
            {selectedGroup && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedGroup.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {selectedGroup.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{selectedGroup.name}</CardTitle>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          {getPrivacyIcon(selectedGroup.privacy)}
                          {getPrivacyLabel(selectedGroup.privacy)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedGroup.member_count?.toLocaleString() || 0} members • {selectedGroup.category}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder={`Share something with ${selectedGroup.name}...`}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Image className="h-4 w-4" />
                      Add Media
                    </Button>
                    <Button onClick={handlePost} disabled={!postContent.trim()} className="gap-2">
                      <Send className="h-4 w-4" />
                      Post
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Groups List */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Groups</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedGroup?.id === group.id ? "border-primary ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={group.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {group.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                            {getPrivacyIcon(group.privacy)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {group.member_count?.toLocaleString() || 0} members
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {group.description || group.category}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/groups/${group.id}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <CreateGroupModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onGroupCreated={fetchUserGroups}
      />
    </MainLayout>
  );
};

export default Groups;
