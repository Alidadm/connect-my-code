import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, Trash2, Play, GripVertical, 
  ExternalLink, Loader2, Video, Youtube
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Swal from "sweetalert2";
import { extractYoutubeVideoId, getYoutubeThumbnailUrl } from "@/lib/youtube";

interface ShortVideo {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const ShortVideosPage = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("short_videos")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) {
      toast.error("Please enter a YouTube Shorts URL");
      return;
    }

    const videoId = extractYoutubeVideoId(newVideoUrl.trim());
    if (!videoId) {
      toast.error("Invalid YouTube URL. Please enter a valid YouTube Shorts URL.");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const maxOrder = videos.length > 0 
        ? Math.max(...videos.map((v) => v.display_order)) 
        : 0;

      // Auto-generate thumbnail from YouTube
      const thumbnailUrl = getYoutubeThumbnailUrl(videoId, "hq");

      const { error } = await supabase
        .from("short_videos")
        .insert({
          video_url: newVideoUrl.trim(),
          thumbnail_url: thumbnailUrl,
          title: newVideoTitle.trim() || null,
          display_order: maxOrder + 1,
          created_by: userData.user?.id,
        });

      if (error) throw error;

      toast.success("Video added successfully!");
      setNewVideoUrl("");
      setNewVideoTitle("");
      setShowAddForm(false);
      fetchVideos();
    } catch (error) {
      console.error("Error adding video:", error);
      toast.error("Failed to add video");
    } finally {
      setSaving(false);
    }
  };

  const clearAddForm = () => {
    setNewVideoUrl("");
    setNewVideoTitle("");
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Video?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from("short_videos")
          .delete()
          .eq("id", id);

        if (error) throw error;
        toast.success("Video deleted");
        fetchVideos();
      } catch (error) {
        console.error("Error deleting video:", error);
        toast.error("Failed to delete video");
      }
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("short_videos")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, is_active: !isActive } : v
        )
      );
      toast.success(isActive ? "Video hidden" : "Video visible");
    } catch (error) {
      console.error("Error updating video:", error);
      toast.error("Failed to update video");
    }
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from("short_videos")
        .update({ title: title || null })
        .eq("id", id);

      if (error) throw error;
      
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, title: title || null } : v
        )
      );
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
  };

  const handleUpdateThumbnail = async (id: string, thumbnailUrl: string) => {
    try {
      const { error } = await supabase
        .from("short_videos")
        .update({ thumbnail_url: thumbnailUrl || null })
        .eq("id", id);

      if (error) throw error;
      
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, thumbnail_url: thumbnailUrl || null } : v
        )
      );
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      toast.error("Failed to update thumbnail");
    }
  };

  const openVideoPreview = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Get preview URL for the video
  const getPreviewUrl = (url: string) => {
    const videoId = extractYoutubeVideoId(url);
    if (videoId) {
      return `https://www.youtube.com/shorts/${videoId}`;
    }
    return url;
  };

  // Get display thumbnail
  const getDisplayThumbnail = (video: ShortVideo) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    const videoId = extractYoutubeVideoId(video.video_url);
    if (videoId) {
      return getYoutubeThumbnailUrl(videoId, "hq");
    }
    return null;
  };

  return (
    <AdminLayout title="Short Videos">
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Youtube className="h-6 w-6 text-red-500" />
                YouTube Shorts
              </h1>
              <p className="text-muted-foreground">
                Manage YouTube Shorts videos shown in the feed
              </p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>

          {/* Add Video Form */}
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-500" />
                  Add YouTube Short
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="video-url">YouTube Shorts URL *</Label>
                  <Input
                    id="video-url"
                    placeholder="https://youtube.com/shorts/fnvOQ0FQgCM or https://youtu.be/fnvOQ0FQgCM"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste any YouTube Shorts URL (9:16 vertical video format)
                  </p>
                </div>
                <div>
                  <Label htmlFor="video-title">Title (optional)</Label>
                  <Input
                    id="video-title"
                    placeholder="Enter a title for this video"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddVideo} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Video
                  </Button>
                  <Button variant="outline" onClick={clearAddForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Videos List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Youtube className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No videos yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add YouTube Shorts to display them in the feed
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {videos.map((video, index) => (
                <Card
                  key={video.id}
                  className={!video.is_active ? "opacity-60" : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Drag Handle */}
                      <div className="flex items-center text-muted-foreground pt-2">
                        <GripVertical className="h-5 w-5" />
                        <span className="text-sm ml-1">{index + 1}</span>
                      </div>

                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-24 bg-muted rounded-lg overflow-hidden relative group">
                          {getDisplayThumbnail(video) ? (
                            <img
                              src={getDisplayThumbnail(video)!}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            onClick={() => openVideoPreview(getPreviewUrl(video.video_url))}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <ExternalLink className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Video title (optional)"
                          value={video.title || ""}
                          onChange={(e) =>
                            setVideos((prev) =>
                              prev.map((v) =>
                                v.id === video.id
                                  ? { ...v, title: e.target.value }
                                  : v
                              )
                            )
                          }
                          onBlur={(e) =>
                            handleUpdateTitle(video.id, e.target.value)
                          }
                          className="h-8"
                        />
                        <Input
                          placeholder="Thumbnail URL (optional)"
                          value={video.thumbnail_url || ""}
                          onChange={(e) =>
                            setVideos((prev) =>
                              prev.map((v) =>
                                v.id === video.id
                                  ? { ...v, thumbnail_url: e.target.value }
                                  : v
                              )
                            )
                          }
                          onBlur={(e) =>
                            handleUpdateThumbnail(video.id, e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <a
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate max-w-[300px] hover:text-primary"
                          >
                            {video.video_url}
                          </a>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={video.is_active}
                            onCheckedChange={() =>
                              handleToggleActive(video.id, video.is_active)
                            }
                          />
                          <Badge
                            variant={video.is_active ? "default" : "secondary"}
                          >
                            {video.is_active ? "Active" : "Hidden"}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(video.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats */}
          {videos.length > 0 && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {videos.filter((v) => v.is_active).length} active videos •{" "}
              {videos.filter((v) => !v.is_active).length} hidden
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ShortVideosPage;
