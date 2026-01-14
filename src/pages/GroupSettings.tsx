import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Users, 
  Shield, 
  Lock, 
  Loader2, 
  ArrowLeft,
  Save,
  Crown,
  UserPlus,
  UserMinus,
  Check,
  X,
  MoreVertical,
  Globe,
  Eye,
  EyeOff,
  Trash2,
  ImagePlus,
  Camera,
  Upload
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
  description: string | null;
  privacy: string;
  category: string | null;
  creator_id: string;
  approval_setting: string | null;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

const GroupSettings = () => {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [approvalSetting, setApprovalSetting] = useState("admin_only");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    if (groupId && user) {
      fetchGroupData();
    }
  }, [groupId, user]);

  const fetchGroupData = async () => {
    if (!groupId || !user) return;

    try {
      // Check user's role first
      const { data: memberData } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberData || (memberData.role !== "admin" && memberData.role !== "moderator")) {
        toast.error("You don't have permission to access this page");
        navigate(`/groups/${groupId}`);
        return;
      }

      setUserRole(memberData.role);

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);
      setName(groupData.name);
      setDescription(groupData.description || "");
      setCategory(groupData.category || "");
      setPrivacy(groupData.privacy);
      setApprovalSetting(groupData.approval_setting || "admin_only");
      setAvatarUrl(groupData.avatar_url);
      setCoverUrl(groupData.cover_url);

      // Fetch members
      await fetchMembers();
      
      // Fetch join requests
      await fetchJoinRequests();

    } catch (error) {
      console.error("Error fetching group:", error);
      toast.error("Failed to load group settings");
      navigate("/groups");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!groupId) return;

    const { data: membersData, error: membersError } = await supabase
      .from("group_members")
      .select("id, user_id, role, joined_at")
      .eq("group_id", groupId)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });

    if (!membersError && membersData) {
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", userIds);

      const membersWithProfiles = membersData.map(member => ({
        ...member,
        profile: profilesData?.find(p => p.user_id === member.user_id)
      }));

      setMembers(membersWithProfiles);
    }
  };

  const fetchJoinRequests = async () => {
    if (!groupId) return;

    const { data: requestsData, error } = await supabase
      .from("group_join_requests")
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && requestsData) {
      const userIds = requestsData.map(r => r.user_id);
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", userIds);

        const requestsWithProfiles = requestsData.map(request => ({
          ...request,
          profile: profilesData?.find(p => p.user_id === request.user_id)
        }));

        setJoinRequests(requestsWithProfiles);
      } else {
        setJoinRequests([]);
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !group) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${group.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("group-media")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("group-media")
        .getPublicUrl(fileName);

      const newAvatarUrl = publicUrlData.publicUrl;

      // Update group in database
      const { error: updateError } = await supabase
        .from("groups")
        .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
        .eq("id", group.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      setGroup({ ...group, avatar_url: newAvatarUrl });
      toast.success("Avatar updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !group) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB for cover)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${group.id}/cover-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("group-media")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("group-media")
        .getPublicUrl(fileName);

      const newCoverUrl = publicUrlData.publicUrl;

      // Update group in database
      const { error: updateError } = await supabase
        .from("groups")
        .update({ cover_url: newCoverUrl, updated_at: new Date().toISOString() })
        .eq("id", group.id);

      if (updateError) throw updateError;

      setCoverUrl(newCoverUrl);
      setGroup({ ...group, cover_url: newCoverUrl });
      toast.success("Cover image updated!");
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveGroupInfo = async () => {
    if (!group || !name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("groups")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          privacy,
          approval_setting: approvalSetting,
          updated_at: new Date().toISOString()
        })
        .eq("id", group.id);

      if (error) throw error;
      
      setGroup({ ...group, name, description, category, privacy, approval_setting: approvalSetting });
      toast.success("Group settings saved!");
    } catch (error) {
      console.error("Error saving group:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, userId: string, newRole: string) => {
    if (!group) return;
    
    // Can't change creator's role
    if (userId === group.creator_id) {
      toast.error("Cannot change the group creator's role");
      return;
    }

    // Only admins can promote/demote
    if (userRole !== "admin") {
      toast.error("Only admins can change member roles");
      return;
    }

    try {
      const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!group) return;

    if (userId === group.creator_id) {
      toast.error("Cannot remove the group creator");
      return;
    }

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Update member count
      await supabase
        .from("groups")
        .update({ member_count: Math.max((group.member_count || 1) - 1, 0) })
        .eq("id", group.id);

      setMembers(members.filter(m => m.id !== memberId));
      setGroup({ ...group, member_count: Math.max((group.member_count || 1) - 1, 0) });
      toast.success("Member removed");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleJoinRequest = async (requestId: string, userId: string, approved: boolean) => {
    if (!group || !user) return;

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("group_join_requests")
        .update({
          status: approved ? "approved" : "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (approved) {
        // Add as member
        const { error: memberError } = await supabase
          .from("group_members")
          .insert({
            group_id: group.id,
            user_id: userId,
            role: "member"
          });

        if (memberError) throw memberError;

        // Update member count
        await supabase
          .from("groups")
          .update({ member_count: (group.member_count || 0) + 1 })
          .eq("id", group.id);

        setGroup({ ...group, member_count: (group.member_count || 0) + 1 });
        toast.success("Request approved!");
        fetchMembers();
      } else {
        toast.success("Request rejected");
      }

      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
    } catch (error) {
      console.error("Error handling request:", error);
      toast.error("Failed to process request");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "moderator":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getPrivacyIcon = (value: string) => {
    switch (value) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "private_visible":
        return <Eye className="h-4 w-4" />;
      case "private_hidden":
        return <EyeOff className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!group) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Group Not Found</h2>
          <Button onClick={() => navigate("/groups")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isAdmin = userRole === "admin";

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/groups/${groupId}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Group
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Group Settings</h1>
              <p className="text-muted-foreground">{group.name}</p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full justify-start bg-card border">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Requests
              {joinRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {joinRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Lock className="h-4 w-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Group Information</CardTitle>
                <CardDescription>Update your group's basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <div 
                    className="relative h-32 md:h-40 rounded-lg overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer group"
                    style={coverUrl ? { 
                      backgroundImage: `url(${coverUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : {}}
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${coverUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} transition-opacity`}>
                      {isUploadingCover ? (
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      ) : (
                        <div className="text-center text-white">
                          <Camera className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">
                            {coverUrl ? "Change Cover" : "Upload Cover Image"}
                          </p>
                          <p className="text-xs opacity-75">Recommended: 1200x400px, max 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={isUploadingCover}
                  />
                </div>

                {/* Group Avatar Upload */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                        {name[0] || "G"}
                      </AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="avatar-upload"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center cursor-pointer transition-colors border-2 border-background"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-foreground">Group Avatar</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Square image, at least 200x200px, max 5MB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 gap-2"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Avatar
                    </Button>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter group name"
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell people what this group is about..."
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="art">Art & Design</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSaveGroupInfo} disabled={isSaving} className="w-full gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Members</CardTitle>
                <CardDescription>View and manage group members and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => {
                    const isCreator = member.user_id === group.creator_id;
                    const isCurrentUser = member.user_id === user?.id;
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {member.profile?.display_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {member.profile?.display_name || "Unknown User"}
                              </span>
                              {getRoleIcon(member.role)}
                              {isCreator && (
                                <Badge variant="outline" className="text-xs">Creator</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              @{member.profile?.username || "user"} • Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        
                        {!isCreator && !isCurrentUser && isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border">
                              <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, member.user_id, "admin")}>
                                <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, member.user_id, "moderator")}>
                                <Shield className="h-4 w-4 mr-2 text-blue-500" />
                                Make Moderator
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, member.user_id, "member")}>
                                <Users className="h-4 w-4 mr-2" />
                                Set as Member
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRemoveMember(member.id, member.user_id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove from Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}

                  {members.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No members yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Join Requests Tab */}
          <TabsContent value="requests" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Join Requests</CardTitle>
                <CardDescription>Review and approve membership requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {joinRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {request.profile?.display_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-foreground">
                            {request.profile?.display_name || "Unknown User"}
                          </span>
                          <p className="text-sm text-muted-foreground">
                            @{request.profile?.username || "user"} • Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </p>
                          {request.message && (
                            <p className="text-sm text-foreground mt-1 italic">
                              "{request.message}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleJoinRequest(request.id, request.user_id, false)}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" />
                          Decline
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleJoinRequest(request.id, request.user_id, true)}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}

                  {joinRequests.length === 0 && (
                    <div className="text-center py-8">
                      <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No pending requests</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings Tab */}
          <TabsContent value="privacy" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Access</CardTitle>
                <CardDescription>Control who can see and join your group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Privacy Level */}
                <div className="space-y-3">
                  <Label>Group Privacy</Label>
                  <div className="grid gap-3">
                    {[
                      { value: "public", icon: Globe, label: "Public", desc: "Anyone can see and join the group" },
                      { value: "private_visible", icon: Eye, label: "Private (Visible)", desc: "Anyone can find the group, but must request to join" },
                      { value: "private_hidden", icon: EyeOff, label: "Private (Hidden)", desc: "Only members can see the group, invite-only" }
                    ].map((option) => (
                      <div 
                        key={option.value}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                          privacy === option.value 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setPrivacy(option.value)}
                      >
                        <div className={`p-2 rounded-full ${privacy === option.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <option.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.desc}</p>
                        </div>
                        {privacy === option.value && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approval Settings */}
                {privacy !== "public" && (
                  <div className="space-y-3">
                    <Label>Join Request Approval</Label>
                    <Select value={approvalSetting} onValueChange={setApprovalSetting}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_only">Admins Only</SelectItem>
                        <SelectItem value="admin_and_mods">Admins & Moderators</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose who can approve join requests
                    </p>
                  </div>
                )}

                <Button onClick={handleSaveGroupInfo} disabled={isSaving} className="w-full gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Privacy Settings
                </Button>

                {/* Danger Zone */}
                {isAdmin && (
                  <div className="pt-6 mt-6 border-t border-destructive/20">
                    <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Deleting the group is permanent and cannot be undone.
                    </p>
                    <Button 
                      variant="destructive" 
                      className="gap-2"
                      onClick={() => toast.info("Group deletion coming soon!")}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Group
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default GroupSettings;
