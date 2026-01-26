import { useState, useEffect, useMemo, useRef } from "react";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractYoutubeVideoId, getYoutubeThumbnailUrl } from "@/lib/youtube";
import { useViewedShortVideos } from "@/hooks/useViewedShortVideos";
import { useAuth } from "@/hooks/useAuth";
import Swal from "sweetalert2";

interface ShortVideo {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string | null;
}

// Extract TikTok video ID from URL
const extractTikTokVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
};

// Check if URL is a TikTok URL
const isTikTokUrl = (url: string): boolean => {
  return url.includes("tiktok.com");
};

// Get embeddable URL for the video
const getEmbedUrl = (videoUrl: string): string | null => {
  // YouTube
  const youtubeId = extractYoutubeVideoId(videoUrl);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
  }
  
  // TikTok - use their embed format
  const tiktokId = extractTikTokVideoId(videoUrl);
  if (tiktokId) {
    return `https://www.tiktok.com/embed/v2/${tiktokId}`;
  }
  
  return null;
};

export const ShortVideosRow = () => {
  const { user } = useAuth();
  const [allVideos, setAllVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { markVideoAsViewed, getRandomUnviewedVideos, loading: viewedLoading } = useViewedShortVideos();
  
  // Use ref to store stable video list that doesn't change on re-render
  const stableVideosRef = useRef<ShortVideo[]>([]);

  useEffect(() => {
    fetchAllVideos();
  }, []);

  const fetchAllVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("short_videos")
        .select("id, video_url, thumbnail_url, title")
        .eq("is_active", true);

      if (error) throw error;
      setAllVideos(data || []);
    } catch (error) {
      console.error("Error fetching short videos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get random unviewed videos - only compute once when data is ready
  const videos = useMemo(() => {
    if (loading || viewedLoading || allVideos.length === 0) return [];
    
    // Only shuffle if we don't have stable videos yet or allVideos changed
    if (stableVideosRef.current.length === 0) {
      stableVideosRef.current = getRandomUnviewedVideos(allVideos, 10);
    }
    return stableVideosRef.current;
  }, [allVideos, loading, viewedLoading, getRandomUnviewedVideos]);

  const getThumbnailUrl = (video: ShortVideo): string => {
    if (video.thumbnail_url) return video.thumbnail_url;
    
    // Try to get YouTube thumbnail
    const videoId = extractYoutubeVideoId(video.video_url);
    if (videoId) {
      return getYoutubeThumbnailUrl(videoId, "hq");
    }
    
    // Default placeholder for TikTok or other videos
    return "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=200&h=350&fit=crop";
  };

  const openVideoPlayer = (startIndex: number) => {
    // Use a stable copy of videos for the player session
    const playerVideos = [...videos];
    let currentIndex = startIndex;

    const showVideo = () => {
      const video = playerVideos[currentIndex];
      if (!video) return;
      
      // Mark video as viewed when opened (silent - don't block UI)
      if (user) {
        markVideoAsViewed(video.id);
      }
      
      // Get embeddable URL
      const embedUrl = getEmbedUrl(video.video_url);
      
      // Clean iframe embed - no fallback redirect buttons
      const contentHtml = embedUrl 
        ? `<iframe 
              src="${embedUrl}" 
              style="width: 100%; height: 100%; border: none; border-radius: 8px;"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>`
        : `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;">
              <p>Video unavailable</p>
           </div>`;

      const hasPrev = currentIndex > 0;
      const hasNext = currentIndex < playerVideos.length - 1;

      Swal.fire({
        html: `
          <div class="short-video-container" style="position: relative; width: 100%; aspect-ratio: 9/16; max-height: 85vh; border-radius: 12px; overflow: hidden;">
            ${contentHtml}
          </div>
          <div style="position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px); padding: 4px 14px; border-radius: 16px; z-index: 10;">
            <span style="color: #fff; font-size: 12px; font-weight: 500;">${currentIndex + 1} / ${playerVideos.length}</span>
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: "min(380px, 90vw)",
        padding: "8px",
        background: "hsl(var(--card))",
        customClass: {
          popup: "short-video-popup",
          closeButton: "short-video-close-btn",
        },
        didOpen: () => {
          const popup = Swal.getPopup();
          if (popup) {
            // Up arrow (previous)
            if (hasPrev) {
              const upBtn = document.createElement("button");
              upBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;
              upBtn.style.cssText = "position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; z-index: 10; transition: background 0.2s;";
              upBtn.onmouseover = () => upBtn.style.background = "rgba(255,255,255,0.4)";
              upBtn.onmouseout = () => upBtn.style.background = "rgba(255,255,255,0.2)";
              upBtn.onclick = () => {
                currentIndex--;
                showVideo();
              };
              popup.appendChild(upBtn);
            }

            // Down arrow (next)
            if (hasNext) {
              const downBtn = document.createElement("button");
              downBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
              downBtn.style.cssText = "position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; z-index: 10; transition: background 0.2s;";
              downBtn.onmouseover = () => downBtn.style.background = "rgba(255,255,255,0.4)";
              downBtn.onmouseout = () => downBtn.style.background = "rgba(255,255,255,0.2)";
              downBtn.onclick = () => {
                currentIndex++;
                showVideo();
              };
              popup.appendChild(downBtn);
            }

            // Keyboard navigation
            const handleKeydown = (e: KeyboardEvent) => {
              if (e.key === "ArrowUp" && hasPrev) {
                currentIndex--;
                showVideo();
              } else if (e.key === "ArrowDown" && hasNext) {
                currentIndex++;
                showVideo();
              }
            };
            document.addEventListener("keydown", handleKeydown);
            
            // Cleanup on close
            const cleanup = () => {
              document.removeEventListener("keydown", handleKeydown);
            };
            popup.addEventListener("swal:close", cleanup);
          }
        },
      });
    };

    showVideo();
  };

  if (loading || viewedLoading || videos.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Play className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-foreground">YouTube Shorts</h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {videos.map((video, index) => (
          <button
            key={video.id}
            onClick={() => openVideoPlayer(index)}
            className="flex-shrink-0 relative group rounded-lg overflow-hidden transition-transform hover:scale-105"
            style={{ width: "80px", height: "120px" }}
          >
            <img
              src={getThumbnailUrl(video)}
              alt={video.title || "Short video"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="h-4 w-4 text-primary ml-0.5" fill="currentColor" />
              </div>
            </div>
            {video.title && (
              <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-[10px] text-white truncate">{video.title}</p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
