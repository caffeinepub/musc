import { createContext, useCallback, useContext, useState } from "react";

interface GameContextValue {
  streaks: number;
  confidence: number;
  gamesPlayed: number;
  addStreak: () => void;
  updateConfidence: (delta: number) => void;
  recordGamePlayed: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function loadNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return Number(v);
  } catch {
    return fallback;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [streaks, setStreaks] = useState(() => loadNum("musc_streaks", 0));
  const [confidence, setConfidence] = useState(() =>
    loadNum("musc_confidence", 50),
  );
  const [gamesPlayed, setGamesPlayed] = useState(() =>
    loadNum("musc_games_played", 0),
  );

  const addStreak = useCallback(() => {
    setStreaks((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem("musc_streaks", String(next));
      } catch {}
      return next;
    });
  }, []);

  const updateConfidence = useCallback((delta: number) => {
    setConfidence((prev) => {
      const next = Math.max(0, Math.min(100, prev + delta));
      try {
        localStorage.setItem("musc_confidence", String(next));
      } catch {}
      return next;
    });
  }, []);

  const recordGamePlayed = useCallback(() => {
    setGamesPlayed((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem("musc_games_played", String(next));
      } catch {}
      return next;
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        streaks,
        confidence,
        gamesPlayed,
        addStreak,
        updateConfidence,
        recordGamePlayed,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameContext must be used within GameProvider");
  return ctx;
}
