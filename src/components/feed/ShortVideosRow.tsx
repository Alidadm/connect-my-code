import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Swal from "sweetalert2";

interface ShortVideo {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string | null;
}

export const ShortVideosRow = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("short_videos")
        .select("id, video_url, thumbnail_url, title")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching short videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractTikTokVideoId = (url: string): string | null => {
    // Handle various TikTok URL formats
    const patterns = [
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
      /tiktok\.com\/t\/(\w+)/,
      /vm\.tiktok\.com\/(\w+)/,
      /tiktok\.com\/v\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getThumbnailUrl = (video: ShortVideo): string => {
    if (video.thumbnail_url) return video.thumbnail_url;
    // Default placeholder for TikTok videos
    return "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=200&h=350&fit=crop";
  };

  const openVideoPlayer = (startIndex: number) => {
    let currentIndex = startIndex;

    const showVideo = () => {
      const video = videos[currentIndex];
      const videoId = extractTikTokVideoId(video.video_url);
      
      // Create embed URL for TikTok
      const embedUrl = videoId 
        ? `https://www.tiktok.com/embed/v2/${videoId}`
        : video.video_url;

      const hasPrev = currentIndex > 0;
      const hasNext = currentIndex < videos.length - 1;

      Swal.fire({
        html: `
          <div class="short-video-container" style="position: relative; width: 100%; height: 80vh; max-height: 700px; background: #000; border-radius: 12px; overflow: hidden;">
            <iframe 
              src="${embedUrl}" 
              style="width: 100%; height: 100%; border: none;"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
            ${video.title ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; font-size: 14px;">${video.title}</div>` : ''}
          </div>
          <div style="display: flex; justify-content: center; gap: 16px; margin-top: 16px;">
            <span style="color: #888; font-size: 14px;">${currentIndex + 1} / ${videos.length}</span>
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: "400px",
        padding: 0,
        background: "#1a1a1a",
        customClass: {
          popup: "short-video-popup",
          closeButton: "short-video-close-btn",
        },
        didOpen: () => {
          // Add navigation buttons
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
            popup.addEventListener("swal:close", () => {
              document.removeEventListener("keydown", handleKeydown);
            });
          }
        },
      });
    };

    showVideo();
  };

  if (loading || videos.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Play className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Short Videos</h3>
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
