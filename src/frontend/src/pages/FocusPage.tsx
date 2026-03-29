import {
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  RefreshCw,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WaveformVisualizer } from "../components/focus/WaveformVisualizer";
import { YouTubeInput } from "../components/youtube/YouTubeInput";
import { YouTubePlayer } from "../components/youtube/YouTubePlayer";
import { useSFXContext } from "../context/SFXContext";
import { useTaskContext } from "../context/TaskContext";
import { useSession } from "../hooks/useSession";
import { useYouTube } from "../hooks/useYouTube";

type TimerState = "idle" | "running" | "paused" | "finished";

const PRESETS = [
  { label: "25 min", value: 25 },
  { label: "50 min", value: 50 },
];

const AMBIENT_MODES = [
  { id: "rain" as const, label: "🌧 Rain" },
  { id: "cafe" as const, label: "☕ Café" },
  { id: "whitenoise" as const, label: "〰 White" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusPage() {
  const yt = useYouTube();
  const { tasks, completeTask } = useTaskContext();
  const { activeSession, startSession, endSession } = useSession();
  const {
    playSessionStart,
    playSessionEnd,
    playTaskComplete,
    playButtonTap,
    playAmbientToggle,
    ambientMode,
    startAmbient,
    stopAmbient,
    ambientVolume,
    setAmbientVolume,
  } = useSFXContext();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [videoCount, setVideoCount] = useState(5);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timerRemaining, setTimerRemaining] = useState(25 * 60);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [customMinutes, setCustomMinutes] = useState("25");
  const [showCustom, setShowCustom] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Drop zone state
  const [dropHighlight, setDropHighlight] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTasks = tasks.filter((t) => t.status !== "completed");

  const handleTimerFinished = useCallback(() => {
    playTaskComplete();
    playSessionEnd();
    setSessionComplete(true);
    setSelectedTaskId((prevId) => {
      if (prevId !== null) {
        completeTask(prevId);
      }
      return prevId;
    });
    yt.setIsPlaying(false);
  }, [playTaskComplete, playSessionEnd, completeTask, yt]);

  // On mount: read taskId from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("focusTaskId");
    if (stored) {
      setSelectedTaskId(stored);
      sessionStorage.removeItem("focusTaskId");
    }
  }, []);

  // Auto-load YouTube when task is selected
  useEffect(() => {
    if (selectedTaskId === null) return;
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (task?.youtubeLink && !yt.videoId && !yt.playlistId) {
      yt.loadInput(task.youtubeLink);
    }
  }, [selectedTaskId, tasks, yt]);

  const handleSelectTask = (id: string | null) => {
    setSelectedTaskId(id);
    if (id !== null) {
      const task = tasks.find((t) => t.id === id);
      if (task?.youtubeLink) yt.loadInput(task.youtubeLink);
    }
  };

  // Timer interval
  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setTimerState("finished");
            handleTimerFinished();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, handleTimerFinished]);

  const handleLoad = (
    videoId?: string,
    playlistId?: string,
    label?: string,
  ) => {
    if (videoId) yt.loadInput(`https://youtube.com/watch?v=${videoId}`);
    if (playlistId)
      yt.loadInput(`https://youtube.com/playlist?list=${playlistId}`);
    if (label) localStorage.setItem("yt_current_label", label);
  };

  const handleStartSession = async () => {
    if (!selectedTaskId) return;
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;
    playButtonTap();
    await startSession(
      Number(selectedTaskId),
      task.name,
      yt.playlistId ?? yt.videoId ?? "",
      yt.label,
      videoCount,
    );
    yt.setIsPlaying(true);
    playSessionStart();
    setTimerState("running");
    setSessionComplete(false);
  };

  const handleEndSession = async (completed: boolean) => {
    playButtonTap();
    if (completed) {
      playTaskComplete();
      if (activeSession) {
        completeTask(String(activeSession.taskId));
      }
    }
    await endSession(completed);
    yt.setIsPlaying(false);
    playSessionEnd();
    setTimerState("idle");
    setTimerRemaining(timerDuration);
  };

  const applyPreset = (minutes: number) => {
    const secs = minutes * 60;
    setTimerDuration(secs);
    setTimerRemaining(secs);
    setTimerState("idle");
    setShowCustom(false);
  };

  const applyCustom = () => {
    const mins = Math.max(1, Number.parseInt(customMinutes) || 25);
    applyPreset(mins);
  };

  const handleTimerToggle = () => {
    playButtonTap();
    if (timerState === "idle" || timerState === "paused") {
      setTimerState("running");
    } else if (timerState === "running") {
      setTimerState("paused");
    }
  };

  const handleTimerReset = () => {
    playButtonTap();
    setTimerState("idle");
    setTimerRemaining(timerDuration);
    setSessionComplete(false);
  };

  const handleAmbientToggle = (mode: "rain" | "cafe" | "whitenoise") => {
    playAmbientToggle();
    if (ambientMode === mode) {
      stopAmbient();
    } else {
      startAmbient(mode);
    }
  };

  // Drop zone handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDropHighlight(true);
  };
  const handleDragLeave = () => setDropHighlight(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropHighlight(false);
    const text = e.dataTransfer.getData("text");
    if (text && /youtube\.com|youtu\.be/.test(text)) {
      yt.loadInput(text);
    }
  };

  const progress =
    timerDuration > 0 ? (timerDuration - timerRemaining) / timerDuration : 0;
  const circumference = 2 * Math.PI * 52;

  const selectedTask =
    selectedTaskId !== null ? tasks.find((t) => t.id === selectedTaskId) : null;

  const showWaveform = activeSession && (yt.isPlaying || ambientMode !== "off");

  return (
    <div
      className="p-4 md:p-6 min-h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Focus Session
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Music-driven deep work
          </p>
        </div>
        {activeSession && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--accent-cyan)",
                boxShadow: "0 0 6px var(--accent-cyan)",
              }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--accent-cyan)" }}
            >
              Session Active
            </span>
          </div>
        )}
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── LEFT PANEL ── */}
        <div className="flex flex-col gap-4">
          {/* Cute note card */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.07))",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 0 20px rgba(255,255,255,0.09)",
            }}
          >
            <p
              className="text-sm italic leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              💙 Focus on this task, let the music guide you.
              <br />
              <span style={{ color: "var(--text-muted)" }}>
                When the timer ends, take a short break and give yourself a pat
                on the back!
              </span>
            </p>
          </div>

          {/* Ambient Sound Panel */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${
                ambientMode !== "off"
                  ? "rgba(255,255,255,0.35)"
                  : "var(--border-color)"
              }`,
              boxShadow:
                ambientMode !== "off"
                  ? "0 0 16px rgba(255,255,255,0.10)"
                  : "none",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Volume2
                className="w-3.5 h-3.5"
                style={{ color: "var(--accent-cyan)" }}
              />
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                AMBIENT SOUND
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {AMBIENT_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleAmbientToggle(m.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-90"
                  style={
                    ambientMode === m.id
                      ? {
                          background: "rgba(255,255,255,0.18)",
                          color: "var(--accent-cyan)",
                          border: "1px solid rgba(255,255,255,0.60)",
                          boxShadow: "0 0 8px rgba(255,255,255,0.18)",
                        }
                      : {
                          color: "var(--text-muted)",
                          border: "1px solid var(--border-color)",
                        }
                  }
                  data-ocid="focus.toggle"
                >
                  {m.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  playAmbientToggle();
                  stopAmbient();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-90"
                style={
                  ambientMode === "off"
                    ? {
                        background: "rgba(255,255,255,0.14)",
                        color: "var(--accent-cyan)",
                        border: "1px solid rgba(255,255,255,0.50)",
                      }
                    : {
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-color)",
                      }
                }
                data-ocid="focus.toggle"
              >
                Off
              </button>
            </div>
            {ambientMode !== "off" && (
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Vol
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(Number(e.target.value))}
                  className="flex-1 accent-cyan-400"
                  style={{ accentColor: "var(--accent-cyan)" }}
                  data-ocid="focus.input"
                />
                <span
                  className="text-xs w-8 text-right"
                  style={{ color: "var(--text-muted)" }}
                >
                  {Math.round(ambientVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Active task display */}
          {selectedTask ? (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "var(--bg-card)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
              data-ocid="focus.card"
            >
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                CURRENT TASK
              </p>
              <p
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {selectedTask.name}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    color: "var(--accent-cyan)",
                  }}
                >
                  {selectedTask.duration}m
                </span>
                {selectedTask.youtubeLink && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,71,87,0.1)",
                      color: "#ff6b7a",
                    }}
                  >
                    YouTube ready
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No task selected — go pick one from your task list below.
              </p>
            </div>
          )}

          {/* Timer Panel */}
          <div
            className="p-5 rounded-2xl flex flex-col items-center gap-4"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${
                timerState === "running"
                  ? "rgba(255,255,255,0.35)"
                  : timerState === "finished"
                    ? "rgba(43,214,123,0.3)"
                    : "var(--border-color)"
              }`,
              boxShadow:
                timerState === "running"
                  ? "0 0 20px rgba(255,255,255,0.14)"
                  : "none",
            }}
            data-ocid="focus.panel"
          >
            <p
              className="text-xs font-semibold self-start"
              style={{ color: "var(--text-muted)" }}
            >
              COUNTDOWN TIMER
            </p>

            {/* Presets */}
            <div className="flex items-center gap-2 self-stretch">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => applyPreset(preset.value)}
                  disabled={timerState === "running"}
                  className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                  style={
                    timerDuration === preset.value * 60
                      ? {
                          background: "rgba(255,255,255,0.18)",
                          color: "var(--accent-cyan)",
                          border: "1px solid rgba(255,255,255,0.35)",
                        }
                      : {
                          color: "var(--text-muted)",
                          border: "1px solid var(--border-color)",
                        }
                  }
                  data-ocid="focus.toggle"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustom(!showCustom)}
                disabled={timerState === "running"}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                style={
                  showCustom
                    ? {
                        background: "rgba(255,255,255,0.18)",
                        color: "var(--accent-cyan)",
                        border: "1px solid rgba(255,255,255,0.35)",
                      }
                    : {
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-color)",
                      }
                }
              >
                Custom
              </button>
            </div>

            {showCustom && (
              <div className="flex gap-2 self-stretch">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Minutes"
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                  data-ocid="focus.input"
                />
                <button
                  type="button"
                  onClick={applyCustom}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
                    color: "#05080D",
                  }}
                  data-ocid="focus.secondary_button"
                >
                  Set
                </button>
              </div>
            )}

            {/* Timer ring */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: 140, height: 140 }}
            >
              <svg
                width="140"
                height="140"
                style={{ transform: "rotate(-90deg)" }}
                aria-label="Timer progress"
                role="img"
              >
                <title>Timer progress ring</title>
                <circle
                  cx="70"
                  cy="70"
                  r="52"
                  fill="none"
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="6"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="52"
                  fill="none"
                  stroke={
                    timerState === "finished"
                      ? "#2BD67B"
                      : timerState === "running"
                        ? "#f2f6ff"
                        : "rgba(255,255,255,0.50)"
                  }
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  style={{
                    transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
                  }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span
                  className="font-bold tabular-nums"
                  style={{
                    fontSize: 28,
                    letterSpacing: "-0.02em",
                    color:
                      timerState === "finished"
                        ? "#2BD67B"
                        : "var(--text-primary)",
                  }}
                >
                  {formatTime(timerRemaining)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {timerState === "idle" && "ready"}
                  {timerState === "running" && "focusing"}
                  {timerState === "paused" && "paused"}
                  {timerState === "finished" && "done!"}
                </span>
              </div>
            </div>

            {/* Timer controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTimerToggle}
                disabled={timerState === "finished"}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{
                  background:
                    timerState === "running"
                      ? "rgba(255,255,255,0.18)"
                      : "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
                  color:
                    timerState === "running" ? "var(--accent-cyan)" : "#05080D",
                  border:
                    timerState === "running"
                      ? "1px solid rgba(255,255,255,0.50)"
                      : "none",
                }}
                data-ocid="focus.primary_button"
              >
                {timerState === "running" ? (
                  <>
                    <Pause className="w-4 h-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />{" "}
                    {timerState === "paused" ? "Resume" : "Start"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleTimerReset}
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-sm transition-all hover:opacity-70"
                style={{
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-color)",
                }}
                data-ocid="focus.secondary_button"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            {/* Session complete banner */}
            {sessionComplete && (
              <div
                className="w-full px-4 py-3 rounded-xl flex items-center gap-2 animate-float-in"
                style={{
                  background: "rgba(43,214,123,0.12)",
                  border: "1px solid rgba(43,214,123,0.3)",
                }}
                data-ocid="focus.success_state"
              >
                <CheckCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#2BD67B" }}
                />
                <p className="text-sm font-medium" style={{ color: "#2BD67B" }}>
                  Session complete! 🎉 Great work!
                </p>
              </div>
            )}
          </div>

          {/* Session controls */}
          <div
            className="p-4 rounded-2xl flex flex-col gap-3"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              SESSION CONTROLS
            </p>

            {!activeSession ? (
              <>
                <div>
                  <p
                    className="text-xs block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Number of videos
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={videoCount}
                    onChange={(e) =>
                      setVideoCount(
                        Math.max(1, Number.parseInt(e.target.value) || 1),
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={!selectedTaskId}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40"
                  style={{
                    background: selectedTaskId
                      ? "linear-gradient(135deg, #e8e8e8, #f2f6ff)"
                      : "rgba(255,255,255,0.09)",
                    color: selectedTaskId ? "#05080D" : "var(--text-muted)",
                    cursor: selectedTaskId ? "pointer" : "not-allowed",
                  }}
                  data-ocid="focus.submit_button"
                >
                  <Play className="w-4 h-4 inline mr-2" />
                  Start Session
                </button>
              </>
            ) : (
              <>
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Current task
                  </p>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "var(--accent-cyan)" }}
                  >
                    {activeSession.taskName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEndSession(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
                    style={{
                      background: "rgba(43,214,123,0.15)",
                      border: "1px solid rgba(43,214,123,0.4)",
                      color: "var(--accent-green)",
                    }}
                    data-ocid="focus.confirm_button"
                  >
                    <CheckCircle className="w-4 h-4" /> Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndSession(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
                    style={{
                      background: "rgba(255,71,87,0.1)",
                      border: "1px solid rgba(255,71,87,0.3)",
                      color: "var(--accent-red)",
                    }}
                    data-ocid="focus.cancel_button"
                  >
                    <AlertTriangle className="w-4 h-4" /> End
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex flex-col gap-4">
          {/* YouTube player / Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="rounded-2xl transition-all"
            style={{
              border: dropHighlight
                ? "2px dashed rgba(255,255,255,0.60)"
                : "2px solid transparent",
              background: dropHighlight
                ? "rgba(255,255,255,0.05)"
                : "transparent",
            }}
            data-ocid="focus.dropzone"
          >
            {!yt.videoId && !yt.playlistId ? (
              <div className="flex flex-col gap-2">
                <YouTubeInput onLoad={handleLoad} />
                <div
                  className="flex items-center justify-center py-3 rounded-xl text-xs"
                  style={{
                    border: "1.5px dashed rgba(255,255,255,0.18)",
                    color: "var(--text-muted)",
                  }}
                >
                  or drag a YouTube link here
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <YouTubePlayer
                  videoId={yt.videoId ?? undefined}
                  playlistId={yt.playlistId ?? undefined}
                />

                {activeSession && (
                  <div
                    className="flex items-center justify-between px-4 py-2 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.28)",
                    }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--accent-cyan)" }}
                    >
                      Video {yt.currentVideoIndex} / {yt.totalVideos}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {yt.label}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    yt.clear();
                    playButtonTap();
                  }}
                  className="text-xs self-start flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:opacity-70"
                  style={{
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-color)",
                  }}
                  data-ocid="focus.secondary_button"
                >
                  <X className="w-3 h-3" /> Change video
                </button>
              </div>
            )}
          </div>

          {/* Waveform */}
          {showWaveform && (
            <WaveformVisualizer
              isPlaying={yt.isPlaying}
              ambientActive={ambientMode !== "off"}
            />
          )}

          {/* Active tasks list */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <p
              className="text-xs font-semibold mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              ACTIVE TASKS
            </p>
            {activeTasks.length === 0 ? (
              <p
                className="text-xs text-center py-4"
                style={{ color: "var(--text-muted)" }}
                data-ocid="focus.empty_state"
              >
                All tasks completed! 🎉
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {activeTasks.map((task, i) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleSelectTask(task.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl w-full transition-all hover:opacity-80 text-left"
                    style={{
                      background:
                        selectedTaskId === task.id
                          ? "rgba(255,255,255,0.14)"
                          : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        selectedTaskId === task.id
                          ? "rgba(255,255,255,0.35)"
                          : "transparent"
                      }`,
                    }}
                    data-ocid={`focus.item.${i + 1}`}
                  >
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {task.name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.09)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {task.duration}m
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
