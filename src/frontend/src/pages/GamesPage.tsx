import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameContext } from "../context/GameContext";
import { useSFXContext } from "../context/SFXContext";

// ── Shared audio helper ──────────────────────────────────────────────────────────
function playToneOnce(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.12,
) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    osc.onended = () => ctx.close();
  } catch {}
}

// ── A. Coffee Catch ──────────────────────────────────────────────────────────────
interface Bean {
  x: number;
  y: number;
  speed: number;
  trail: { x: number; y: number }[];
  glowing: boolean;
}

function CoffeeBeanGame({ onClose }: { onClose: () => void }) {
  const { addStreak, updateConfidence } = useGameContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetXRef = useRef(200);
  const stateRef = useRef({
    cupX: 200,
    beans: [] as Bean[],
    score: 0,
    misses: 0,
    frame: 0,
    gameOver: false,
    running: false,
    catchFlash: 0,
  });
  const [display, setDisplay] = useState({
    score: 0,
    misses: 0,
    gameOver: false,
    started: false,
  });
  const rafRef = useRef<number>(0);

  const CUP_W = 64;
  const CUP_H = 44;
  const CANVAS_W = 400;
  const CANVAS_H = 460;

  const spawnBean = useCallback(() => {
    const s = stateRef.current;
    const difficulty = 1 + Math.floor(s.score / 5) * 0.15;
    s.beans.push({
      x: 24 + Math.random() * (CANVAS_W - 48),
      y: -14,
      speed: (2.5 + s.frame * 0.0008) * difficulty,
      trail: [],
      glowing: false,
    });
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || !s.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    s.frame++;
    // Lerp cup toward mouse/touch target
    s.cupX += (targetXRef.current - s.cupX) * 0.16;

    const spawnInterval = Math.max(30, 60 - Math.floor(s.score / 4) * 3);
    if (s.frame % spawnInterval === 0) spawnBean();

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const cupY = CANVAS_H - CUP_H - 12;

    // Cup glow on catch
    if (s.catchFlash > 0) {
      s.catchFlash--;
      ctx.shadowColor = "#F59E0B";
      ctx.shadowBlur = 28;
    } else {
      ctx.shadowColor = "rgba(245,158,11,0.3)";
      ctx.shadowBlur = 10;
    }

    // Draw cup
    ctx.fillStyle = "rgba(245,158,11,0.18)";
    ctx.strokeStyle = s.catchFlash > 0 ? "#F59E0B" : "rgba(245,158,11,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(s.cupX - CUP_W / 2, cupY, CUP_W, CUP_H, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.fillText("\u2615", s.cupX, cupY + 28);

    // Beans
    const survived: Bean[] = [];
    for (const bean of s.beans) {
      bean.trail.push({ x: bean.x, y: bean.y });
      if (bean.trail.length > 6) bean.trail.shift();
      bean.y += bean.speed;

      const caught =
        bean.y > CANVAS_H - CUP_H - 12 &&
        bean.y < CANVAS_H - 12 &&
        Math.abs(bean.x - s.cupX) < CUP_W / 2 + 10;

      if (caught) {
        s.score++;
        s.catchFlash = 8;
        playToneOnce(523, 0.07);
        setDisplay((d) => ({ ...d, score: s.score }));
      } else if (bean.y > CANVAS_H + 20) {
        s.misses++;
        playToneOnce(180, 0.15, "sawtooth", 0.08);
        setDisplay((d) => ({ ...d, misses: s.misses }));
        if (s.misses >= 3) {
          s.gameOver = true;
          s.running = false;
          addStreak();
          updateConfidence(5);
          setDisplay((d) => ({ ...d, gameOver: true }));
          return;
        }
      } else {
        // Draw glowing trail
        for (let t = 0; t < bean.trail.length; t++) {
          const alpha = ((t + 1) / bean.trail.length) * 0.5;
          ctx.globalAlpha = alpha;
          ctx.shadowColor = "#F59E0B";
          ctx.shadowBlur = 6;
          ctx.font = "10px serif";
          ctx.fillText("\u2022", bean.trail[t].x, bean.trail[t].y);
        }
        ctx.globalAlpha = 1;
        ctx.shadowColor = "#F59E0B";
        ctx.shadowBlur = 12;
        ctx.font = "18px serif";
        ctx.fillText("\u2615", bean.x, bean.y);
        ctx.shadowBlur = 0;
        survived.push(bean);
      }
    }
    s.beans = survived;
    rafRef.current = requestAnimationFrame(tick);
  }, [spawnBean, addStreak, updateConfidence]);

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.cupX = 200;
    targetXRef.current = 200;
    s.beans = [];
    s.score = 0;
    s.misses = 0;
    s.frame = 0;
    s.gameOver = false;
    s.running = true;
    s.catchFlash = 0;
    setDisplay({ score: 0, misses: 0, gameOver: false, started: true });
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        targetXRef.current = Math.max(32, targetXRef.current - 24);
      if (e.key === "ArrowRight")
        targetXRef.current = Math.min(CANVAS_W - 32, targetXRef.current + 24);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      targetXRef.current = Math.max(
        32,
        Math.min(
          CANVAS_W - 32,
          ((clientX - rect.left) / rect.width) * CANVAS_W,
        ),
      );
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      onMove(e.touches[0].clientX);
    };
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex gap-6 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        <span>
          Score: <strong style={{ color: "#F59E0B" }}>{display.score}</strong>
        </span>
        <span>
          Misses:{" "}
          <strong
            style={{
              color: display.misses >= 2 ? "#EF4444" : "var(--text-primary)",
            }}
          >
            {display.misses}/3
          </strong>
        </span>
        {display.started && !display.gameOver && (
          <span style={{ color: "#FB923C" }}>
            Lvl {Math.floor(display.score / 5) + 1}
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          borderRadius: 14,
          background: "rgba(245,158,11,0.04)",
          border: "1px solid rgba(245,158,11,0.14)",
          maxWidth: "100%",
          cursor: display.started && !display.gameOver ? "none" : "default",
        }}
      />
      {!display.started && (
        <button
          type="button"
          onClick={start}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "#F59E0B",
          }}
        >
          Start Game
        </button>
      )}
      {display.gameOver && (
        <GameResultOverlay
          score={display.score}
          streaksEarned={1}
          confidenceChange={5}
          won
          onPlayAgain={start}
          onClose={onClose}
          accentColor="#F59E0B"
        />
      )}
      {display.started && !display.gameOver && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Move mouse / touch-drag to steer ☕ — 3 misses = game over
        </p>
      )}
    </div>
  );
}

// ── B. Book Stack ────────────────────────────────────────────────────────────────
const BOOK_COLORS = [
  "#F59E0B",
  "#A78BFA",
  "#FB923C",
  "#34D399",
  "#60A5FA",
  "#F472B6",
];
function BookStackGame({ onClose }: { onClose: () => void }) {
  const { addStreak } = useGameContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 400;
  const H = 460;
  const BOOK_H = 28;
  const stateRef = useRef({
    platform: { x: 120, dir: 1, speed: 2.5 },
    stack: [] as { x: number; w: number; color: string }[],
    currentW: 160,
    score: 0,
    gameOver: false,
    running: false,
    frame: 0,
    perfectFlash: 0,
  });
  const rafRef = useRef<number>(0);
  const [display, setDisplay] = useState({
    score: 0,
    gameOver: false,
    started: false,
    perfect: false,
  });
  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || !s.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    s.frame++;
    ctx.clearRect(0, 0, W, H);
    s.platform.x += s.platform.dir * s.platform.speed;
    if (s.platform.x + s.currentW >= W - 10 || s.platform.x <= 10)
      s.platform.dir *= -1;
    const stackH = s.stack.length;

    // Perfect flash bg
    if (s.perfectFlash > 0) {
      s.perfectFlash--;
      ctx.fillStyle = `rgba(245,158,11,${s.perfectFlash * 0.015})`;
      ctx.fillRect(0, 0, W, H);
    }

    for (let i = 0; i < s.stack.length; i++) {
      const b = s.stack[i];
      const y = H - BOOK_H * (i + 1) - 10;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = `${b.color}cc`;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(b.x, y, b.w, BOOK_H - 2, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "13px serif";
      ctx.textAlign = "center";
      ctx.fillText("\ud83d\udcda", b.x + b.w / 2, y + 17);
    }

    const platformY = H - BOOK_H * (stackH + 1) - 10;
    const color = BOOK_COLORS[stackH % BOOK_COLORS.length];
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = `${color}99`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(s.platform.x, platformY, s.currentW, BOOK_H - 2, 4);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "13px serif";
    ctx.textAlign = "center";
    ctx.fillText("\ud83d\udcd6", s.platform.x + s.currentW / 2, platformY + 17);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const drop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running || s.gameOver) return;
    const topOfStack = s.stack[s.stack.length - 1];
    const colors = BOOK_COLORS;
    if (!topOfStack) {
      s.stack.push({ x: s.platform.x, w: s.currentW, color: colors[0] });
      s.score++;
      playToneOnce(330, 0.1);
    } else {
      const left = Math.max(s.platform.x, topOfStack.x);
      const right = Math.min(
        s.platform.x + s.currentW,
        topOfStack.x + topOfStack.w,
      );
      const overlap = right - left;
      if (overlap <= 0) {
        s.gameOver = true;
        s.running = false;
        addStreak();
        playToneOnce(200, 0.3, "sawtooth", 0.1);
        setDisplay((d) => ({ ...d, gameOver: true }));
        cancelAnimationFrame(rafRef.current);
        return;
      }
      const isPerfect = Math.abs(overlap - topOfStack.w) < 8;
      if (isPerfect) {
        s.perfectFlash = 20;
        playToneOnce(880, 0.2, "sine", 0.18);
        playToneOnce(1100, 0.15, "sine", 0.12);
        setDisplay((d) => ({ ...d, perfect: true }));
        setTimeout(() => setDisplay((d) => ({ ...d, perfect: false })), 600);
      } else {
        playToneOnce(440, 0.1);
      }
      s.stack.push({
        x: left,
        w: overlap,
        color: colors[s.stack.length % colors.length],
      });
      s.currentW = overlap;
      s.platform.speed = Math.min(9, 2.5 + s.score * 0.35);
      s.score++;
    }
    setDisplay((d) => ({ ...d, score: s.score }));
  }, [addStreak]);

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = stateRef.current;
    s.platform = { x: 120, dir: 1, speed: 2.5 };
    s.stack = [];
    s.currentW = 160;
    s.score = 0;
    s.gameOver = false;
    s.running = true;
    s.frame = 0;
    s.perfectFlash = 0;
    setDisplay({ score: 0, gameOver: false, started: true, perfect: false });
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", onKey);
    const canvas = canvasRef.current;
    canvas?.addEventListener("click", drop);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      drop();
    };
    canvas?.addEventListener("touchstart", onTouch, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      canvas?.removeEventListener("click", drop);
      canvas?.removeEventListener("touchstart", onTouch);
      cancelAnimationFrame(rafRef.current);
    };
  }, [drop]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex gap-6 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        <span>
          Stacked: <strong style={{ color: "#A78BFA" }}>{display.score}</strong>
        </span>
        <AnimatePresence>
          {display.perfect && (
            <motion.span
              key="perfect"
              initial={{ opacity: 0, scale: 0.7, y: -4 }}
              animate={{ opacity: 1, scale: 1.2, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ color: "#F59E0B", fontWeight: "bold" }}
            >
              ✨ PERFECT!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 14,
          background: "rgba(167,139,250,0.04)",
          border: "1px solid rgba(167,139,250,0.14)",
          maxWidth: "100%",
          cursor: "pointer",
        }}
      />
      {!display.started && (
        <button
          type="button"
          onClick={start}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{
            background: "rgba(167,139,250,0.15)",
            border: "1px solid rgba(167,139,250,0.4)",
            color: "#A78BFA",
          }}
        >
          Start Game
        </button>
      )}
      {display.gameOver && (
        <GameResultOverlay
          score={display.score}
          streaksEarned={display.score >= 3 ? 1 : 0}
          confidenceChange={display.score * 2}
          won={display.score >= 3}
          onPlayAgain={start}
          onClose={onClose}
          accentColor="#A78BFA"
        />
      )}
      {display.started && !display.gameOver && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Click / Space / tap canvas to drop — align perfectly for a bonus!
        </p>
      )}
    </div>
  );
}

// ── C. Beat Tap ──────────────────────────────────────────────────────────────────
const BEAT_LANES = ["A", "S", "D"];
const BEAT_COLORS = ["#F59E0B", "#A78BFA", "#34D399"];

const BEAT_PATTERN = [
  "kick",
  "hihat",
  "snare",
  "hihat",
  "kick",
  "hihat",
  "snare",
  "hihat",
] as const;
const BEAT_STEP_KEYS = [
  "k1",
  "hh1",
  "s1",
  "hh2",
  "k2",
  "hh3",
  "s2",
  "hh4",
] as const;
type BeatType = (typeof BEAT_PATTERN)[number];
type BeatNote = { id: number; lane: number; y: number; type: BeatType };
type HitQuality = "perfect" | "good" | "miss";

const NOTE_DIMS: Record<BeatType, { w: number; h: number }> = {
  kick: { w: 54, h: 40 },
  snare: { w: 40, h: 30 },
  hihat: { w: 26, h: 20 },
};

function drumKick(ctx: AudioContext, time: number, vol = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, time);
  osc.frequency.exponentialRampToValueAtTime(20, time + 0.35);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.start(time);
  osc.stop(time + 0.36);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function drumSnare(ctx: AudioContext, time: number, vol = 0.3) {
  const bufLen = Math.floor(ctx.sampleRate * 0.12);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 200;
  filt.Q.value = 0.5;
  const gain = ctx.createGain();
  src.connect(filt);
  filt.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  src.start(time);
  src.stop(time + 0.15);
  src.onended = () => {
    src.disconnect();
    filt.disconnect();
    gain.disconnect();
  };
}

function drumHihat(ctx: AudioContext, time: number, vol = 0.15) {
  const bufLen = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "highpass";
  filt.frequency.value = 8000;
  const gain = ctx.createGain();
  src.connect(filt);
  filt.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  src.start(time);
  src.stop(time + 0.05);
  src.onended = () => {
    src.disconnect();
    filt.disconnect();
    gain.disconnect();
  };
}

function MusicBeatGame({ onClose }: { onClose: () => void }) {
  const { updateConfidence } = useGameContext();

  const LANE_HEIGHT = 360;
  const HIT_ZONE = LANE_HEIGHT - 50;
  const NOTE_SPEED = 3;
  const TRAVEL_TIME_MS = (HIT_ZONE / NOTE_SPEED / 60) * 1000;
  const BPM = 120;
  const STEP_SEC = 60 / BPM / 2;
  const SCHEDULE_AHEAD = 0.12;
  const SCHEDULER_INTERVAL_MS = 25;

  const [notes, setNotes] = useState<BeatNote[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hitEffects, setHitEffects] = useState<
    { id: number; lane: number; quality: HitQuality; text: string }[]
  >([]);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [beatFlash, setBeatFlash] = useState<BeatType | null>(null);

  const notesRef = useRef<BeatNote[]>([]);
  const missesRef = useRef(0);
  const comboRef = useRef(0);
  const runningRef = useRef(false);
  const frameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const noteIdRef = useRef(0);
  notesRef.current = notes;

  const stopBeat = useCallback(() => {
    if (schedulerTimerRef.current) {
      clearTimeout(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const schedulerTick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !runningRef.current) return;
    while (nextStepTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
      const beatTime = nextStepTimeRef.current;
      const stepIdx = currentStepRef.current % BEAT_PATTERN.length;
      const beatType = BEAT_PATTERN[stepIdx];
      if (beatType === "kick") drumKick(ctx, beatTime);
      else if (beatType === "snare") drumSnare(ctx, beatTime);
      else drumHihat(ctx, beatTime);
      if (beatType === "kick" || beatType === "snare") {
        const spawnDelayMs = Math.max(
          0,
          (beatTime - ctx.currentTime) * 1000 - TRAVEL_TIME_MS,
        );
        const lane = Math.floor(Math.random() * 3);
        const id = noteIdRef.current++;
        const capturedType = beatType;
        setTimeout(() => {
          if (!runningRef.current) return;
          setNotes((prev) => [...prev, { id, lane, y: 0, type: capturedType }]);
          setBeatFlash(capturedType);
          setTimeout(() => setBeatFlash(null), 80);
        }, spawnDelayMs);
      }
      nextStepTimeRef.current += STEP_SEC;
      currentStepRef.current++;
    }
    schedulerTimerRef.current = setTimeout(
      schedulerTick,
      SCHEDULER_INTERVAL_MS,
    );
  }, [TRAVEL_TIME_MS, STEP_SEC]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are stable
  const tick = useCallback(() => {
    setNotes((prev) => {
      const updated = prev.map((n) => ({ ...n, y: n.y + NOTE_SPEED }));
      const survived = updated.filter((n) => n.y < LANE_HEIGHT + 20);
      const lost = updated.filter((n) => n.y >= LANE_HEIGHT + 20);
      if (lost.length > 0) {
        missesRef.current += lost.length;
        comboRef.current = 0;
        setCombo(0);
        setMisses(missesRef.current);
        if (missesRef.current >= 10) {
          runningRef.current = false;
          setRunning(false);
          setGameOver(true);
          cancelAnimationFrame(frameRef.current);
          stopBeat();
          return prev;
        }
      }
      return survived;
    });
    frameRef.current = requestAnimationFrame(tick);
  }, [LANE_HEIGHT, NOTE_SPEED, stopBeat]);

  const hit = useCallback(
    (lane: number) => {
      const nearby = notesRef.current.filter(
        (n) => n.lane === lane && n.y > HIT_ZONE - 42 && n.y < HIT_ZONE + 42,
      );
      const eid = Date.now() + lane;
      if (nearby.length > 0) {
        const [first] = nearby;
        const isPerfect = Math.abs(first.y - HIT_ZONE) < 22;
        const quality: HitQuality = isPerfect ? "perfect" : "good";
        const text = isPerfect ? "PERFECT" : "GOOD";
        setNotes((prev) => prev.filter((n) => n.id !== first.id));
        comboRef.current += 1;
        setCombo(comboRef.current);
        const multiplier = Math.min(4, 1 + Math.floor(comboRef.current / 3));
        const points = multiplier;
        setScore((p) => p + points);
        updateConfidence(isPerfect ? 4 : 2);
        playToneOnce(isPerfect ? 880 : 660, 0.1, "sine", 0.15);
        setHitEffects((prev) => [...prev, { id: eid, lane, quality, text }]);
        setTimeout(
          () => setHitEffects((prev) => prev.filter((e) => e.id !== eid)),
          500,
        );
      } else {
        missesRef.current += 1;
        comboRef.current = 0;
        setCombo(0);
        setMisses((p) => p + 1);
        playToneOnce(150, 0.15, "sawtooth", 0.1);
        setHitEffects((prev) => [
          ...prev,
          { id: eid, lane, quality: "miss", text: "MISS" },
        ]);
        setTimeout(
          () => setHitEffects((prev) => prev.filter((e) => e.id !== eid)),
          500,
        );
        if (missesRef.current >= 10) {
          runningRef.current = false;
          setRunning(false);
          setGameOver(true);
          cancelAnimationFrame(frameRef.current);
          stopBeat();
        }
      }
    },
    [updateConfidence, HIT_ZONE, stopBeat],
  );

  const start = useCallback(() => {
    stopBeat();
    setNotes([]);
    setScore(0);
    setCombo(0);
    setMisses(0);
    setGameOver(false);
    setRunning(true);
    missesRef.current = 0;
    comboRef.current = 0;
    noteIdRef.current = 0;
    runningRef.current = true;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    nextStepTimeRef.current = ctx.currentTime + 0.05;
    currentStepRef.current = 0;
    schedulerTick();
    frameRef.current = requestAnimationFrame(tick);
  }, [tick, schedulerTick, stopBeat]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A") hit(0);
      if (e.key === "s" || e.key === "S") hit(1);
      if (e.key === "d" || e.key === "D") hit(2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, hit]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      stopBeat();
      runningRef.current = false;
    };
  }, [stopBeat]);

  const multiplier = Math.min(4, 1 + Math.floor(combo / 3));

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Score + combo row */}
      <div
        className="flex gap-4 text-sm items-center"
        style={{ color: "var(--text-secondary)" }}
      >
        <span>
          Score: <strong style={{ color: "#F59E0B" }}>{score}</strong>
        </span>
        {combo >= 3 && (
          <motion.span
            key={multiplier}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: "rgba(245,158,11,0.2)",
              border: "1px solid rgba(245,158,11,0.5)",
              color: "#F59E0B",
            }}
          >
            {multiplier}x COMBO ({combo})
          </motion.span>
        )}
        {combo > 0 && combo < 3 && (
          <span style={{ color: "#A78BFA" }}>Combo: {combo}</span>
        )}
        <span>
          Misses:{" "}
          <strong
            style={{ color: misses >= 7 ? "#EF4444" : "var(--text-primary)" }}
          >
            {misses}/10
          </strong>
        </span>
      </div>

      {/* Beat indicator bar */}
      {running && (
        <div className="flex gap-1.5 mb-1">
          {BEAT_PATTERN.map((step, i) => (
            <div
              key={BEAT_STEP_KEYS[i]}
              style={{
                width: step === "kick" ? 14 : step === "snare" ? 10 : 6,
                height: step === "kick" ? 14 : step === "snare" ? 10 : 6,
                borderRadius: "50%",
                background:
                  beatFlash === step
                    ? step === "kick"
                      ? "#F59E0B"
                      : step === "snare"
                        ? "#A78BFA"
                        : "rgba(255,255,255,0.4)"
                    : step === "kick"
                      ? "rgba(245,158,11,0.25)"
                      : step === "snare"
                        ? "rgba(167,139,250,0.25)"
                        : "rgba(255,255,255,0.12)",
                boxShadow:
                  beatFlash === step
                    ? step === "kick"
                      ? "0 0 8px #F59E0B"
                      : step === "snare"
                        ? "0 0 8px #A78BFA"
                        : "none"
                    : "none",
                transition: "background 0.06s, box-shadow 0.06s",
              }}
            />
          ))}
        </div>
      )}

      {/* Lanes */}
      <div className="flex gap-2" style={{ height: LANE_HEIGHT }}>
        {BEAT_LANES.map((lane, i) => (
          <button
            type="button"
            key={lane}
            onClick={() => hit(i)}
            style={{
              width: 80,
              height: LANE_HEIGHT,
              background: "rgba(245,158,11,0.03)",
              border: `1px solid ${BEAT_COLORS[i]}33`,
              borderRadius: 12,
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {/* Hit zone line */}
            <div
              style={{
                position: "absolute",
                bottom: 50,
                left: 0,
                right: 0,
                height: 3,
                background: `${BEAT_COLORS[i]}80`,
                boxShadow: `0 0 10px ${BEAT_COLORS[i]}`,
              }}
            />

            {/* Notes */}
            {notes
              .filter((n) => n.lane === i)
              .map((n) => {
                const dim = NOTE_DIMS[n.type];
                const isKick = n.type === "kick";
                return (
                  <div
                    key={n.id}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: n.y - dim.h / 2,
                      transform: "translateX(-50%)",
                      width: dim.w,
                      height: dim.h,
                      borderRadius: isKick ? 10 : 6,
                      background: `${BEAT_COLORS[i]}${isKick ? "ee" : "aa"}`,
                      boxShadow: `0 0 ${isKick ? 18 : 8}px ${BEAT_COLORS[i]}`,
                      border: `1px solid ${BEAT_COLORS[i]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: isKick ? 16 : 12,
                    }}
                  >
                    {isKick ? "♪" : n.type === "snare" ? "◆" : "•"}
                  </div>
                );
              })}

            {/* Hit effects */}
            {hitEffects
              .filter((e) => e.lane === i)
              .map((e) => (
                <div
                  key={e.id}
                  style={{
                    position: "absolute",
                    bottom: 60,
                    left: "50%",
                    transform: "translateX(-50%)",
                    color:
                      e.quality === "perfect"
                        ? BEAT_COLORS[i]
                        : e.quality === "good"
                          ? "#34D399"
                          : "#EF4444",
                    fontWeight: "bold",
                    fontSize: e.quality === "perfect" ? 13 : 11,
                    whiteSpace: "nowrap",
                    animation: "beatFadeUp 0.5s ease forwards",
                    pointerEvents: "none",
                    textShadow:
                      e.quality === "perfect"
                        ? `0 0 12px ${BEAT_COLORS[i]}`
                        : "none",
                  }}
                >
                  {e.text}
                </div>
              ))}

            {/* Lane label */}
            <span
              style={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                transform: "translateX(-50%)",
                color: BEAT_COLORS[i],
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              {lane}
            </span>
          </button>
        ))}
      </div>

      <style>
        {
          "@keyframes beatFadeUp { from { opacity:1; transform: translateX(-50%) translateY(0); } to { opacity:0; transform: translateX(-50%) translateY(-28px); } }"
        }
      </style>

      {!running && !gameOver && (
        <button
          type="button"
          onClick={start}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "#F59E0B",
          }}
        >
          Start Game
        </button>
      )}

      {gameOver && (
        <GameResultOverlay
          score={score}
          streaksEarned={score >= 15 ? 1 : 0}
          confidenceChange={score * 2}
          won={score >= 10}
          onPlayAgain={start}
          onClose={onClose}
          accentColor="#F59E0B"
        />
      )}

      {running && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          A / S / D or tap lanes — chain hits for combo multiplier!
        </p>
      )}
    </div>
  );
}

// ── D. Quick Quiz ─────────────────────────────────────────────────────────────────
const QUIZ_BANK = [
  {
    q: "What technique breaks work into 25-min intervals?",
    options: ["GTD", "Pomodoro", "Kanban", "Scrum"],
    answer: 1,
  },
  {
    q: "What does 'flow state' refer to?",
    options: [
      "Water meditation",
      "Deep focus",
      "Breathing exercise",
      "Sleep cycle",
    ],
    answer: 1,
  },
  {
    q: "Best time for creative work generally depends on:",
    options: ["Weather", "Mood only", "Chronotype", "Season"],
    answer: 2,
  },
  {
    q: "What is 'GTD' short for?",
    options: [
      "Get Things Done",
      "Goal Tracking Daily",
      "General Task Dashboard",
      "Group Think Design",
    ],
    answer: 0,
  },
  {
    q: "Which color is said to reduce mental fatigue?",
    options: ["Red", "Blue", "Orange", "Yellow"],
    answer: 1,
  },
  {
    q: "Research says a habit takes roughly how long to form?",
    options: ["7 days", "21 days", "~66 days", "100 days"],
    answer: 2,
  },
  {
    q: "The Zeigarnik effect describes:",
    options: [
      "Remembering completed tasks",
      "Forgetting priorities",
      "Remembering incomplete tasks",
      "Task paralysis",
    ],
    answer: 2,
  },
  {
    q: "Best break type for mental refresh?",
    options: ["Social media scroll", "Short walk", "More work", "Nap only"],
    answer: 1,
  },
  {
    q: "What does 'deep work' mean?",
    options: [
      "Working underwater",
      "Distraction-free focused work",
      "Team collaboration",
      "Night-shift work",
    ],
    answer: 1,
  },
  {
    q: "The 'two-minute rule' says to:",
    options: [
      "Take 2-min breaks",
      "Do tasks <2 mins immediately",
      "Plan 2 tasks daily",
      "Sleep 2 extra hours",
    ],
    answer: 1,
  },
  {
    q: "Ultradian rhythms cycle every:",
    options: ["30 min", "45 min", "~90-120 min", "4 hours"],
    answer: 2,
  },
  {
    q: "'Inbox zero' refers to:",
    options: [
      "Empty email inbox",
      "No tasks pending",
      "Zero notifications",
      "No social media",
    ],
    answer: 0,
  },
  {
    q: "Exercise before study primarily helps with:",
    options: [
      "Speed reading",
      "Memory & focus",
      "Typing speed",
      "Motivation only",
    ],
    answer: 1,
  },
  {
    q: "'Time blocking' means:",
    options: [
      "Blocking social media",
      "Scheduling tasks in calendar slots",
      "Limiting work hours",
      "Setting alarms",
    ],
    answer: 1,
  },
  {
    q: "'Eat the frog' productivity tip means:",
    options: [
      "Eat before working",
      "Do hardest task first",
      "Take 5-min breaks",
      "Skip breakfast",
    ],
    answer: 1,
  },
  {
    q: "What is the Pomodoro break duration?",
    options: ["2 min", "5 min", "10 min", "15 min"],
    answer: 1,
  },
  {
    q: "Which app type most hurts focus?",
    options: ["Note apps", "Social media", "Calendars", "Music apps"],
    answer: 1,
  },
  {
    q: "'Single-tasking' vs multitasking:",
    options: [
      "Multitasking is faster",
      "Single-tasking is more effective",
      "Both are equal",
      "Depends on the task",
    ],
    answer: 1,
  },
];

interface QuizResult {
  question: string;
  correct: boolean;
  yourAnswer: string;
  rightAnswer: string;
}

function QuizGame({ onClose }: { onClose: () => void }) {
  const { addStreak, updateConfidence } = useGameContext();
  const [started, setStarted] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [questions] = useState(() =>
    [...QUIZ_BANK].sort(() => Math.random() - 0.5).slice(0, 5),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [answerAnim, setAnswerAnim] = useState<"correct" | "wrong" | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const q = questions[questionIdx];

  const nextQuestion = useCallback(
    (wasCorrect: boolean, chosenIdx: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setAnswerAnim(wasCorrect ? "correct" : "wrong");
      const newResult: QuizResult = {
        question: q.q,
        correct: wasCorrect,
        yourAnswer: chosenIdx >= 0 ? q.options[chosenIdx] : "(timed out)",
        rightAnswer: q.options[q.answer],
      };
      if (wasCorrect) {
        updateConfidence(6);
        playToneOnce(880, 0.15, "sine", 0.15);
      } else {
        updateConfidence(-3);
        playToneOnce(150, 0.2, "sawtooth", 0.1);
      }
      const newCorrect = wasCorrect ? correctCount + 1 : correctCount;
      setTimeout(() => {
        setAnswerAnim(null);
        setResults((prev) => [...prev, newResult]);
        if (questionIdx >= 4) {
          if (newCorrect >= 3) addStreak();
          setDone(true);
          setCorrectCount(newCorrect);
        } else {
          setQuestionIdx((i) => i + 1);
          setSelected(null);
          setAnswered(false);
          setTimeLeft(10);
          setCorrectCount(newCorrect);
        }
      }, 750);
    },
    [questionIdx, correctCount, addStreak, updateConfidence, q],
  );

  const answer = useCallback(
    (idx: number) => {
      if (answered) return;
      setSelected(idx);
      setAnswered(true);
      nextQuestion(idx === q.answer, idx);
    },
    [answered, q, nextQuestion],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!started || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          answer(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, questionIdx, answered]);

  const restart = () => {
    setStarted(true);
    setQuestionIdx(0);
    setSelected(null);
    setAnswered(false);
    setTimeLeft(10);
    setCorrectCount(0);
    setDone(false);
    setResults([]);
    setAnswerAnim(null);
  };

  if (!started)
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <span style={{ fontSize: 72 }}>🧠</span>
        <p
          className="text-center text-sm"
          style={{ color: "var(--text-muted)", maxWidth: 280 }}
        >
          5 quick questions. 10 seconds each. Test your productivity knowledge!
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="px-8 py-3 rounded-2xl font-bold"
          style={{
            background: "rgba(167,139,250,0.15)",
            border: "1px solid rgba(167,139,250,0.4)",
            color: "#A78BFA",
          }}
        >
          Start Quiz
        </button>
      </div>
    );

  if (done)
    return (
      <div className="flex flex-col gap-4 w-full">
        <GameResultOverlay
          score={correctCount}
          streaksEarned={correctCount >= 3 ? 1 : 0}
          confidenceChange={correctCount * 6 - (5 - correctCount) * 3}
          won={correctCount >= 3}
          onPlayAgain={restart}
          onClose={onClose}
          accentColor="#A78BFA"
          scoreLabel={`${correctCount}/5 correct`}
        />
        {/* Breakdown */}
        <div className="flex flex-col gap-2 mt-2">
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            ANSWER BREAKDOWN
          </p>
          {results.map((r, i) => (
            <div
              key={r.question}
              className="px-3 py-2 rounded-xl text-xs"
              style={{
                background: r.correct
                  ? "rgba(52,211,153,0.1)"
                  : "rgba(239,68,68,0.08)",
                border: `1px solid ${r.correct ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.25)"}`,
              }}
            >
              <div className="flex items-start gap-2">
                <span>{r.correct ? "✅" : "❌"}</span>
                <div className="flex-1">
                  <p style={{ color: "var(--text-primary)" }}>
                    Q{i + 1}: {r.question}
                  </p>
                  {!r.correct && (
                    <p style={{ color: "rgba(239,68,68,0.8)" }}>
                      Your answer: {r.yourAnswer}
                    </p>
                  )}
                  <p style={{ color: "rgba(52,211,153,0.8)" }}>
                    ✓ {r.rightAnswer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  // Question screen
  const getButtonStyle = (i: number) => {
    if (!answered) {
      return {
        background:
          selected === i ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.09)",
        border: `1px solid ${selected === i ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.18)"}`,
        color: "var(--text-primary)" as const,
      };
    }
    if (i === q.answer) {
      return {
        background: "rgba(52,211,153,0.18)",
        border: "1px solid rgba(52,211,153,0.6)",
        color: "#34D399" as const,
      };
    }
    if (i === selected) {
      return {
        background: "rgba(239,68,68,0.18)",
        border: "1px solid rgba(239,68,68,0.6)",
        color: "#EF4444" as const,
      };
    }
    return {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "var(--text-muted)" as const,
    };
  };

  return (
    <motion.div
      key={questionIdx}
      initial={{ opacity: 0, x: 20 }}
      animate={{
        opacity: 1,
        x: answerAnim === "wrong" ? [0, -8, 8, -5, 5, 0] : 0,
        backgroundColor:
          answerAnim === "correct"
            ? ["rgba(0,0,0,0)", "rgba(52,211,153,0.08)", "rgba(0,0,0,0)"]
            : answerAnim === "wrong"
              ? ["rgba(0,0,0,0)", "rgba(239,68,68,0.08)", "rgba(0,0,0,0)"]
              : "rgba(0,0,0,0)",
      }}
      transition={{ duration: answerAnim === "wrong" ? 0.45 : 0.3 }}
      className="flex flex-col gap-4 w-full rounded-xl p-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold"
            style={{ color: "var(--text-muted)" }}
          >
            Q {questionIdx + 1}/5
          </span>
          {/* Progress dots */}
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((dotIdx) => (
              <div
                key={`q-dot-${dotIdx}`}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    dotIdx < questionIdx
                      ? "#34D399"
                      : dotIdx === questionIdx
                        ? "#A78BFA"
                        : "rgba(255,255,255,0.15)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{
            background:
              timeLeft < 4 ? "rgba(239,68,68,0.2)" : "rgba(167,139,250,0.14)",
            color: timeLeft < 4 ? "#EF4444" : "#A78BFA",
          }}
        >
          {timeLeft}s
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(167,139,250,0.14)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${(timeLeft / 10) * 100}%`,
            background: timeLeft < 4 ? "#EF4444" : "#A78BFA",
            boxShadow: "0 0 8px rgba(167,139,250,0.6)",
          }}
        />
      </div>
      <p
        className="text-base font-semibold leading-snug"
        style={{ color: "var(--text-primary)" }}
      >
        {q.q}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((opt, i) => (
          <button
            type="button"
            key={opt}
            onClick={() => answer(i)}
            disabled={answered}
            className="text-left px-4 py-3 rounded-xl text-sm transition-all"
            style={{
              ...getButtonStyle(i),
              cursor: answered ? "default" : "pointer",
            }}
          >
            <span style={{ opacity: 0.5, marginRight: 8 }}>
              {String.fromCharCode(65 + i)}.
            </span>
            {opt}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Game Result Overlay ───────────────────────────────────────────────────────────
interface GameResultProps {
  score: number;
  streaksEarned: number;
  confidenceChange: number;
  won: boolean;
  onPlayAgain: () => void;
  onClose: () => void;
  accentColor: string;
  scoreLabel?: string;
}

function GameResultOverlay({
  score,
  streaksEarned,
  confidenceChange,
  won,
  onPlayAgain,
  onClose,
  accentColor,
  scoreLabel,
}: GameResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full flex flex-col items-center gap-4 py-2 relative"
    >
      {won && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {["✨-0", "⭐-1", "✨-2", "☆-3", "✨-4"].map((sp, i) => (
            <motion.span
              key={sp}
              style={{
                position: "absolute",
                fontSize: 20,
                left: `${15 + i * 18}%`,
                top: "10%",
              }}
              animate={{
                y: [-10, -60, -100],
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{ duration: 1.4, delay: i * 0.12, ease: "easeOut" }}
            >
              {sp}
            </motion.span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 56 }}>{won ? "🎉" : "📝"}</div>

      <div className="text-center">
        <p className="text-xl font-bold mb-1" style={{ color: accentColor }}>
          {scoreLabel ?? `Score: ${score}`}
        </p>
        <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
          {streaksEarned > 0 && (
            <span
              className="flex items-center gap-1 px-3 py-1 rounded-full"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "#F59E0B",
              }}
            >
              🔥 +{streaksEarned} Streak
            </span>
          )}
          {confidenceChange !== 0 && (
            <span
              className="flex items-center gap-1 px-3 py-1 rounded-full"
              style={{
                background:
                  confidenceChange > 0
                    ? "rgba(52,211,153,0.12)"
                    : "rgba(239,68,68,0.12)",
                border: `1px solid ${
                  confidenceChange > 0
                    ? "rgba(52,211,153,0.3)"
                    : "rgba(239,68,68,0.3)"
                }`,
                color: confidenceChange > 0 ? "#34D399" : "#EF4444",
              }}
            >
              💪 {confidenceChange > 0 ? "+" : ""}
              {confidenceChange} Confidence
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{
            background: `${accentColor}22`,
            border: `1px solid ${accentColor}55`,
            color: accentColor,
          }}
          data-ocid="games.play_again.button"
        >
          Play Again
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.28)",
            color: "var(--text-secondary)",
          }}
          data-ocid="games.back.button"
        >
          Back to Games
        </button>
      </div>
    </motion.div>
  );
}

// ── Game Definitions ──────────────────────────────────────────────────────────────
const GAME_DEFS = [
  {
    id: "coffee",
    emoji: "☕",
    title: "Coffee Catch",
    desc: "Move your cup to catch falling coffee beans. 3 misses and it's over — beans get faster as you score!",
    reward: "+1 Streak per round",
    color: "#F59E0B",
    component: CoffeeBeanGame,
  },
  {
    id: "books",
    emoji: "📚",
    title: "Book Stack",
    desc: "Drop books precisely to build the tallest stack. Perfect alignment earns a bonus — one misstep and it all falls!",
    reward: "+Streak if 3+ stacked",
    color: "#A78BFA",
    component: BookStackGame,
  },
  {
    id: "beat",
    emoji: "🎵",
    title: "Beat Tap",
    desc: "Tap neon notes in 3 lanes to the drum rhythm. Chain hits for a combo multiplier — 10 misses ends the session.",
    reward: "+2 Confidence per hit",
    color: "#F59E0B",
    component: MusicBeatGame,
  },
  {
    id: "quiz",
    emoji: "⚡",
    title: "Quick Quiz",
    desc: "5 rapid-fire productivity questions under a 10-second timer. Score 3/5 to earn a streak and see the breakdown!",
    reward: "+1 Streak if 3/5+",
    color: "#A78BFA",
    component: QuizGame,
  },
];

// ── GamesPage ─────────────────────────────────────────────────────────────────────
export function GamesPage() {
  const { streaks, confidence, gamesPlayed, recordGamePlayed } =
    useGameContext();
  const { playButtonTap } = useSFXContext();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [ripple, setRipple] = useState<string | null>(null);

  const openGame = (id: string) => {
    playButtonTap();
    setRipple(id);
    setTimeout(() => {
      setRipple(null);
      setActiveGame(id);
      recordGamePlayed();
    }, 180);
  };

  const closeGame = () => {
    playButtonTap();
    setActiveGame(null);
  };

  const ActiveGameDef = GAME_DEFS.find((g) => g.id === activeGame);
  const ActiveGameComponent = ActiveGameDef?.component ?? null;

  return (
    <div
      className="p-6 md:p-8 max-w-4xl pb-24"
      style={{ color: "var(--text-primary)" }}
    >
      <style>{`
        @keyframes rippleOut {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          100% { transform: scale(1.03); box-shadow: 0 0 0 20px rgba(245,158,11,0); }
        }
        .game-card-ripple { animation: rippleOut 0.18s ease forwards; }
      `}</style>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Games
          </h1>
          <div className="flex gap-1.5 text-2xl ml-2">
            {["☕", "📚", "🎵", "✨"].map((e) => (
              <motion.span
                key={e}
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 2.4,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: Math.random() * 1.5,
                }}
              >
                {e}
              </motion.span>
            ))}
          </div>
        </div>
        <div
          className="px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.18)",
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "#F59E0B" }}>
            Take a short whimsical break! Play a mini-game to refresh your mind,
            earn streak points, and enjoy soft glows and playful SFX before
            returning to study or focus sessions.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {[
          {
            emoji: "🔥",
            label: "Streaks",
            value: String(streaks),
            color: "#F59E0B",
          },
          {
            emoji: "💪",
            label: "Confidence",
            value: `${confidence}%`,
            color: "#34D399",
          },
          {
            emoji: "🎮",
            label: "Games Played",
            value: String(gamesPlayed),
            color: "#A78BFA",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <span style={{ fontSize: 18 }}>{s.emoji}</span>
            <div>
              <p
                className="text-[10px] uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {s.label}
              </p>
              <p className="text-sm font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 2×2 Game Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {GAME_DEFS.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.08,
              duration: 0.35,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className={`flex flex-col gap-4 p-6 rounded-2xl cursor-pointer ${
              ripple === game.id ? "game-card-ripple" : ""
            }`}
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
            onClick={() => openGame(game.id)}
            data-ocid={`games.item.${i + 1}`}
          >
            {/* Icon */}
            <div className="flex items-start justify-between">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: `${game.color}18`,
                  border: `1px solid ${game.color}33`,
                  fontSize: 32,
                }}
              >
                {game.emoji}
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{
                  background: `${game.color}18`,
                  border: `1px solid ${game.color}33`,
                  color: game.color,
                }}
              >
                {game.reward}
              </span>
            </div>

            {/* Title & desc */}
            <div>
              <h3
                className="text-base font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {game.title}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {game.desc}
              </p>
            </div>

            {/* Play button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openGame(game.id);
              }}
              className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: `${game.color}20`,
                border: `1px solid ${game.color}44`,
                color: game.color,
              }}
              data-ocid="games.play.button"
            >
              Play ▶
            </button>
          </motion.div>
        ))}
      </div>

      {/* Game Modal */}
      <AnimatePresence>
        {activeGame && ActiveGameComponent && ActiveGameDef && (
          <motion.div
            key={activeGame}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.88)",
              backdropFilter: "blur(12px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeGame();
            }}
            data-ocid="games.modal"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 flex flex-col gap-4"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${ActiveGameDef.color}33`,
                boxShadow: `0 0 60px ${ActiveGameDef.color}22, 0 24px 64px rgba(0,0,0,0.6)`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 26 }}>{ActiveGameDef.emoji}</span>
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {ActiveGameDef.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeGame}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                  data-ocid="games.close.button"
                >
                  ✕
                </button>
              </div>
              <ActiveGameComponent onClose={closeGame} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
