import { useCallback, useEffect, useRef, useState } from "react";

export function useSFX() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.55);
  const [focusMode, setFocusModeState] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const idleRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle detection — reduce effective gain after 30s of inactivity
  useEffect(() => {
    const resetIdle = () => {
      idleRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        idleRef.current = true;
      }, 30_000);
    };
    document.addEventListener("pointermove", resetIdle);
    document.addEventListener("keydown", resetIdle);
    resetIdle();
    return () => {
      document.removeEventListener("pointermove", resetIdle);
      document.removeEventListener("keydown", resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return ctxRef.current;
  }, []);

  const effectiveGain = useCallback(
    (base: number) => {
      const idleMult = idleRef.current ? 0.5 : 1;
      return isMuted ? 0 : base * volume * (focusMode ? 0.5 : 1) * idleMult;
    },
    [isMuted, volume, focusMode],
  );

  const playTone = useCallback(
    (
      frequencies: number[],
      duration: number,
      type: OscillatorType,
      gainBase: number,
      descend = false,
    ) => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") ctx.resume();
        const g = effectiveGain(gainBase);
        if (g === 0) return;

        if (descend && frequencies.length > 1) {
          for (let i = 0; i < frequencies.length; i++) {
            const freq = frequencies[i];
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * duration);
            gainNode.gain.setValueAtTime(0, ctx.currentTime + i * duration);
            gainNode.gain.linearRampToValueAtTime(
              g,
              ctx.currentTime + i * duration + 0.01,
            );
            gainNode.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + i * duration + duration - 0.01,
            );
            osc.start(ctx.currentTime + i * duration);
            osc.stop(ctx.currentTime + i * duration + duration);
          }
        } else {
          for (const freq of frequencies) {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(g, ctx.currentTime + 0.06);
            gainNode.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + duration,
            );
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
          }
        }
      } catch {
        // Audio not available
      }
    },
    [getCtx, effectiveGain],
  );

  const playSessionStart = useCallback(() => {
    playTone([220, 330], 0.4, "sine", 0.22);
  }, [playTone]);

  const playSessionEnd = useCallback(() => {
    playTone([880, 660, 440], 0.15, "sine", 0.18, true);
  }, [playTone]);

  // Richer two-oscillator chord for task complete — louder chime
  const playTaskComplete = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const g = effectiveGain(0.28);
      if (g === 0) return;
      for (const freq of [880, 1320, 1760]) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          g / (freq / 880),
          ctx.currentTime + 0.02,
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 0.5,
        );
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // Audio not available
    }
  }, [getCtx, effectiveGain]);

  // Crisp navigation tap — noticeably present
  const playButtonTap = useCallback(() => {
    playTone([720, 960], 0.08, "sine", 0.22);
  }, [playTone]);

  const playErrorAlert = useCallback(() => {
    playTone([180], 0.3, "sawtooth", 0.1);
  }, [playTone]);

  // Soft pad swell for ambient toggle
  const playAmbientToggle = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const g = effectiveGain(0.1);
      if (g === 0) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(g, ctx.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio not available
    }
  }, [getCtx, effectiveGain]);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  const setVolume = useCallback(
    (v: number) => setVolumeState(Math.max(0, Math.min(1, v))),
    [],
  );

  const setFocusMode = useCallback((b: boolean) => setFocusModeState(b), []);

  return {
    isMuted,
    volume,
    focusMode,
    playSessionStart,
    playSessionEnd,
    playTaskComplete,
    playButtonTap,
    playErrorAlert,
    playAmbientToggle,
    toggleMute,
    setVolume,
    setFocusMode,
  };
}

export type SFXContextValue = ReturnType<typeof useSFX>;
