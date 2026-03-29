import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Play,
  RotateCcw,
  Youtube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Page } from "../App";
import { useCurrency } from "../context/CurrencyContext";
import { useSFXContext } from "../context/SFXContext";
import { useTaskContext } from "../context/TaskContext";
import { useActor } from "../hooks/useActor";
import { useSession } from "../hooks/useSession";

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  taskId?: string;
}

interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
}

interface Budget {
  id: string;
  category: string;
  limit: number;
  period: string;
}

function loadFinanceData() {
  const expenses: Expense[] = JSON.parse(
    localStorage.getItem("musc_expenses") || "[]",
  );
  const income: Income[] = JSON.parse(
    localStorage.getItem("musc_income") || "[]",
  );
  const budgets: Budget[] = JSON.parse(
    localStorage.getItem("musc_budgets") || "[]",
  );
  return { expenses, income, budgets };
}

function PriorityBadgeMini({ priority }: { priority?: string }) {
  if (priority === "high")
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
        style={{ background: "rgba(255,68,68,0.18)", color: "#ff6b6b" }}
      >
        H
      </span>
    );
  if (priority === "low")
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
        style={{ background: "rgba(68,102,170,0.2)", color: "#7899cc" }}
      >
        L
      </span>
    );
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded-full font-bold"
      style={{
        background: "rgba(255,255,255,0.18)",
        color: "var(--accent-cyan)",
      }}
    >
      M
    </span>
  );
}

function ProgressRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-label="Progress ring"
      >
        <title>Progress ring</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold"
          style={{ color: "var(--accent-cyan)" }}
        >
          {Math.round(pct)}%
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          done
        </span>
      </div>
    </div>
  );
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { tasks, updateTask, completeTask } = useTaskContext();
  const { activeSession } = useSession();
  const { actor } = useActor();
  const { playButtonTap } = useSFXContext();
  const [ringExpanded, setRingExpanded] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const [finance] = useState(() => loadFinanceData());

  const ytLabel = localStorage.getItem("yt_current_label") || null;

  useEffect(() => {
    if (!actor) return;
  }, [actor]);

  useEffect(() => {
    if (editingTaskId !== null && editRef.current) {
      editRef.current.focus();
    }
  }, [editingTaskId]);

  const pendingTasks = tasks
    .filter((t) => t.status === "pending")
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority ?? "medium"];
      const pb = PRIORITY_ORDER[b.priority ?? "medium"];
      if (pa !== pb) return pa - pb;
      return a.createdAt - b.createdAt;
    });

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const totalTasks = tasks.length;

  // Weighted progress
  const totalPoints = tasks.reduce(
    (s, t) => s + PRIORITY_WEIGHT[t.priority ?? "medium"],
    0,
  );
  const earnedPoints = completedTasks.reduce(
    (s, t) => s + PRIORITY_WEIGHT[t.priority ?? "medium"],
    0,
  );
  const donePct = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  const completedToday = completedTasks.length;

  const capacity = 30;
  const scheduledMinutes = pendingTasks.reduce(
    (s, t) => s + (t.duration || 25),
    0,
  );
  const scheduledTracks = Math.ceil(scheduledMinutes / 5);
  const capacityPct = Math.min(100, (scheduledTracks / capacity) * 100);

  const workloadStatus =
    capacityPct < 50
      ? "Underloaded"
      : capacityPct <= 90
        ? "On Track"
        : "Overloaded";
  const workloadColor =
    workloadStatus === "Underloaded"
      ? "var(--accent-amber)"
      : workloadStatus === "On Track"
        ? "var(--accent-green)"
        : "var(--accent-red)";

  const insight =
    completedToday === 0
      ? "No sessions completed yet today."
      : completedToday >= 5
        ? "Excellent focus today! Keep it up."
        : "You're working efficiently.";

  let nudge = "You're on track. Keep the pace.";
  if (scheduledTracks > capacity * 1.2) {
    nudge = `You're overplanned by ${scheduledTracks - capacity} track-units. Consider removing low-priority tasks.`;
  } else if (pendingTasks.length > 0 && completedToday === 0) {
    nudge = "Start your highest priority task to build momentum.";
  } else if (completedToday > 0 && pendingTasks.length > 0) {
    nudge = `${pendingTasks.length} task(s) still pending. You've got this!`;
  }

  const topTask = pendingTasks[0] ?? null;
  const quickTasks = pendingTasks.slice(0, 3);

  const handleTaskNameBlur = (id: string) => {
    if (editingName.trim()) {
      updateTask(id, { name: editingName.trim() });
    }
    setEditingTaskId(null);
    setEditingName("");
  };

  const handleMarkComplete = (id: string) => {
    playButtonTap();
    completeTask(id);
  };

  // Finance snapshot calculations
  const totalIncome = finance.income.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = finance.expenses.reduce(
    (s, e) => s + Number(e.amount),
    0,
  );
  const netBalance = totalIncome - totalExpenses;

  // Top spending categories
  const categoryTotals: Record<string, number> = {};
  for (const exp of finance.expenses) {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + Number(exp.amount);
  }
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxCategoryAmount = topCategories[0]?.[1] ?? 1;

  // Budget alerts (this month)
  const now = new Date();
  const thisMonthExpenses = finance.expenses.filter((e) => {
    const d = new Date(e.date);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });
  const budgetAlerts = finance.budgets
    .map((b) => {
      const spent = thisMonthExpenses
        .filter((e) => e.category === b.category)
        .reduce((s, e) => s + Number(e.amount), 0);
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      return { ...b, spent, pct };
    })
    .filter((b) => b.pct >= 80);

  const { formatAmount: fmt } = useCurrency();

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Your live focus control center
        </p>
      </div>

      {/* Section 1 — Primary Focus Card */}
      <div
        className="mb-5 p-6 rounded-2xl relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(45,124,255,0.05))",
          border: `1px solid ${
            activeSession ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.18)"
          }`,
          boxShadow: activeSession ? "0 0 40px rgba(255,255,255,0.14)" : "none",
        }}
        data-ocid="dashboard.card"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              {activeSession ? "ACTIVE SESSION" : "NEXT FOCUS"}
            </p>
            {topTask ? (
              <div className="flex items-center gap-2">
                <p
                  className="text-xl font-bold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {topTask.name}
                </p>
                {topTask.priority === "high" && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                    style={{
                      background: "rgba(255,68,68,0.18)",
                      color: "#ff6b6b",
                    }}
                  >
                    HIGH
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No pending tasks — add some in Tasks!
              </p>
            )}
            {topTask && (
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {topTask.duration}m session
                {topTask.youtubeLink ? " · YouTube ready" : ""}
              </p>
            )}
            {activeSession && (
              <p className="text-sm" style={{ color: "var(--accent-cyan)" }}>
                Video {activeSession.tracksCompleted + 1} /{" "}
                {activeSession.totalTracks}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              playButtonTap();
              onNavigate("focus");
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
              color: "#05080D",
              boxShadow: "0 0 20px rgba(255,255,255,0.18)",
            }}
            data-ocid="dashboard.primary_button"
          >
            {activeSession ? (
              <>
                <RotateCcw className="w-4 h-4" /> Resume Session
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Start Next Task
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 2 — Workload + Progress Ring */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Workload */}
        <div
          className="p-5 rounded-2xl card-hover"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
          }}
          data-ocid="dashboard.panel"
        >
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              TODAY'S WORKLOAD
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: `${workloadColor}20`,
                color: workloadColor,
              }}
            >
              {workloadStatus}
            </span>
          </div>
          <div className="flex gap-6 mb-4">
            <div>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {tasks.length}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                total
              </p>
            </div>
            <div>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--accent-green)" }}
              >
                {completedToday}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                done
              </p>
            </div>
            <div>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--text-secondary)" }}
              >
                {pendingTasks.length}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                remaining
              </p>
            </div>
          </div>
          <div
            className="w-full h-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.10)" }}
          >
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${donePct}%`,
                background: `linear-gradient(90deg, var(--accent-cyan), ${workloadColor})`,
              }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            {completedToday} / {totalTasks} tasks complete (weighted)
          </p>
        </div>

        {/* Progress Ring — weighted */}
        <button
          type="button"
          className="p-5 rounded-2xl flex flex-col items-center justify-center w-full"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
          }}
          onClick={() => setRingExpanded((e) => !e)}
          data-ocid="dashboard.toggle"
        >
          <p
            className="text-xs font-semibold mb-3 self-start"
            style={{ color: "var(--text-muted)" }}
          >
            WEIGHTED PROGRESS
          </p>
          <ProgressRing pct={donePct} />
          {ringExpanded && (
            <div className="flex gap-4 mt-3">
              <div className="text-center">
                <p
                  className="text-lg font-bold"
                  style={{ color: "var(--accent-green)" }}
                >
                  {earnedPoints}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  pts earned
                </p>
              </div>
              <div className="text-center">
                <p
                  className="text-lg font-bold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {totalPoints}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  total pts
                </p>
              </div>
            </div>
          )}
          <div
            className="mt-2 text-xs flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            {ringExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {ringExpanded ? "Collapse" : "Expand"}
          </div>
        </button>
      </div>

      {/* Section 3 — Quick Tasks + Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Quick Task Panel — sorted by priority */}
        <div
          className="p-5 rounded-2xl card-hover"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
          }}
        >
          <p
            className="text-xs font-semibold mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            QUICK TASKS
          </p>
          {quickTasks.length === 0 ? (
            <p
              className="text-xs py-4 text-center"
              style={{ color: "var(--text-muted)" }}
              data-ocid="dashboard.empty_state"
            >
              All tasks done!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {quickTasks.map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl group transition-all"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "rgba(255,255,255,0.18)";
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "transparent";
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateX(0)";
                  }}
                  data-ocid={`dashboard.item.${i + 1}`}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid transparent",
                    cursor: "pointer",
                    transition:
                      "border-color 200ms, transform 150ms cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleMarkComplete(task.id)}
                    className="flex-shrink-0 w-5 h-5 rounded-full border transition-all hover:border-green-400"
                    style={{ border: "1px solid var(--text-muted)" }}
                    data-ocid={`dashboard.checkbox.${i + 1}`}
                  />

                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      playButtonTap();
                      sessionStorage.setItem("focusTaskId", task.id);
                      onNavigate("focus");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        playButtonTap();
                        sessionStorage.setItem("focusTaskId", task.id);
                        onNavigate("focus");
                      }
                    }}
                  >
                    {editingTaskId === task.id ? (
                      <input
                        ref={editRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleTaskNameBlur(task.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleTaskNameBlur(task.id)
                        }
                        className="w-full text-xs bg-transparent outline-none border-b"
                        style={{
                          color: "var(--text-primary)",
                          borderColor: "var(--accent-cyan)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        data-ocid="dashboard.input"
                      />
                    ) : (
                      <p
                        className="text-xs truncate"
                        style={{ color: "var(--text-primary)" }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingTaskId(task.id);
                          setEditingName(task.name);
                        }}
                      >
                        {task.name}
                      </p>
                    )}
                  </button>

                  <PriorityBadgeMini priority={task.priority} />

                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.09)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {task.duration}m
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      playButtonTap();
                      sessionStorage.setItem("focusTaskId", task.id);
                      onNavigate("focus");
                    }}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                    style={{
                      background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
                      color: "#05080D",
                    }}
                    data-ocid="dashboard.secondary_button"
                  >
                    <Play className="w-2.5 h-2.5" /> Start
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Snapshot */}
        <div
          className="p-5 rounded-2xl card-hover"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
          }}
        >
          <p
            className="text-xs font-semibold mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            PERFORMANCE
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Completed today
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--accent-green)" }}
              >
                {completedToday}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Pending tasks
              </span>
              <span
                className="text-sm font-bold"
                style={{
                  color:
                    pendingTasks.length > 0
                      ? "var(--accent-amber)"
                      : "var(--text-muted)",
                }}
              >
                {pendingTasks.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Weighted progress
              </span>
              <span
                className="text-sm font-bold"
                style={{
                  color:
                    donePct > 70
                      ? "var(--accent-green)"
                      : "var(--accent-amber)",
                }}
              >
                {Math.round(donePct)}%
              </span>
            </div>
          </div>
          <div
            className="mt-4 px-3 py-2.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-color)",
            }}
          >
            <p
              className="text-xs italic"
              style={{ color: "var(--text-muted)" }}
            >
              "{insight}"
            </p>
          </div>
        </div>
      </div>

      {/* Mini YT Player widget */}
      {ytLabel && (
        <div className="mb-5">
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            CURRENT VIDEO
          </p>
          <div
            className="p-3 rounded-2xl flex items-center gap-3"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <Youtube
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "#ff4757" }}
            />
            <p
              className="text-sm flex-1 truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {ytLabel}
            </p>
            <button
              type="button"
              onClick={() => {
                playButtonTap();
                onNavigate("focus");
              }}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "var(--accent-cyan)",
              }}
              data-ocid="dashboard.secondary_button"
            >
              Open Player
            </button>
          </div>
        </div>
      )}

      {/* Smart Nudge */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl mb-5"
        style={{
          background: "rgba(240,161,58,0.06)",
          border: "1px solid rgba(240,161,58,0.2)",
        }}
        data-ocid="dashboard.panel"
      >
        <Lightbulb
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "var(--accent-amber)" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {nudge}
        </p>
      </div>

      {/* Finance Snapshot */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "1rem",
        }}
        data-ocid="dashboard.panel"
      >
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}
          >
            FINANCE SNAPSHOT
          </p>
          <button
            type="button"
            onClick={() => {
              playButtonTap();
              onNavigate("money");
            }}
            className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.35)",
              color: "var(--accent-cyan)",
            }}
            data-ocid="dashboard.link"
          >
            → View Finances
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div
            className="px-4 py-3 rounded-xl"
            style={{
              background: "rgba(43,214,123,0.06)",
              border: "1px solid rgba(43,214,123,0.15)",
            }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Total Income
            </p>
            <p className="text-lg font-bold" style={{ color: "#2BD67B" }}>
              {fmt(totalIncome)}
            </p>
          </div>
          <div
            className="px-4 py-3 rounded-xl"
            style={{
              background: "rgba(255,107,107,0.06)",
              border: "1px solid rgba(255,107,107,0.15)",
            }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Total Expenses
            </p>
            <p className="text-lg font-bold" style={{ color: "#ff6b6b" }}>
              {fmt(totalExpenses)}
            </p>
          </div>
          <div
            className="px-4 py-3 rounded-xl"
            style={{
              background:
                netBalance >= 0
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(255,107,107,0.06)",
              border:
                netBalance >= 0
                  ? "1px solid rgba(255,255,255,0.18)"
                  : "1px solid rgba(255,107,107,0.15)",
            }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Net Balance
            </p>
            <p
              className="text-lg font-bold"
              style={{
                color: netBalance >= 0 ? "var(--accent-cyan)" : "#ff6b6b",
              }}
            >
              {netBalance >= 0 ? "+" : ""}
              {fmt(netBalance)}
            </p>
          </div>
        </div>

        {/* Top spending categories */}
        {topCategories.length > 0 && (
          <div className="mb-4">
            <p
              className="text-xs mb-2"
              style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
            >
              TOP CATEGORIES
            </p>
            <div className="flex flex-col gap-2">
              {topCategories.map(([cat, amt]) => (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {cat}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {fmt(amt)}
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full"
                    style={{
                      height: "4px",
                      background: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <div
                      className="rounded-full transition-all duration-500"
                      style={{
                        height: "4px",
                        width: `${(amt / maxCategoryAmount) * 100}%`,
                        background: "var(--accent-cyan)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget alerts */}
        {budgetAlerts.length > 0 && (
          <div>
            <p
              className="text-xs mb-2"
              style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
            >
              BUDGET ALERTS
            </p>
            <div className="flex flex-wrap gap-2">
              {budgetAlerts.map((b) => (
                <span
                  key={b.id}
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    background:
                      b.pct >= 100
                        ? "rgba(255,107,107,0.15)"
                        : "rgba(240,161,58,0.15)",
                    color: b.pct >= 100 ? "#ff6b6b" : "var(--accent-amber)",
                    border:
                      b.pct >= 100
                        ? "1px solid rgba(255,107,107,0.3)"
                        : "1px solid rgba(240,161,58,0.3)",
                  }}
                >
                  {b.category} — {Math.round(b.pct)}% of {fmt(b.limit)}
                  {b.pct >= 100 ? " 🔴" : " ⚠️"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {finance.expenses.length === 0 && finance.income.length === 0 && (
          <p
            className="text-xs text-center py-2"
            style={{ color: "var(--text-muted)" }}
            data-ocid="dashboard.empty_state"
          >
            No financial data yet — add income or expenses in Finances.
          </p>
        )}
      </div>
    </div>
  );
}
