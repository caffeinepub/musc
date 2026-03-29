import { useCallback, useEffect, useRef, useState } from "react";

export type AmbientMode = "off" | "rain" | "cafe" | "whitenoise";

export interface AmbientSoundHook {
  ambientMode: AmbientMode;
  startAmbient: (mode: "rain" | "cafe" | "whitenoise") => void;
  stopAmbient: () => void;
  ambientVolume: number;
  setAmbientVolume: (v: number) => void;
}

function createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function useAmbientSound(): AmbientSoundHook {
  const [ambientMode, setAmbientMode] = useState<AmbientMode>("off");
  const [ambientVolume, setAmbientVolumeState] = useState(0.3);

  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const cafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return ctxRef.current;
  }, []);

  const stopAll = useCallback(() => {
    if (cafeTimerRef.current) {
      clearTimeout(cafeTimerRef.current);
      cafeTimerRef.current = null;
    }
    for (const node of nodesRef.current) {
      try {
        if (
          node instanceof AudioBufferSourceNode ||
          node instanceof OscillatorNode
        ) {
          (node as AudioBufferSourceNode | OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // already stopped
      }
    }
    nodesRef.current = [];
    if (masterGainRef.current) {
      try {
        masterGainRef.current.disconnect();
      } catch {
        /* ignore */
      }
      masterGainRef.current = null;
    }
  }, []);

  const startAmbient = useCallback(
    (mode: "rain" | "cafe" | "whitenoise") => {
      stopAll();
      setAmbientMode(mode);

      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();

      const master = ctx.createGain();
      master.gain.setValueAtTime(ambientVolume, ctx.currentTime);
      master.connect(ctx.destination);
      masterGainRef.current = master;

      if (mode === "whitenoise") {
        const buffer = createWhiteNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(master);
        source.start();
        nodesRef.current = [source];
      } else if (mode === "rain") {
        const buffer = createWhiteNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        source.connect(filter);
        filter.connect(master);
        source.start();
        nodesRef.current = [source, filter];
      } else if (mode === "cafe") {
        // Low hum
        const hum = ctx.createOscillator();
        const humGain = ctx.createGain();
        hum.type = "sine";
        hum.frequency.setValueAtTime(80, ctx.currentTime);
        humGain.gain.setValueAtTime(0.03, ctx.currentTime);
        hum.connect(humGain);
        humGain.connect(master);
        hum.start();
        nodesRef.current = [hum, humGain];

        // Random chatter pings
        const scheduleChatter = () => {
          const delay = 500 + Math.random() * 2500;
          cafeTimerRef.current = setTimeout(() => {
            if (ctxRef.current && masterGainRef.current) {
              try {
                const ping = ctxRef.current.createOscillator();
                const pingGain = ctxRef.current.createGain();
                const freq = 400 + Math.random() * 500;
                ping.type = "triangle";
                ping.frequency.setValueAtTime(freq, ctxRef.current.currentTime);
                pingGain.gain.setValueAtTime(0, ctxRef.current.currentTime);
                pingGain.gain.linearRampToValueAtTime(
                  0.015,
                  ctxRef.current.currentTime + 0.01,
                );
                pingGain.gain.exponentialRampToValueAtTime(
                  0.001,
                  ctxRef.current.currentTime + 0.12,
                );
                ping.connect(pingGain);
                pingGain.connect(masterGainRef.current);
                ping.start(ctxRef.current.currentTime);
                ping.stop(ctxRef.current.currentTime + 0.12);
              } catch {
                /* ignore */
              }
            }
            scheduleChatter();
          }, delay);
        };
        scheduleChatter();
      }
    },
    [stopAll, getCtx, ambientVolume],
  );

  const stopAmbient = useCallback(() => {
    stopAll();
    setAmbientMode("off");
  }, [stopAll]);

  const setAmbientVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setAmbientVolumeState(clamped);
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.setValueAtTime(
        clamped,
        ctxRef.current.currentTime,
      );
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return {
    ambientMode,
    startAmbient,
    stopAmbient,
    ambientVolume,
    setAmbientVolume,
  };
}
