/**
 * Check if a URL is a Reddit URL
 */
export const isRedditUrl = (url: string): boolean => {
  return /(?:reddit\.com|redd\.it)/.test(url);
};

/**
 * Extract Reddit post path from various Reddit URL formats
 * Returns the full path like /r/subreddit/comments/id/title
 */
export const extractRedditPostPath = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    // Standard Reddit post URL
    /reddit\.com(\/r\/[^/]+\/comments\/[^/]+(?:\/[^/?#]*)?)/,
    // Short Reddit URL (redd.it)
    /redd\.it\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Get Reddit embed URL from a Reddit post URL
 * Reddit doesn't have a reliable embed for videos/images directly.
 * We use the oembed approach or just link out.
 */
export const getRedditEmbedUrl = (url: string): string => {
  // Clean the URL and ensure it ends properly
  let cleanUrl = url.replace(/\?.*$/, '').replace(/\/$/, '');
  return `https://www.redditmedia.com/mediaembed/liveupdate/${cleanUrl}`;
};

/**
 * Extract Reddit media info from a URL
 * Reddit media can be images (i.redd.it) or videos (v.redd.it)
 */
export const getRedditMediaType = (url: string): 'image' | 'video' | 'post' => {
  if (/i\.redd\.it|preview\.redd\.it/.test(url)) return 'image';
  if (/v\.redd\.it/.test(url)) return 'video';
  return 'post';
};

/**
 * Check if URL is a direct Reddit media URL (image or video)
 */
export const isRedditMediaUrl = (url: string): boolean => {
  return /(?:i\.redd\.it|v\.redd\.it|preview\.redd\.it)/.test(url);
};

/**
 * Extract a clean Reddit post URL for embedding
 */
export const getRedditPostEmbedHtml = (url: string): string => {
  // Normalize the URL
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  // Remove query params
  cleanUrl = cleanUrl.split('?')[0];
  
  return cleanUrl;
};
