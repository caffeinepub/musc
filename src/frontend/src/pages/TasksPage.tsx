import {
  Check,
  GripVertical,
  Layers,
  List,
  Play,
  Plus,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Page } from "../App";
import { useGameContext } from "../context/GameContext";
import { useSFXContext } from "../context/SFXContext";
import type { LocalTask } from "../context/TaskContext";
import { useTaskContext } from "../context/TaskContext";

interface TasksPageProps {
  onNavigate?: (page: Page) => void;
}

const CONFETTI_COLORS = [
  "#ffffff",
  "rgba(255,255,255,0.7)",
  "#2BDE7B",
  "#FFD166",
  "#FF6B9D",
  "#A78BFA",
  "#0C7075",
  "rgba(255,255,255,0.08)",
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function getPriorityGlow(priority?: string) {
  if (priority === "high")
    return {
      borderLeft: "3px solid #ff4444",
      boxShadow: "-4px 0 12px rgba(255,68,68,0.25), 0 1px 4px rgba(0,0,0,0.25)",
    };
  if (priority === "low")
    return {
      borderLeft: "3px solid #4466aa",
      boxShadow:
        "-4px 0 12px rgba(68,102,170,0.15), 0 1px 4px rgba(0,0,0,0.25)",
    };
  // medium default
  return {
    borderLeft: "3px solid #ffffff",
    boxShadow: "-4px 0 12px rgba(255,255,255,0.18), 0 1px 4px rgba(0,0,0,0.25)",
  };
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (priority === "high")
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-bold tracking-wide"
        style={{ background: "rgba(255,68,68,0.18)", color: "#ff6b6b" }}
      >
        HIGH
      </span>
    );
  if (priority === "low")
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-bold tracking-wide"
        style={{ background: "rgba(68,102,170,0.2)", color: "#7899cc" }}
      >
        LOW
      </span>
    );
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded-full font-bold tracking-wide"
      style={{
        background: "rgba(255,255,255,0.18)",
        color: "var(--accent-cyan)",
      }}
    >
      MED
    </span>
  );
}

function playSfxPing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => ctx.close();
  } catch {}
}

function playSfxHighComplete() {
  try {
    const ctx = new AudioContext();
    const freqs = [440, 554, 659];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(
        0.12,
        ctx.currentTime + i * 0.15 + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.15 + 0.15,
      );
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.15);
      if (i === freqs.length - 1) osc.onended = () => ctx.close();
    });
  } catch {}
}

function ConfettiOverlay({ onDismiss }: { onDismiss: () => void }) {
  const dots = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    size: 8 + Math.random() * 10,
    dur: 1.5 + Math.random() * 1.5,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: "rgba(3,6,18,0.92)", backdropFilter: "blur(8px)" }}
      onClick={onDismiss}
    >
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full"
          style={{
            width: d.size,
            height: d.size,
            left: `${d.left}%`,
            top: "-5%",
            background: d.color,
            opacity: 0.85,
            animation: `confetti-fall ${d.dur}s ease-in ${d.delay}s infinite`,
          }}
        />
      ))}
      <motion.div
        initial={{ scale: 0.7, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-center px-8"
      >
        <p className="text-5xl mb-4">🎉</p>
        <h2
          className="text-3xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          All done!
        </h2>
        <p className="text-lg" style={{ color: "var(--accent-cyan)" }}>
          You're amazing! 🌟
        </p>
        <p
          className="text-xs mt-6"
          style={{ color: "var(--text-muted)", opacity: 0.6 }}
        >
          click anywhere to dismiss
        </p>
      </motion.div>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}

interface TaskCardProps {
  task: LocalTask;
  index: number;
  isSuggested: boolean;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (
    id: string,
    name: string,
    link: string,
    priority: "high" | "medium" | "low",
  ) => void;
  dragHandlers: {
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
  };
  isDragOver: boolean;
}

function TaskCard({
  task,
  index,
  isSuggested,
  onStart,
  onComplete,
  onDelete,
  onSaveEdit,
  dragHandlers,
  isDragOver,
}: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editLink, setEditLink] = useState(task.youtubeLink);
  const [editPriority, setEditPriority] = useState<"high" | "medium" | "low">(
    task.priority ?? "medium",
  );
  const editNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && editNameRef.current) editNameRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setEditName(task.name);
    setEditLink(task.youtubeLink);
    setEditPriority(task.priority ?? "medium");
    setEditing(true);
  };

  const saveEdit = () => {
    if (editName.trim()) {
      onSaveEdit(task.id, editName.trim(), editLink.trim(), editPriority);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(task.name);
    setEditLink(task.youtubeLink);
    setEditPriority(task.priority ?? "medium");
  };

  const isCompleted = task.status === "completed";
  const priorityGlow = isCompleted ? {} : getPriorityGlow(task.priority);

  return (
    <motion.div
      layout
      key={task.id}
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -20 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      draggable={!editing && !isCompleted}
      onDragStart={(e) =>
        dragHandlers.onDragStart(e as unknown as React.DragEvent, task.id)
      }
      onDragOver={(e) =>
        dragHandlers.onDragOver(e as unknown as React.DragEvent, task.id)
      }
      onDragEnd={dragHandlers.onDragEnd}
      className="group rounded-xl transition-all cursor-default"
      style={{
        background: isCompleted ? "rgba(43,214,123,0.04)" : "var(--bg-card)",
        border: `1px solid ${
          isDragOver
            ? "rgba(255,255,255,0.70)"
            : isSuggested && !isCompleted
              ? "rgba(255,255,255,0.60)"
              : isCompleted
                ? "rgba(43,214,123,0.15)"
                : "var(--border-color)"
        }`,
        ...priorityGlow,
        transform: isDragOver ? "scale(1.01)" : "scale(1)",
      }}
      whileHover={{
        boxShadow:
          "0 0 18px rgba(255,255,255,0.18), 0 4px 12px rgba(0,0,0,0.3)",
      }}
      data-ocid={`tasks.item.${index + 1}`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {!isCompleted && (
            <div
              className="cursor-grab active:cursor-grabbing flex-shrink-0 opacity-30 group-hover:opacity-60 transition-opacity"
              style={{ touchAction: "none" }}
            >
              <GripVertical
                className="w-4 h-4"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          )}

          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: isCompleted
                ? "var(--accent-green)"
                : "rgba(255,255,255,0.70)",
              boxShadow: isCompleted
                ? "0 0 6px rgba(43,214,123,0.6)"
                : "0 0 6px rgba(255,255,255,0.50)",
            }}
          />

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  placeholder="Task name..."
                  className="w-full px-2 py-1 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid rgba(255,255,255,0.50)",
                    color: "var(--text-primary)",
                  }}
                  ref={editNameRef}
                  data-ocid="tasks.input"
                />
                <input
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  placeholder="YouTube link (optional)..."
                  className="w-full px-2 py-1 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    color: "var(--text-muted)",
                  }}
                  data-ocid="tasks.textarea"
                />
                <select
                  value={editPriority}
                  onChange={(e) =>
                    setEditPriority(e.target.value as "high" | "medium" | "low")
                  }
                  className="w-full px-2 py-1 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    color: "var(--text-primary)",
                  }}
                  data-ocid="tasks.select"
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🔵 Low</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="px-3 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
                      color: "#05080D",
                    }}
                    data-ocid="tasks.save_button"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-1 rounded-lg text-xs"
                    style={{
                      background: "rgba(255,255,255,0.10)",
                      color: "var(--text-muted)",
                    }}
                    data-ocid="tasks.cancel_button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  className="text-sm text-left w-full truncate cursor-text"
                  style={{
                    color: "var(--text-primary)",
                    textDecoration: isCompleted ? "line-through" : "none",
                    opacity: isCompleted ? 0.6 : 1,
                  }}
                  onClick={startEdit}
                >
                  {task.name}
                </button>
                {task.youtubeLink && (
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: "var(--text-muted)", opacity: 0.7 }}
                  >
                    🎵 {task.youtubeLink}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isCompleted && <PriorityBadge priority={task.priority} />}
            {isSuggested && !isCompleted && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "var(--accent-cyan)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                ✨
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: isCompleted
                  ? "rgba(43,214,123,0.12)"
                  : "rgba(255,255,255,0.14)",
                color: isCompleted
                  ? "var(--accent-green)"
                  : "var(--accent-cyan)",
              }}
            >
              {isCompleted ? "Done" : "Pending"}
            </span>
            {task.duration > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full hidden sm:inline"
                style={{
                  background: "rgba(255,255,255,0.09)",
                  color: "var(--text-muted)",
                }}
              >
                {task.duration}m
              </span>
            )}
            {task.youtubeLink && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  background: "rgba(255,71,87,0.1)",
                  color: "#ff6b7a",
                }}
              >
                <Youtube className="w-2.5 h-2.5" />
                YT
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
            {!isCompleted && (
              <>
                <button
                  type="button"
                  title="Start focus"
                  onClick={() => onStart(task.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
                    color: "#05080D",
                  }}
                  data-ocid="tasks.primary_button"
                >
                  <Play className="w-3 h-3" /> Start
                </button>
                <button
                  type="button"
                  title="Mark complete"
                  onClick={() => onComplete(task.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
                  style={{
                    background: "rgba(43,214,123,0.12)",
                    border: "1px solid rgba(43,214,123,0.3)",
                  }}
                  data-ocid="tasks.toggle"
                >
                  <Check
                    className="w-3.5 h-3.5"
                    style={{ color: "var(--accent-green)" }}
                  />
                </button>
              </>
            )}
            <button
              type="button"
              title="Delete task"
              onClick={() => onDelete(task.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
              style={{
                background: "rgba(255,71,87,0.1)",
                border: "1px solid rgba(255,71,87,0.2)",
              }}
              data-ocid="tasks.delete_button"
            >
              <Trash2
                className="w-3.5 h-3.5"
                style={{ color: "var(--accent-red)" }}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TasksPage({ onNavigate }: TasksPageProps) {
  const { tasks, addTask, updateTask, deleteTask, completeTask, reorderTasks } =
    useTaskContext();
  const { playButtonTap, playTaskComplete, playErrorAlert } = useSFXContext();
  const { addStreak, updateConfidence } = useGameContext();
  const [sparkles, setSparkles] = useState<
    { id: number; x: number; y: number }[]
  >([]);

  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDuration, setNewDuration] = useState(25);
  const [newCategory, setNewCategory] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">(
    "medium",
  );
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [completedSinceMount, setCompletedSinceMount] = useState(0);
  const [breakDismissed, setBreakDismissed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const dragId = useRef<string | null>(null);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const allDone = tasks.length > 0 && pendingCount === 0;

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => setShowConfetti(true), 300);
      return () => clearTimeout(timer);
    }
    setShowConfetti(false);
  }, [allDone]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addTask(
      newName.trim(),
      newLink.trim(),
      newDuration,
      newCategory.trim() || undefined,
      newPriority,
    );
    playButtonTap();
    setNewName("");
    setNewLink("");
    setNewDuration(25);
    setNewCategory("");
    setNewPriority("medium");
  };

  const handleComplete = (id: string, e?: React.MouseEvent) => {
    const task = tasks.find((t) => t.id === id);
    if (task?.priority === "high") {
      playSfxHighComplete();
    } else {
      playTaskComplete();
    }
    completeTask(id);
    addStreak();
    updateConfidence(4);
    setCompletedSinceMount((c) => c + 1);
    // Sparkle burst
    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    const newSparkle = { id: Date.now(), x, y };
    setSparkles((prev) => [...prev, newSparkle]);
    setTimeout(
      () => setSparkles((prev) => prev.filter((s) => s.id !== newSparkle.id)),
      1200,
    );
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    playErrorAlert();
  };

  const handleStartFocus = (id: string) => {
    sessionStorage.setItem("focusTaskId", id);
    onNavigate?.("focus");
  };

  const handleSaveEdit = (
    id: string,
    name: string,
    link: string,
    priority: "high" | "medium" | "low",
  ) => {
    const prev = tasks.find((t) => t.id === id);
    if (prev?.priority !== priority) playSfxPing();
    updateTask(id, { name, youtubeLink: link, priority });
    playButtonTap();
  };

  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragId.current && dragId.current !== overId) {
      setDragOverId(overId);
      const from = tasks.findIndex((t) => t.id === dragId.current);
      const to = tasks.findIndex((t) => t.id === overId);
      if (from !== -1 && to !== -1) {
        const next = [...tasks];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        reorderTasks(next);
      }
    }
  };

  const handleDragEnd = () => {
    dragId.current = null;
    setDragOverId(null);
  };

  const dragHandlers = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
  };

  const baseFiltered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  // Sort by priority: high -> medium -> low, preserve creation order within same priority
  const filtered = [...baseFiltered].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority ?? "medium"];
    const pb = PRIORITY_ORDER[b.priority ?? "medium"];
    if (pa !== pb) return pa - pb;
    return a.createdAt - b.createdAt;
  });

  const firstPendingId = filtered.find((t) => t.status === "pending")?.id;

  const categories = groupByCategory
    ? Array.from(new Set(filtered.map((t) => t.category || "Uncategorized")))
    : [];

  const showBreakReminder = completedSinceMount >= 3 && !breakDismissed;

  return (
    <div className="p-6 md:p-8 max-w-3xl pb-24">
      {/* Sparkle overlay */}
      {sparkles.map((sp) => (
        <div
          key={sp.id}
          style={{
            position: "fixed",
            left: sp.x,
            top: sp.y,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {["✨", "☕", "⭐", "🎵", "🌟"].map((emoji, i) => (
            <span
              key={emoji}
              style={{
                position: "absolute",
                fontSize: 18,
                animation: "sparkle-float 1.2s ease forwards",
                animationDelay: `${i * 0.08}s`,
                transform: `rotate(${(i / 5) * 360}deg) translateX(${30 + i * 8}px)`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      ))}
      <style>
        {
          "@keyframes sparkle-float { 0% { opacity:1; transform: rotate(var(--r,0deg)) translateX(30px) scale(1); } 100% { opacity:0; transform: rotate(var(--r,0deg)) translateX(80px) scale(0.3) translateY(-40px); } }"
        }
      </style>

      <AnimatePresence>
        {showConfetti && (
          <ConfettiOverlay onDismiss={() => setShowConfetti(false)} />
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Tasks
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {pendingCount} pending · {completedCount} completed
        </p>
      </div>

      <AnimatePresence>
        {showBreakReminder && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div
              className="px-4 py-3 rounded-xl flex items-center justify-between gap-3"
              style={{
                background: "rgba(255,209,102,0.08)",
                border: "1px solid rgba(255,209,102,0.25)",
              }}
              data-ocid="tasks.panel"
            >
              <p className="text-sm" style={{ color: "#FFD166" }}>
                🌟 Great work! You've completed {completedSinceMount} tasks —
                take a short break. 💙
              </p>
              <button
                type="button"
                onClick={() => setBreakDismissed(true)}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: "rgba(255,209,102,0.15)" }}
                data-ocid="tasks.close_button"
              >
                <X className="w-3.5 h-3.5" style={{ color: "#FFD166" }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usage note */}
      <div
        className="mb-6 px-4 py-3 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.28)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--accent-cyan)" }}>
          Focus smarter, not harder! Assign priorities and let musc guide your
          focus. 🎯
        </p>
      </div>

      {/* Add Task Form */}
      <div
        className="mb-6 p-5 rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(255,255,255,0.28)",
        }}
      >
        <p
          className="text-xs font-semibold mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          NEW TASK
        </p>
        <div className="flex flex-col gap-3">
          <input
            ref={nameInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Task name..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
            data-ocid="tasks.input"
          />
          <input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="YouTube link (optional) — https://youtube.com/watch?v=..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
            data-ocid="tasks.textarea"
          />
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional) — e.g. Math, Science..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
            data-ocid="tasks.input"
          />
          <select
            value={newPriority}
            onChange={(e) =>
              setNewPriority(e.target.value as "high" | "medium" | "low")
            }
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--bg-base)",
              border: "1px solid rgba(255,255,255,0.35)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
            data-ocid="tasks.select"
          >
            <option value="high">🔴 High Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="low">🔵 Low Priority</option>
          </select>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <p
                className="text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Duration (minutes)
              </p>
              <input
                type="number"
                min={1}
                max={180}
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value) || 25)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-6 py-2 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
                color: "#05080D",
              }}
              data-ocid="tasks.submit_button"
            >
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize"
              style={
                filter === f
                  ? {
                      background: "rgba(255,255,255,0.18)",
                      color: "var(--accent-cyan)",
                      border: "1px solid rgba(255,255,255,0.35)",
                    }
                  : {
                      color: "var(--text-muted)",
                      border: "1px solid transparent",
                    }
              }
              data-ocid="tasks.tab"
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setGroupByCategory((g) => !g)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{
            background: groupByCategory
              ? "rgba(255,255,255,0.18)"
              : "transparent",
            color: groupByCategory ? "var(--accent-cyan)" : "var(--text-muted)",
            border: `1px solid ${
              groupByCategory ? "rgba(255,255,255,0.35)" : "transparent"
            }`,
          }}
          data-ocid="tasks.toggle"
        >
          {groupByCategory ? (
            <Layers className="w-3.5 h-3.5" />
          ) : (
            <List className="w-3.5 h-3.5" />
          )}
          {groupByCategory ? "Grouped" : "Group by category"}
        </button>
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" data-ocid="tasks.empty_state">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {tasks.length === 0
              ? "No tasks yet. Add one above to get started. 💙"
              : "No tasks match this filter."}
          </p>
        </div>
      ) : groupByCategory ? (
        <div className="flex flex-col gap-6">
          {categories.map((cat) => {
            const catTasks = filtered.filter(
              (t) => (t.category || "Uncategorized") === cat,
            );
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {cat}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.14)",
                      color: "var(--accent-cyan)",
                    }}
                  >
                    {catTasks.length}
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  <div className="flex flex-col gap-2">
                    {catTasks.map((task, i) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={i}
                        isSuggested={task.id === firstPendingId}
                        onStart={handleStartFocus}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                        onSaveEdit={handleSaveEdit}
                        dragHandlers={dragHandlers}
                        isDragOver={dragOverId === task.id}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="flex flex-col gap-2">
            {filtered.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                index={i}
                isSuggested={task.id === firstPendingId}
                onStart={handleStartFocus}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onSaveEdit={handleSaveEdit}
                dragHandlers={dragHandlers}
                isDragOver={dragOverId === task.id}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* FAB */}
      <motion.button
        type="button"
        title="Quick add task"
        onClick={() => {
          nameInputRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          setTimeout(() => nameInputRef.current?.focus(), 350);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-40 transition-all"
        style={{
          background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
          boxShadow: "0 4px 20px rgba(255,255,255,0.50)",
          color: "#05080D",
        }}
        whileHover={{
          scale: 1.1,
          boxShadow: "0 6px 28px rgba(255,255,255,0.70)",
        }}
        whileTap={{ scale: 0.95 }}
        data-ocid="tasks.open_modal_button"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
