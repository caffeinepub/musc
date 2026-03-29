interface YouTubePlayerProps {
  videoId?: string;
  playlistId?: string;
  onVideoEnd?: () => void;
  onVideoStart?: () => void;
  className?: string;
}

export function YouTubePlayer({
  videoId,
  playlistId,
  className,
}: YouTubePlayerProps) {
  if (!videoId && !playlistId) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl overflow-hidden ${className ?? ""}`}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          height: 220,
          width: "100%",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,0,0,0.1)",
              border: "1px solid rgba(255,0,0,0.3)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="currentColor"
              style={{ color: "#ff4757" }}
              aria-label="YouTube"
            >
              <title>YouTube</title>
              <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
            </svg>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            No video loaded
          </p>
        </div>
      </div>
    );
  }

  let src = "";
  if (videoId) {
    src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&enablejsapi=1&rel=0&modestbranding=1`;
    if (playlistId) src += `&list=${playlistId}`;
  } else if (playlistId) {
    src = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&controls=1&rel=0&modestbranding=1`;
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className ?? ""}`}
      style={{
        border: "1px solid var(--border-color)",
        width: "100%",
        height: 220,
        boxShadow: "0 0 30px rgba(34,193,255,0.08)",
      }}
    >
      <iframe
        src={src}
        width="100%"
        height="220"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
        style={{ display: "block" }}
        title="YouTube Player"
      />
    </div>
  );
}
