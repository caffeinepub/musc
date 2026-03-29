import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  isPlaying: boolean;
  ambientActive?: boolean;
}

const BAR_COUNT = 20;
const BASE_HEIGHTS = Array.from(
  { length: BAR_COUNT },
  (_, i) =>
    0.3 + 0.7 * Math.abs(Math.sin((i / BAR_COUNT) * Math.PI * 2.3 + 0.4)),
);

export function WaveformVisualizer({
  isPlaying,
  ambientActive = false,
}: WaveformVisualizerProps) {
  const frameRef = useRef<number>(0);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    const animate = () => {
      const t = (Date.now() - startTimeRef.current) / 1000;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        let h: number;
        if (isPlaying) {
          // Energetic: fast, per-bar phase
          const phase = (i / BAR_COUNT) * Math.PI * 2;
          const wave =
            Math.abs(Math.sin(t * 3.5 + phase)) * 0.6 +
            Math.abs(Math.sin(t * 6.1 + phase * 1.3)) * 0.4;
          h = Math.max(0.08, BASE_HEIGHTS[i] * wave);
        } else if (ambientActive) {
          // Gentle idle pulse
          const phase = (i / BAR_COUNT) * Math.PI * 2;
          h = 0.1 + 0.1 * Math.sin(t * 0.8 + phase);
        } else {
          h = 0.06;
        }
        bar.style.height = `${h * 100}%`;
      });
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isPlaying, ambientActive]);

  const active = isPlaying || ambientActive;

  return (
    <div
      className="flex items-end gap-0.5 h-10 px-2 py-1 rounded-xl"
      style={{
        background: "rgba(34,193,255,0.04)",
        border: "1px solid rgba(34,193,255,0.12)",
      }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static array
          key={`bar-${i}`}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          style={{
            flex: 1,
            minHeight: "4px",
            borderRadius: "2px",
            background: `rgba(34, 193, 255, ${active ? 0.85 : 0.2})`,
            boxShadow: active
              ? `0 0 4px rgba(34,193,255,${isPlaying ? 0.5 : 0.25})`
              : "none",
            transition: active
              ? "none"
              : "height 0.5s ease, background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}
