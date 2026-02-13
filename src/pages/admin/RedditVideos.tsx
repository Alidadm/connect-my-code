import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, ExternalLink, GripVertical, Globe } from "lucide-react";
import { useRedditAdmin, RedditVideoGroup } from "@/hooks/useRedditVideos";
import { isRedditUrl } from "@/lib/reddit";
import { toast } from "sonner";

const RedditVideos = () => {
  const { allGroups, isLoading, createGroup, updateGroup, deleteGroup, addVideo, removeVideo } = useRedditAdmin();
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async () => {
    setIsCreating(true);
    try {
      await createGroup.mutateAsync(newGroupTitle || undefined);
      setNewGroupTitle("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddVideo = async (groupId: string) => {
    const url = videoUrls[groupId]?.trim();
    if (!url) {
      toast.error("Please enter a Reddit URL");
      return;
    }

    if (!isRedditUrl(url)) {
      toast.error("Invalid Reddit URL");
      return;
    }

    await addVideo.mutateAsync({ group_id: groupId, reddit_url: url });
    setVideoUrls((prev) => ({ ...prev, [groupId]: "" }));
  };

  const handleToggleActive = async (group: RedditVideoGroup) => {
    await updateGroup.mutateAsync({
      id: group.id,
      is_active: !group.is_active,
    });
    toast.success(group.is_active ? "Group hidden from feed" : "Group visible in feed");
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reddit Videos</h1>
          <p className="text-slate-400">
            Manage Reddit video/media groups. Each group can contain up to 10 Reddit links that members can browse.
          </p>
        </div>

        {/* Create new group */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Reddit Group
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Group title (optional)"
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white max-w-sm"
              />
              <Button
                onClick={handleCreateGroup}
                disabled={isCreating || createGroup.isPending}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Group
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {/* Video groups list */}
        <div className="space-y-6">
          {allGroups.map((group) => (
            <Card key={group.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-slate-500 cursor-grab" />
                    <CardTitle className="text-lg text-white">
                      {group.title || "Untitled Group"}
                    </CardTitle>
                    <Badge
                      variant={group.is_active ? "default" : "secondary"}
                      className={group.is_active ? "bg-green-600" : "bg-slate-600"}
                    >
                      {group.is_active ? "Active" : "Hidden"}
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {group.videos?.length || 0} / 10 links
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`active-${group.id}`}
                        checked={group.is_active}
                        onCheckedChange={() => handleToggleActive(group)}
                      />
                      <Label htmlFor={`active-${group.id}`} className="text-slate-300 text-sm">
                        Show in feed
                      </Label>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete Reddit Group?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            This will permanently delete this group and all its links. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteGroup.mutate(group.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Add video input */}
                {(group.videos?.length || 0) < 10 && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste Reddit URL..."
                      value={videoUrls[group.id] || ""}
                      onChange={(e) => setVideoUrls((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddVideo(group.id);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleAddVideo(group.id)}
                      disabled={addVideo.isPending}
                      size="icon"
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Links list */}
                {group.videos && group.videos.length > 0 ? (
                  <div className="space-y-2">
                    {group.videos.map((video, index) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 group"
                      >
                        <span className="text-slate-400 font-mono text-sm w-6 text-center">{index + 1}</span>
                        <Globe className="h-4 w-4 text-orange-400 shrink-0" />
                        <span className="text-slate-200 text-sm truncate flex-1">{video.reddit_url}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-white"
                            onClick={() => window.open(video.reddit_url, "_blank")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => removeVideo.mutate(video.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No Reddit links in this group yet</p>
                    <p className="text-sm">Add Reddit URLs above</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Empty state */}
          {!isLoading && allGroups.length === 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="text-center py-12">
                <Globe className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                <h3 className="text-xl font-semibold text-white mb-2">No Reddit groups yet</h3>
                <p className="text-slate-400 mb-4">Create your first group to start adding Reddit links.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default RedditVideos;
