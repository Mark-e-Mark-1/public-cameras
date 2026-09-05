const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeId(id: string): boolean {
  return YT_ID.test(id);
}

export function posterUrl(youtubeId: string): string {
  if (!isYouTubeId(youtubeId)) return "";
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function posterFallbackUrl(youtubeId: string): string {
  if (!isYouTubeId(youtubeId)) return "";
  return `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
}

export function watchUrl(youtubeId: string): string {
  if (!isYouTubeId(youtubeId)) return "";
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export interface EmbedOptions {
  autoplay: boolean;
  mute: boolean;
  controls: boolean;
}

/** Official YouTube iframe only. Never accept an arbitrary src from the catalog. */
export function youtubeEmbedUrl(youtubeId: string, options: EmbedOptions): string | null {
  if (!isYouTubeId(youtubeId)) return null;
  const params = new URLSearchParams({
    autoplay: options.autoplay ? "1" : "0",
    mute: options.mute ? "1" : "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
    origin: location.origin,
  });
  if (!options.controls) params.set("controls", "0");
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
}

export function createYouTubeIframe(youtubeId: string, title: string, options: EmbedOptions): HTMLIFrameElement | null {
  const src = youtubeEmbedUrl(youtubeId, options);
  if (!src) return null;
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = title;
  iframe.allow = options.autoplay
    ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    : "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.setAttribute("loading", "lazy");
  return iframe;
}

export function pauseYouTube(iframe: HTMLIFrameElement | null): void {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "https://www.youtube-nocookie.com");
}
