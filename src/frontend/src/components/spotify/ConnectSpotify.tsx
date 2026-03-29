import { ExternalLink, Music2 } from "lucide-react";
import { useSpotify } from "../../hooks/useSpotify";

export function ConnectSpotify() {
  const { connect } = useSpotify();

  return (
    <div
      className="flex flex-col items-center justify-center p-10 rounded-2xl text-center"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: "rgba(29,185,84,0.15)",
          border: "1px solid rgba(29,185,84,0.3)",
        }}
      >
        <Music2 className="w-8 h-8" style={{ color: "#1DB954" }} />
      </div>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Connect Spotify
      </h3>
      <p
        className="text-sm mb-6 max-w-xs"
        style={{ color: "var(--text-secondary)" }}
      >
        Connect your Spotify account to start music-driven focus sessions. Your
        music controls your work.
      </p>
      <button
        type="button"
        onClick={connect}
        className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center gap-2"
        style={{ background: "#1DB954", color: "#000" }}
      >
        <Music2 className="w-4 h-4" />
        Connect Spotify
      </button>
      <p
        className="text-xs mt-4 flex items-center gap-1"
        style={{ color: "var(--text-muted)" }}
      >
        <ExternalLink className="w-3 h-3" />
        Set your Spotify Client ID in Settings first
      </p>
    </div>
  );
}
