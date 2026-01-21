/**
 * YouTube helpers shared across the app.
 * Keep parsing logic centralized so Admin + Feed + Post creation stay consistent.
 */

export type YoutubeThumbnailQuality = "max" | "hq" | "mq" | "default";

export function getYoutubeThumbnailUrl(
  videoId: string,
  quality: YoutubeThumbnailQuality = "hq"
): string {
  // Some videos don't have maxresdefault. We use fallbacks in components via onError.
  const file =
    quality === "max"
      ? "maxresdefault.jpg"
      : quality === "hq"
        ? "hqdefault.jpg"
        : quality === "mq"
          ? "mqdefault.jpg"
          : "default.jpg";

  return `https://img.youtube.com/vi/${videoId}/${file}`;
}

function looksLikeVideoId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(value);
}

function normalizeVideoId(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const value = candidate.trim();
  if (!value) return null;

  // Extract the first valid-looking 11-char YouTube ID from messy inputs.
  const match = value.match(/[a-zA-Z0-9_-]{11}/);
  return match?.[0] ?? null;
}

/**
 * Extract YouTube video ID from a wide range of URL formats.
 * Returns null for non-video URLs (e.g. playlists).
 */
export function extractYoutubeVideoId(input: string): string | null {
  if (!input) return null;

  let raw = input.trim();
  if (!raw) return null;

  // Accept a bare ID.
  if (looksLikeVideoId(raw)) return raw;

  // Ensure URL() can parse.
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    // Last-resort: regex for odd strings.
    return extractYoutubeVideoIdRegexFallback(raw);
  }

  const hostname = url.hostname.toLowerCase();

  // Handle URLs that contain a nested YouTube URL in params.
  // Example: /attribution_link?u=%2Fwatch%3Fv%3DVIDEOID%26...
  const nested = url.searchParams.get("u") || url.searchParams.get("q");
  if (nested && /youtu\.be|youtube\.com/i.test(nested)) {
    const decoded = safeDecodeURIComponent(nested);
    // Some are relative (/watch?v=...)
    const nestedUrl = decoded.startsWith("/")
      ? `https://www.youtube.com${decoded}`
      : decoded;
    const nestedId = extractYoutubeVideoId(nestedUrl);
    if (nestedId) return nestedId;
  }

  // youtu.be/<id>
  if (hostname === "youtu.be" || hostname.endsWith(".youtu.be")) {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return normalizeVideoId(id);
  }

  // Any subdomain of youtube.com (www, m, music, etc.)
  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    // Standard watch
    const v = normalizeVideoId(url.searchParams.get("v"));
    if (v) return v;

    // /shorts/<id>, /embed/<id>, /v/<id>, /live/<id>
    const parts = url.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((p) =>
      ["shorts", "embed", "v", "live"].includes(p.toLowerCase())
    );
    if (markerIndex >= 0 && parts[markerIndex + 1]) {
      return normalizeVideoId(parts[markerIndex + 1]);
    }
  }

  // Fallback: v param anywhere.
  const vAny = normalizeVideoId(url.searchParams.get("v"));
  if (vAny) return vAny;

  return extractYoutubeVideoIdRegexFallback(raw);
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractYoutubeVideoIdRegexFallback(value: string): string | null {
  const patterns: RegExp[] = [
    /(?:youtube\.com|youtu\.be)\/watch\?v=([^&\s?#]+)/i,
    /youtu\.be\/([^&\s?#]+)/i,
    /(?:youtube\.com|youtu\.be)\/embed\/([^&\s?#]+)/i,
    /(?:youtube\.com|youtu\.be)\/v\/([^&\s?#]+)/i,
    /(?:youtube\.com|youtu\.be)\/shorts\/([^&\s?#]+)/i,
    /(?:youtube\.com)\/live\/([^&\s?#]+)/i,
    /[?&]v=([^&\s?#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    const normalized = normalizeVideoId(match?.[1] ?? null);
    if (normalized) return normalized;
  }
  return null;
}
