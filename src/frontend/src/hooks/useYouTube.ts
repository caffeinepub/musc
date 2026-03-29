import { useCallback, useState } from "react";

export interface YouTubeState {
  videoId: string | null;
  playlistId: string | null;
  label: string;
  currentVideoIndex: number;
  totalVideos: number;
  isPlaying: boolean;
}

export function parseYouTubeInput(input: string): {
  videoId?: string;
  playlistId?: string;
  label: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { label: "" };

  // youtu.be short URL
  const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch)
    return { videoId: shortMatch[1], label: `Video: ${shortMatch[1]}` };

  // Full URL - extract v= and list=
  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const v = url.searchParams.get("v");
    const list = url.searchParams.get("list");
    if (list && !v) return { playlistId: list, label: `Playlist: ${list}` };
    if (v && list)
      return { videoId: v, playlistId: list, label: `Video+Playlist: ${v}` };
    if (v) return { videoId: v, label: `Video: ${v}` };
  } catch {
    // fallthrough
  }

  // Bare 11-char video ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return { videoId: trimmed, label: `Video: ${trimmed}` };
  }

  return { label: "" };
}

export function useYouTube() {
  const [state, setState] = useState<YouTubeState>({
    videoId: null,
    playlistId: null,
    label: "",
    currentVideoIndex: 1,
    totalVideos: 1,
    isPlaying: false,
  });

  const loadInput = useCallback((url: string) => {
    const parsed = parseYouTubeInput(url);
    setState((prev) => ({
      ...prev,
      videoId: parsed.videoId ?? null,
      playlistId: parsed.playlistId ?? null,
      label: parsed.label,
      currentVideoIndex: 1,
    }));
    if (parsed.label) {
      localStorage.setItem("yt_current_label", parsed.label);
    }
  }, []);

  const setCurrentVideoIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, currentVideoIndex: index }));
  }, []);

  const setTotalVideos = useCallback((total: number) => {
    setState((prev) => ({ ...prev, totalVideos: total }));
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, isPlaying: playing }));
  }, []);

  const clear = useCallback(() => {
    setState({
      videoId: null,
      playlistId: null,
      label: "",
      currentVideoIndex: 1,
      totalVideos: 1,
      isPlaying: false,
    });
    localStorage.removeItem("yt_current_label");
  }, []);

  return {
    ...state,
    loadInput,
    setCurrentVideoIndex,
    setTotalVideos,
    setIsPlaying,
    clear,
  };
}
