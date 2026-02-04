import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Trash2,
  Ban,
  CheckCircle,
  Users,
  Link2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface PenPalPreference {
  id: string;
  user_id: string;
  is_discoverable: boolean;
  is_suspended: boolean;
  interests: string[];
  looking_for_description: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PenPalConnection {
  id: string;
  user_id: string;
  penpal_id: string;
  created_at: string;
  user_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  penpal_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const PenPalsManagement = () => {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<PenPalPreference[]>([]);
  const [connections, setConnections] = useState<PenPalConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: "preference" | "connection"; id: string } | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; userId: string; isSuspended: boolean } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from("penpal_preferences")
        .select("*")
        .order("created_at", { ascending: false });

      if (prefsError) throw prefsError;

      // Fetch connections
      const { data: connsData, error: connsError } = await supabase
        .from("penpal_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (connsError) throw connsError;

      // Get all user IDs
      const userIds = new Set<string>();
      prefsData?.forEach((p) => userIds.add(p.user_id));
      connsData?.forEach((c) => {
        userIds.add(c.user_id);
        userIds.add(c.penpal_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("safe_profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Enrich preferences with profiles
      const enrichedPrefs = (prefsData || []).map((p) => ({
        ...p,
        is_suspended: p.is_suspended ?? false,
        interests: p.interests || [],
        profile: profileMap.get(p.user_id),
      }));

      // Enrich connections with profiles
      const enrichedConns = (connsData || []).map((c) => ({
        ...c,
        user_profile: profileMap.get(c.user_id),
        penpal_profile: profileMap.get(c.penpal_id),
      }));

      setPreferences(enrichedPrefs);
      setConnections(enrichedConns);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load PenPals data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeletePreference = async (id: string) => {
    try {
      const { error } = await supabase
        .from("penpal_preferences")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPreferences((prev) => prev.filter((p) => p.id !== id));
      toast.success("Preference deleted");
    } catch (error) {
      console.error("Error deleting preference:", error);
      toast.error("Failed to delete preference");
    }
    setDeleteDialog(null);
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      const { error } = await supabase
        .from("penpal_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setConnections((prev) => prev.filter((c) => c.id !== id));
      toast.success("Connection removed");
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error("Failed to remove connection");
    }
    setDeleteDialog(null);
  };

  const handleToggleSuspend = async (userId: string, currentSuspended: boolean) => {
    try {
      const { error } = await supabase
        .from("penpal_preferences")
        .update({ is_suspended: !currentSuspended })
        .eq("user_id", userId);

      if (error) throw error;

      setPreferences((prev) =>
        prev.map((p) =>
          p.user_id === userId ? { ...p, is_suspended: !currentSuspended } : p
        )
      );
      toast.success(currentSuspended ? "User unsuspended from PenPals" : "User suspended from PenPals");
    } catch (error) {
      console.error("Error toggling suspend:", error);
      toast.error("Failed to update suspension status");
    }
    setSuspendDialog(null);
  };

  const filteredPreferences = preferences.filter((p) => {
    const search = searchQuery.toLowerCase();
    return (
      p.profile?.username?.toLowerCase().includes(search) ||
      p.profile?.display_name?.toLowerCase().includes(search) ||
      p.interests?.some((i) => i.toLowerCase().includes(search))
    );
  });

  const filteredConnections = connections.filter((c) => {
    const search = searchQuery.toLowerCase();
    return (
      c.user_profile?.username?.toLowerCase().includes(search) ||
      c.user_profile?.display_name?.toLowerCase().includes(search) ||
      c.penpal_profile?.username?.toLowerCase().includes(search) ||
      c.penpal_profile?.display_name?.toLowerCase().includes(search)
    );
  });

  const getDisplayName = (profile?: { username: string | null; display_name: string | null }) => {
    return profile?.display_name || profile?.username || "Unknown User";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-cyan-400" />
              {t("admin.penpals.title", "PenPals Management")}
            </h1>
            <p className="text-slate-400 mt-1">
              {t("admin.penpals.subtitle", "Manage user preferences and connections")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users or interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white">{preferences.length}</div>
            <div className="text-sm text-slate-400">Total Users</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-green-400">
              {preferences.filter((p) => p.is_discoverable).length}
            </div>
            <div className="text-sm text-slate-400">Discoverable</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-red-400">
              {preferences.filter((p) => p.is_suspended).length}
            </div>
            <div className="text-sm text-slate-400">Suspended</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-cyan-400">{connections.length}</div>
            <div className="text-sm text-slate-400">Connections</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="preferences" className="w-full">
          <TabsList className="bg-slate-800/50">
            <TabsTrigger value="preferences" className="gap-2">
              <Users className="h-4 w-4" />
              User Preferences ({filteredPreferences.length})
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Link2 className="h-4 w-4" />
              Connections ({filteredConnections.length})
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-4">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">User</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Interests</TableHead>
                    <TableHead className="text-slate-300">Joined</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredPreferences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPreferences.map((pref) => (
                      <TableRow key={pref.id} className="border-slate-700 hover:bg-slate-800/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={pref.profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-slate-700 text-slate-300">
                                {getDisplayName(pref.profile).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-white">
                                {getDisplayName(pref.profile)}
                              </div>
                              {pref.profile?.username && (
                                <div className="text-xs text-slate-400">
                                  @{pref.profile.username}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pref.is_suspended ? (
                              <Badge variant="destructive" className="text-xs">
                                Suspended
                              </Badge>
                            ) : pref.is_discoverable ? (
                              <Badge className="bg-green-600 text-xs">Discoverable</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Hidden
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {pref.interests?.slice(0, 3).map((interest) => (
                              <Badge
                                key={interest}
                                variant="outline"
                                className="text-xs border-slate-600"
                              >
                                {interest}
                              </Badge>
                            ))}
                            {pref.interests?.length > 3 && (
                              <Badge variant="outline" className="text-xs border-slate-600">
                                +{pref.interests.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(pref.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSuspendDialog({
                                  open: true,
                                  userId: pref.user_id,
                                  isSuspended: pref.is_suspended,
                                })
                              }
                              className={
                                pref.is_suspended
                                  ? "text-green-400 hover:text-green-300"
                                  : "text-orange-400 hover:text-orange-300"
                              }
                            >
                              {pref.is_suspended ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDeleteDialog({ open: true, type: "preference", id: pref.id })
                              }
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="mt-4">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">User 1</TableHead>
                    <TableHead className="text-slate-300 text-center">↔</TableHead>
                    <TableHead className="text-slate-300">User 2</TableHead>
                    <TableHead className="text-slate-300">Connected</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredConnections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                        No connections found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConnections.map((conn) => (
                      <TableRow key={conn.id} className="border-slate-700 hover:bg-slate-800/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={conn.user_profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-slate-700 text-slate-300">
                                {getDisplayName(conn.user_profile).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium text-white">
                              {getDisplayName(conn.user_profile)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Link2 className="h-4 w-4 text-cyan-400 mx-auto" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={conn.penpal_profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-slate-700 text-slate-300">
                                {getDisplayName(conn.penpal_profile).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium text-white">
                              {getDisplayName(conn.penpal_profile)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(conn.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteDialog({ open: true, type: "connection", id: conn.id })
                            }
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog?.open}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {deleteDialog?.type === "preference" ? "Delete Preference" : "Remove Connection"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteDialog?.type === "preference"
                ? "This will remove this user's PenPal preferences. They can set them up again later."
                : "This will disconnect these two pen pals. They can reconnect later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog?.type === "preference") {
                  handleDeletePreference(deleteDialog.id);
                } else if (deleteDialog?.type === "connection") {
                  handleDeleteConnection(deleteDialog.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Dialog */}
      <AlertDialog
        open={suspendDialog?.open}
        onOpenChange={(open) => !open && setSuspendDialog(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {suspendDialog?.isSuspended ? "Unsuspend User" : "Suspend User"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {suspendDialog?.isSuspended
                ? "This user will be able to use the PenPals feature again."
                : "This user will be hidden from the PenPals discovery and won't be able to connect with others."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (suspendDialog) {
                  handleToggleSuspend(suspendDialog.userId, suspendDialog.isSuspended);
                }
              }}
              className={
                suspendDialog?.isSuspended
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {suspendDialog?.isSuspended ? "Unsuspend" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default PenPalsManagement;
