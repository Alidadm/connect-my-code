import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Users, Settings, UserPlus, UserCheck, UserX, Crown, 
  Eye, EyeOff, Lock, Loader2, ExternalLink, Check, X,
  Mail, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  member_count: number;
  privacy: string;
  category: string;
  approval_setting: string;
  role: string;
}

interface Invitation {
  id: string;
  group_id: string;
  inviter_id: string;
  status: string;
  created_at: string;
  group: {
    id: string;
    name: string;
    avatar_url: string | null;
    member_count: number;
    privacy: string;
  };
  inviter: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface JoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  user: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
  group: {
    name: string;
  };
}

export const GroupsManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchMyGroups(),
      fetchInvitations(),
      fetchJoinRequests()
    ]);
    setIsLoading(false);
  };

  const fetchMyGroups = async () => {
    if (!user) return;

    try {
      // Get groups where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setMyGroups([]);
        return;
      }

      const groupIds = memberData.map(m => m.group_id);
      const roleMap = new Map(memberData.map(m => [m.group_id, m.role]));

      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("id, name, avatar_url, member_count, privacy, category, approval_setting")
        .in("id", groupIds)
        .order("name");

      if (groupError) throw groupError;

      setMyGroups((groupData || []).map(g => ({
        ...g,
        role: roleMap.get(g.id) || "member"
      })));
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("group_invitations")
        .select(`
          id,
          group_id,
          inviter_id,
          status,
          created_at
        `)
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setInvitations([]);
        return;
      }

      // Fetch group and inviter details
      const groupIds = [...new Set(data.map(i => i.group_id))];
      const inviterIds = [...new Set(data.map(i => i.inviter_id))];

      const [groupsRes, profilesRes] = await Promise.all([
        supabase
          .from("groups")
          .select("id, name, avatar_url, member_count, privacy")
          .in("id", groupIds),
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", inviterIds)
      ]);

      const groupMap = new Map((groupsRes.data || []).map(g => [g.id, g]));
      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));

      setInvitations(data.map(inv => ({
        ...inv,
        group: groupMap.get(inv.group_id) || { id: inv.group_id, name: "Unknown", avatar_url: null, member_count: 0, privacy: "public" },
        inviter: profileMap.get(inv.inviter_id) || { display_name: "Unknown", avatar_url: null }
      })));
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const fetchJoinRequests = async () => {
    if (!user) return;

    try {
      // Get groups where user is admin
      const { data: adminGroups, error: adminError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"]);

      if (adminError) throw adminError;

      if (!adminGroups || adminGroups.length === 0) {
        setJoinRequests([]);
        return;
      }

      const groupIds = adminGroups.map(g => g.group_id);

      const { data, error } = await supabase
        .from("group_join_requests")
        .select("id, group_id, user_id, status, message, created_at")
        .in("group_id", groupIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setJoinRequests([]);
        return;
      }

      // Fetch user profiles and group names
      const userIds = [...new Set(data.map(r => r.user_id))];
      const requestGroupIds = [...new Set(data.map(r => r.group_id))];

      const [profilesRes, groupsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds),
        supabase
          .from("groups")
          .select("id, name")
          .in("id", requestGroupIds)
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const groupMap = new Map((groupsRes.data || []).map(g => [g.id, g]));

      setJoinRequests(data.map(req => ({
        ...req,
        user: profileMap.get(req.user_id) || { display_name: "Unknown", username: "unknown", avatar_url: null },
        group: groupMap.get(req.group_id) || { name: "Unknown" }
      })));
    } catch (error) {
      console.error("Error fetching join requests:", error);
    }
  };

  const handleInvitationResponse = async (invitationId: string, groupId: string, accept: boolean) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));

    try {
      // Update invitation status
      const { error: updateError } = await supabase
        .from("group_invitations")
        .update({ 
          status: accept ? "accepted" : "declined",
          updated_at: new Date().toISOString()
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // If accepted, add user to group
      if (accept && user) {
        const { error: memberError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: "member"
          });

        if (memberError && !memberError.message.includes("duplicate")) {
          throw memberError;
        }

        // Update member count manually
        const { data: groupData } = await supabase
          .from("groups")
          .select("member_count")
          .eq("id", groupId)
          .single();
        
        if (groupData) {
          await supabase
            .from("groups")
            .update({ member_count: (groupData.member_count || 0) + 1 })
            .eq("id", groupId);
        }
      }

      toast.success(accept ? "You've joined the group!" : "Invitation declined");
      fetchData();
    } catch (error: any) {
      console.error("Error responding to invitation:", error);
      toast.error(error.message || "Failed to respond to invitation");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleJoinRequestResponse = async (requestId: string, groupId: string, userId: string, approve: boolean) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("group_join_requests")
        .update({ 
          status: approve ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, add user to group
      if (approve) {
        const { error: memberError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            user_id: userId,
            role: "member"
          });

        if (memberError && !memberError.message.includes("duplicate")) {
          throw memberError;
        }
      }

      toast.success(approve ? "Request approved" : "Request rejected");
      fetchData();
    } catch (error: any) {
      console.error("Error handling join request:", error);
      toast.error(error.message || "Failed to handle request");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public": return <Users className="h-3 w-3" />;
      case "private_visible": return <Eye className="h-3 w-3" />;
      case "private_hidden": return <EyeOff className="h-3 w-3" />;
      default: return <Lock className="h-3 w-3" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Crown className="h-3 w-3 mr-1" />Admin</Badge>;
      case "moderator":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Settings className="h-3 w-3 mr-1" />Mod</Badge>;
      default:
        return <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Member</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="my-groups" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="my-groups" className="gap-2">
            <Users className="h-4 w-4" />
            My Groups
            {myGroups.length > 0 && (
              <Badge variant="secondary" className="ml-1">{myGroups.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Invitations
            {invitations.length > 0 && (
              <Badge className="ml-1 bg-primary">{invitations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Join Requests
            {joinRequests.length > 0 && (
              <Badge className="ml-1 bg-primary">{joinRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Groups Tab */}
        <TabsContent value="my-groups">
          {myGroups.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't joined any groups yet.
              </p>
              <Button onClick={() => navigate("/groups")} className="gap-2">
                <Users className="h-4 w-4" />
                Browse Groups
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {myGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={group.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {group.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{group.name}</h3>
                          {getRoleBadge(group.role)}
                          <Badge variant="outline" className="gap-1">
                            {getPrivacyIcon(group.privacy)}
                            {group.privacy.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.member_count} members • {group.category}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/groups`)}
                          className="gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                        {group.role === "admin" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            Manage
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          {invitations.length === 0 ? (
            <Card className="p-8 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Invitations</h3>
              <p className="text-muted-foreground">
                You don't have any group invitations at the moment.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={invitation.group.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {invitation.group.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{invitation.group.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Invited by <span className="font-medium">{invitation.inviter.display_name}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(invitation.created_at)}
                          <span>•</span>
                          {invitation.group.member_count} members
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleInvitationResponse(invitation.id, invitation.group_id, true)}
                          disabled={processingIds.has(invitation.id)}
                          className="gap-1"
                        >
                          {processingIds.has(invitation.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Accept
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleInvitationResponse(invitation.id, invitation.group_id, false)}
                          disabled={processingIds.has(invitation.id)}
                          className="gap-1"
                        >
                          <X className="h-3 w-3" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Join Requests Tab */}
        <TabsContent value="requests">
          {joinRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
              <p className="text-muted-foreground">
                No one is waiting to join your groups.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {joinRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={request.user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {request.user.display_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{request.user.display_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          @{request.user.username} wants to join <span className="font-medium">{request.group.name}</span>
                        </p>
                        {request.message && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            "{request.message}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(request.created_at)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleJoinRequestResponse(request.id, request.group_id, request.user_id, true)}
                          disabled={processingIds.has(request.id)}
                          className="gap-1"
                        >
                          {processingIds.has(request.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          Approve
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleJoinRequestResponse(request.id, request.group_id, request.user_id, false)}
                          disabled={processingIds.has(request.id)}
                          className="gap-1"
                        >
                          <UserX className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
