/**
 * TikTok URL utilities for extracting video IDs and generating embed URLs
 */

/**
 * Extract TikTok video ID from various URL formats
 * Supports:
 * - https://www.tiktok.com/@username/video/1234567890
 * - https://vm.tiktok.com/XXXXXXXXX/
 * - https://m.tiktok.com/v/1234567890.html
 */
export const extractTikTokVideoId = (url: string): string | null => {
  try {
    // Standard format: /video/ID
    const videoMatch = url.match(/\/video\/(\d+)/);
    if (videoMatch) return videoMatch[1];

    // Short format: vm.tiktok.com/CODE/
    const shortMatch = url.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/);
    if (shortMatch) return shortMatch[1];

    // Mobile format: /v/ID.html
    const mobileMatch = url.match(/\/v\/(\d+)/);
    if (mobileMatch) return mobileMatch[1];

    return null;
  } catch {
    return null;
  }
};

/**
 * Generate TikTok embed URL from video URL
 */
export const getTikTokEmbedUrl = (url: string): string => {
  const videoId = extractTikTokVideoId(url);
  if (!videoId) return url;
  
  // Check if it's a numeric ID or a short code
  if (/^\d+$/.test(videoId)) {
    return `https://www.tiktok.com/embed/v2/${videoId}`;
  }
  
  // For short codes, we need to use the original URL in embed
  return `https://www.tiktok.com/embed/${videoId}`;
};

/**
 * Check if a URL is a valid TikTok URL
 */
export const isValidTikTokUrl = (url: string): boolean => {
  if (!url) return false;
  const patterns = [
    /tiktok\.com\/@[\w.-]+\/video\/\d+/,
    /vm\.tiktok\.com\/[A-Za-z0-9]+/,
    /m\.tiktok\.com\/v\/\d+/,
  ];
  return patterns.some(pattern => pattern.test(url));
};

/**
 * Generate a placeholder thumbnail for TikTok videos
 * TikTok doesn't provide easy thumbnail access, so we use a gradient placeholder
 */
export const getTikTokPlaceholderThumbnail = (): string => {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='640' viewBox='0 0 360 640'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2325f4ee'/%3E%3Cstop offset='50%25' style='stop-color:%23fe2c55'/%3E%3Cstop offset='100%25' style='stop-color:%23000000'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='360' height='640'/%3E%3Cpath d='M180 280 L180 360 L240 320 Z' fill='white' opacity='0.9'/%3E%3C/svg%3E";
};

/**
 * Format video count for display
 */
export const formatVideoCount = (count: number): string => {
  if (count === 1) return "1 video";
  return `${count} videos`;
};
