import { useCallback, useState } from "react";
import type { Session } from "../backend";
import { useActor } from "./useActor";

export interface ActiveSession {
  taskId: number;
  taskName: string;
  playlistId: string;
  playlistName: string;
  totalTracks: number;
  tracksCompleted: number;
  pauseCount: number;
  startedAt: number;
  backendId?: bigint;
}

export function useSession() {
  const { actor } = useActor();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null,
  );

  const startSession = useCallback(
    async (
      taskId: number,
      taskName: string,
      playlistId: string,
      playlistName: string,
      totalTracks: number,
    ) => {
      if (!actor) return;
      const session: Session = {
        taskId: BigInt(taskId),
        playlistId,
        playlistName,
        totalTracks: BigInt(totalTracks),
        tracksCompleted: BigInt(0),
        pauseCount: BigInt(0),
        startedAt: BigInt(Date.now()),
        completedWithinSession: false,
        score: BigInt(100),
      };
      try {
        const id = await actor.createSession(session);
        setActiveSession({
          taskId,
          taskName,
          playlistId,
          playlistName,
          totalTracks,
          tracksCompleted: 0,
          pauseCount: 0,
          startedAt: Date.now(),
          backendId: id,
        });
      } catch {
        setActiveSession({
          taskId,
          taskName,
          playlistId,
          playlistName,
          totalTracks,
          tracksCompleted: 0,
          pauseCount: 0,
          startedAt: Date.now(),
        });
      }
    },
    [actor],
  );

  const endSession = useCallback(
    async (completedWithinSession: boolean) => {
      if (!actor || !activeSession) return;
      const score = Math.max(0, 100 - activeSession.pauseCount * 10);
      const session: Session = {
        taskId: BigInt(activeSession.taskId),
        playlistId: activeSession.playlistId,
        playlistName: activeSession.playlistName,
        totalTracks: BigInt(activeSession.totalTracks),
        tracksCompleted: BigInt(activeSession.tracksCompleted),
        pauseCount: BigInt(activeSession.pauseCount),
        startedAt: BigInt(activeSession.startedAt),
        endedAt: BigInt(Date.now()),
        completedWithinSession,
        score: BigInt(score),
      };
      try {
        if (activeSession.backendId !== undefined) {
          await actor.updateSession(activeSession.backendId, session);
        }
      } catch {}
      setActiveSession(null);
    },
    [actor, activeSession],
  );

  const incrementPause = useCallback(() => {
    setActiveSession((prev) =>
      prev ? { ...prev, pauseCount: prev.pauseCount + 1 } : null,
    );
  }, []);

  const trackCompleted = useCallback(() => {
    setActiveSession((prev) => {
      if (!prev) return null;
      const next = prev.tracksCompleted + 1;
      return { ...prev, tracksCompleted: next };
    });
  }, []);

  return {
    activeSession,
    startSession,
    endSession,
    incrementPause,
    trackCompleted,
  };
}
