import { useCallback, useEffect, useRef, useState } from "react";
import type { SpotifyTokens } from "../backend";
import { useActor } from "./useActor";

export interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt: string;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  trackCount: number;
  imageUrl: string;
}

const parseCurrentlyPlaying = (json: string): SpotifyTrack | null => {
  try {
    const data = JSON.parse(json);
    if (!data || !data.item) return null;
    return {
      name: data.item.name || "Unknown",
      artist: data.item.artists?.[0]?.name || "Unknown",
      albumArt: data.item.album?.images?.[0]?.url || "",
      progressMs: data.progress_ms || 0,
      durationMs: data.item.duration_ms || 0,
      isPlaying: data.is_playing || false,
    };
  } catch {
    return null;
  }
};

const parsePlaylists = (json: string): SpotifyPlaylist[] => {
  try {
    const data = JSON.parse(json);
    if (!data || !data.items) return [];
    return data.items.map(
      (p: {
        id: string;
        name: string;
        tracks?: { total?: number };
        images?: { url: string }[];
      }) => ({
        id: p.id,
        name: p.name,
        trackCount: p.tracks?.total || 0,
        imageUrl: p.images?.[0]?.url || "",
      }),
    );
  } catch {
    return [];
  }
};

export function useSpotify() {
  const { actor } = useActor();
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollCurrentTrack = useCallback(async () => {
    if (!actor || !isConnected) return;
    try {
      const json = await actor.getCurrentlyPlaying();
      const track = parseCurrentlyPlaying(json);
      setCurrentTrack(track);
    } catch {
      // silently fail
    }
  }, [actor, isConnected]);

  // Load tokens on mount
  useEffect(() => {
    if (!actor) return;
    actor
      .getUserTokens()
      .then((t) => {
        if (t?.accessToken) {
          setTokens(t);
          setIsConnected(true);
        }
      })
      .catch(() => {});
  }, [actor]);

  // Poll current track when connected
  useEffect(() => {
    if (isConnected && actor) {
      pollCurrentTrack();
      pollRef.current = setInterval(pollCurrentTrack, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isConnected, actor, pollCurrentTrack]);

  // Handle OAuth redirect — parse token from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token=")) return;
    const params = new URLSearchParams(hash.replace("#", ""));
    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");
    if (!accessToken || !actor) return;
    window.history.replaceState({}, document.title, window.location.pathname);
    const spotifyTokens: SpotifyTokens = {
      accessToken,
      refreshToken: "",
      expiresAt: BigInt(Date.now() + Number(expiresIn || 3600) * 1000),
      spotifyUserId: "",
      displayName: "",
    };
    fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((profile) => {
        spotifyTokens.spotifyUserId = profile.id || "";
        spotifyTokens.displayName = profile.display_name || "";
        actor
          .updateUserTokens(spotifyTokens)
          .then(() => {
            setTokens(spotifyTokens);
            setIsConnected(true);
          })
          .catch(() => {});
      })
      .catch(() => {
        actor
          .updateUserTokens(spotifyTokens)
          .then(() => {
            setTokens(spotifyTokens);
            setIsConnected(true);
          })
          .catch(() => {});
      });
  }, [actor]);

  const refreshPlaylists = useCallback(async () => {
    if (!actor || !isConnected) return;
    setLoadingPlaylists(true);
    try {
      const json = await actor.getUserPlaylists();
      setPlaylists(parsePlaylists(json));
    } catch {
      // silently fail
    } finally {
      setLoadingPlaylists(false);
    }
  }, [actor, isConnected]);

  const connect = useCallback(() => {
    const clientId =
      localStorage.getItem("spotify_client_id") ||
      import.meta.env.VITE_SPOTIFY_CLIENT_ID ||
      "";
    if (!clientId) {
      alert("Please add your Spotify Client ID in Settings first.");
      return;
    }
    const scopes =
      "user-read-currently-playing user-read-playback-state user-modify-playback-state playlist-read-private user-read-private user-read-email";
    const redirectUri = window.location.origin;
    const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    window.location.href = url;
  }, []);

  const disconnect = useCallback(async () => {
    if (!actor) return;
    await actor.updateUserTokens({
      accessToken: "",
      refreshToken: "",
      expiresAt: BigInt(0),
      spotifyUserId: "",
      displayName: "",
    });
    setTokens(null);
    setIsConnected(false);
    setCurrentTrack(null);
    setPlaylists([]);
  }, [actor]);

  const startPlay = useCallback(async () => {
    if (!actor) return;
    try {
      await actor.startPlayback();
    } catch {}
  }, [actor]);

  const pausePlay = useCallback(async () => {
    if (!actor) return;
    try {
      await actor.pausePlayback();
    } catch {}
  }, [actor]);

  return {
    isConnected,
    tokens,
    currentTrack,
    playlists,
    loadingPlaylists,
    connect,
    disconnect,
    startPlay,
    pausePlay,
    refreshPlaylists,
    pollCurrentTrack,
  };
}
