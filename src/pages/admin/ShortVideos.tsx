import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, Trash2, Play, GripVertical, 
  ExternalLink, Save, Loader2, Video
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Swal from "sweetalert2";

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
  
  // Persist bulk URLs and show state in localStorage so they survive tab switches
  const [bulkUrls, setBulkUrls] = useState(() => {
    return localStorage.getItem("admin_short_videos_bulk_urls") || "";
  });
  const [showBulkAdd, setShowBulkAdd] = useState(() => {
    return localStorage.getItem("admin_short_videos_show_bulk") === "true";
  });

  // Save bulk URLs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("admin_short_videos_bulk_urls", bulkUrls);
  }, [bulkUrls]);

  // Save show state to localStorage
  useEffect(() => {
    localStorage.setItem("admin_short_videos_show_bulk", String(showBulkAdd));
  }, [showBulkAdd]);

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

  const handleBulkAdd = async () => {
    const urls = bulkUrls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const maxOrder = videos.length > 0 
        ? Math.max(...videos.map((v) => v.display_order)) 
        : 0;

      const newVideos = urls.map((url, index) => ({
        video_url: url,
        display_order: maxOrder + index + 1,
        created_by: userData.user?.id,
      }));

      const { error } = await supabase
        .from("short_videos")
        .insert(newVideos);

      if (error) throw error;

      toast.success(`Added ${urls.length} video(s) successfully`);
      setBulkUrls("");
      setShowBulkAdd(false);
      // Clear localStorage after successful save
      localStorage.removeItem("admin_short_videos_bulk_urls");
      localStorage.removeItem("admin_short_videos_show_bulk");
      fetchVideos();
    } catch (error) {
      console.error("Error adding videos:", error);
      toast.error("Failed to add videos");
    } finally {
      setSaving(false);
    }
  };

  const clearBulkAddState = () => {
    setBulkUrls("");
    setShowBulkAdd(false);
    localStorage.removeItem("admin_short_videos_bulk_urls");
    localStorage.removeItem("admin_short_videos_show_bulk");
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

  return (
    <AdminLayout title="Short Videos">
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Video className="h-6 w-6 text-primary" />
                Short Videos
              </h1>
              <p className="text-muted-foreground">
                Manage TikTok-style videos shown in the feed
              </p>
            </div>
            <Button onClick={() => setShowBulkAdd(!showBulkAdd)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Videos
            </Button>
          </div>

          {/* Bulk Add Section */}
          {showBulkAdd && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Add TikTok Videos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bulk-urls">
                    Paste TikTok URLs (one per line)
                  </Label>
                  <Textarea
                    id="bulk-urls"
                    placeholder={`https://www.tiktok.com/@user/video/123456789\nhttps://www.tiktok.com/@user/video/987654321\nhttps://vm.tiktok.com/abc123`}
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    rows={6}
                    className="mt-2 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleBulkAdd} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Videos
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearBulkAddState}
                  >
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
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No videos yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add TikTok video URLs to display them in the feed
                </p>
                <Button onClick={() => setShowBulkAdd(true)}>
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
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            onClick={() => openVideoPreview(video.video_url)}
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
