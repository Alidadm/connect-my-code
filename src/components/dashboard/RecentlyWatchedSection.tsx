import { useState, useEffect, useCallback } from "react";
import { Play, Youtube, Clock, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Swal from "sweetalert2";

interface ViewedVideo {
  id: string;
  video_id: string;
  viewed_at: string;
}

export const RecentlyWatchedSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [videos, setVideos] = useState<ViewedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchedVideos = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("viewed_youtube_videos")
        .select("id, video_id, viewed_at")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching watched videos:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchedVideos();
  }, [fetchWatchedVideos]);

  const handlePlayVideo = (videoId: string) => {
    Swal.fire({
      html: `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
          style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>
      </div>`,
      width: '80%',
      showCloseButton: true,
      showConfirmButton: false,
      background: '#000',
      customClass: {
        popup: 'youtube-preview-popup',
        closeButton: 'youtube-close-button'
      }
    });
  };

  const handleRemoveVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from("viewed_youtube_videos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setVideos(prev => prev.filter(v => v.id !== id));
      toast.success(t('dashboard.videoRemoved', 'Video removed from history'));
    } catch (error) {
      console.error("Error removing video:", error);
      toast.error(t('common.error', 'Error removing video'));
    }
  };

  const handleClearAllHistory = async () => {
    const result = await Swal.fire({
      title: t('dashboard.clearWatchHistory', 'Clear Watch History?'),
      text: t('dashboard.clearWatchHistoryConfirm', 'This will remove all videos from your watch history. This action cannot be undone.'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.clear', 'Clear All'),
      cancelButtonText: t('common.cancel', 'Cancel'),
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from("viewed_youtube_videos")
          .delete()
          .eq("user_id", user?.id);

        if (error) throw error;

        setVideos([]);
        toast.success(t('dashboard.historyCleared', 'Watch history cleared'));
      } catch (error) {
        console.error("Error clearing history:", error);
        toast.error(t('common.error', 'Error clearing history'));
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <Youtube className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          {t('dashboard.noWatchHistory', 'No Watch History')}
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          {t('dashboard.noWatchHistoryDesc', 'Videos you watch from posts will appear here. Start exploring the feed!')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-700">
            {t('dashboard.recentlyWatched', 'Recently Watched')}
          </h3>
          <Badge variant="secondary" className="ml-2">
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAllHistory}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('dashboard.clearAll', 'Clear All')}
        </Button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="group relative aspect-video rounded-lg overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
          >
            <img
              src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
              alt="YouTube video thumbnail"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* Play overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors"
              onClick={() => handlePlayVideo(video.video_id)}
            >
              <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
              </div>
            </div>

            {/* YouTube badge */}
            <Badge 
              variant="secondary" 
              className="absolute bottom-2 left-2 text-xs bg-destructive/90 text-destructive-foreground border-0"
            >
              <Youtube className="h-3 w-3 mr-1" />
              YouTube
            </Badge>

            {/* Time ago */}
            <div className="absolute bottom-2 right-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">
              {formatDistanceToNow(new Date(video.viewed_at), { addSuffix: true })}
            </div>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveVideo(video.id);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-destructive text-white opacity-0 group-hover:opacity-100 transition-all"
              title={t('common.remove', 'Remove')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Open in YouTube */}
            <a
              href={`https://www.youtube.com/watch?v=${video.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50 hover:bg-primary text-white opacity-0 group-hover:opacity-100 transition-all"
              title={t('dashboard.openInYouTube', 'Open in YouTube')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
