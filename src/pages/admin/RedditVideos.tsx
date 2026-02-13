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
import { Plus, Trash2, Globe, Loader2, ExternalLink } from "lucide-react";
import { useRedditAdmin } from "@/hooks/useRedditVideos";
import { isRedditUrl } from "@/lib/reddit";
import { toast } from "sonner";

const RedditVideos = () => {
  const { videos, isLoading, addVideo, toggleActive, deleteVideo } = useRedditAdmin();
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = async () => {
    const url = newUrl.trim();
    if (!url) {
      toast.error("Please enter a Reddit URL");
      return;
    }
    if (!isRedditUrl(url)) {
      toast.error("Invalid Reddit URL");
      return;
    }
    await addVideo.mutateAsync({ url, title: newTitle.trim() || undefined });
    setNewUrl("");
    setNewTitle("");
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reddit Links</h1>
          <p className="text-slate-400">
            Add Reddit URLs to display on the member home feed. Each URL will show as a rich preview card.
          </p>
        </div>

        {/* Add new URL */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Reddit URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Input
                placeholder="Paste Reddit URL..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <Input
                placeholder="Title (optional)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white max-w-[200px]"
              />
              <Button
                onClick={handleAdd}
                disabled={addVideo.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {addVideo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {/* Videos list */}
        <div className="space-y-3">
          {videos.map((video) => (
            <Card key={video.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">r/</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {video.title || video.reddit_url}
                  </p>
                  <p className="text-slate-400 text-sm truncate">{video.reddit_url}</p>
                </div>

                <Badge
                  variant={video.is_active ? "default" : "secondary"}
                  className={video.is_active ? "bg-green-600" : "bg-slate-600"}
                >
                  {video.is_active ? "Active" : "Hidden"}
                </Badge>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={video.is_active}
                    onCheckedChange={(checked) =>
                      toggleActive.mutate({ id: video.id, is_active: checked })
                    }
                  />
                  <Label className="text-slate-300 text-sm sr-only">Toggle</Label>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-white"
                  onClick={() => window.open(video.reddit_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete this Reddit link?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        This will remove it from the feed permanently.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteVideo.mutate(video.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}

          {/* Empty state */}
          {!isLoading && videos.length === 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="text-center py-12">
                <Globe className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                <h3 className="text-xl font-semibold text-white mb-2">No Reddit links yet</h3>
                <p className="text-slate-400">Add Reddit URLs above to display them on the member feed.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default RedditVideos;
