import { useState } from "react";
import { parseYouTubeInput } from "../../hooks/useYouTube";

interface YouTubeInputProps {
  onLoad: (videoId?: string, playlistId?: string, label?: string) => void;
}

export function YouTubeInput({ onLoad }: YouTubeInputProps) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<{
    videoId?: string;
    playlistId?: string;
    label: string;
  } | null>(null);

  const handleChange = (val: string) => {
    setInput(val);
    if (val.trim()) {
      const result = parseYouTubeInput(val);
      setParsed(result.label ? result : null);
    } else {
      setParsed(null);
    }
  };

  const handleLoad = () => {
    if (!parsed) return;
    onLoad(parsed.videoId, parsed.playlistId, parsed.label);
    setInput("");
    setParsed(null);
  };

  return (
    <div
      className="p-5 rounded-2xl"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
      }}
    >
      <p
        className="text-sm font-semibold mb-3"
        style={{ color: "var(--text-primary)" }}
      >
        Load YouTube Video or Playlist
      </p>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Paste a YouTube link, playlist URL, or video ID
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 px-3 py-2 rounded-xl text-sm transition-all outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
          }}
          data-ocid="youtube.input"
        />
        <button
          type="button"
          onClick={handleLoad}
          disabled={!parsed}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            background: parsed
              ? "linear-gradient(135deg, #22C1FF, #2D7CFF)"
              : "var(--bg-base)",
            color: parsed ? "#05080D" : "var(--text-muted)",
            border: parsed ? "none" : "1px solid var(--border-color)",
            cursor: parsed ? "pointer" : "not-allowed",
          }}
          data-ocid="youtube.primary_button"
        >
          Load
        </button>
      </div>
      {parsed && (
        <p className="text-xs mt-2" style={{ color: "var(--accent-cyan)" }}>
          ✓ {parsed.label}
        </p>
      )}
    </div>
  );
}
