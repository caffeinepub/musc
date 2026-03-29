import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "../context/CurrencyContext";
import { useGameContext } from "../context/GameContext";
import { useTaskContext } from "../context/TaskContext";

const CHART_COLORS = [
  "#ffffff",
  "#e0e0e0",
  "#A78BFA",
  "#2BDE7B",
  "#FFD166",
  "#FF6B9D",
  "#6EE7B7",
  "#FCA5A5",
];

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

type Period = "day" | "week" | "month";

function isInPeriod(dateStr: string, period: Period): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  if (period === "day") {
    return date.toDateString() === now.toDateString();
  }
  if (period === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo && date <= now;
  }
  // month
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (priority === "high")
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
        style={{ background: "rgba(255,68,68,0.18)", color: "#ff6b6b" }}
      >
        HIGH
      </span>
    );
  if (priority === "low")
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
        style={{ background: "rgba(68,102,170,0.2)", color: "#7899cc" }}
      >
        LOW
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
      MED
    </span>
  );
}

const cardStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "16px",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
} as React.CSSProperties;

export function ReviewPage() {
  const { formatAmount } = useCurrency();
  const { tasks } = useTaskContext();
  const [period, setPeriod] = useState<Period>("week");

  // Read finance from localStorage (live on each render is fine for small data)
  const expenses: Array<{
    id: string;
    name: string;
    category: string;
    amount: number;
    date: string;
    note?: string;
  }> = (() => {
    try {
      return JSON.parse(localStorage.getItem("musc_expenses") || "[]");
    } catch {
      return [];
    }
  })();

  const incomes: Array<{
    id: string;
    source: string;
    amount: number;
    date: string;
  }> = (() => {
    try {
      return JSON.parse(localStorage.getItem("musc_income") || "[]");
    } catch {
      return [];
    }
  })();

  const budgets: Array<{
    category: string;
    limit: number;
    period: string;
  }> = (() => {
    try {
      return JSON.parse(localStorage.getItem("musc_budgets") || "[]");
    } catch {
      return [];
    }
  })();

  // Period-filtered finance
  const filteredExpenses = expenses.filter((e) => isInPeriod(e.date, period));
  const filteredIncomes = incomes.filter((i) => isInPeriod(i.date, period));
  const periodTotalExpenses = filteredExpenses.reduce(
    (s, e) => s + e.amount,
    0,
  );
  const periodTotalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
  const periodNet = periodTotalIncome - periodTotalExpenses;

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  for (const e of filteredExpenses) {
    categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount;
  }
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top spending category
  const topCategory = categoryData[0];

  // Task stats
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const highPendingTasks = pendingTasks.filter((t) => t.priority === "high");

  const totalPoints = tasks.reduce(
    (s, t) => s + PRIORITY_WEIGHT[t.priority ?? "medium"],
    0,
  );
  const earnedPoints = completedTasks.reduce(
    (s, t) => s + PRIORITY_WEIGHT[t.priority ?? "medium"],
    0,
  );
  const weightedPct = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  // Game context scores
  const { confidence } = useGameContext();
  // Efficiency score: priority-weighted completion (high=1.5x, med=1x, low=0.7x)
  const efficiencyWeight = { high: 1.5, medium: 1.0, low: 0.7 } as const;
  const totalWeight = tasks.reduce(
    (s, t) => s + efficiencyWeight[t.priority ?? "medium"],
    0,
  );
  const earnedWeight = completedTasks.reduce(
    (s, t) => s + efficiencyWeight[t.priority ?? "medium"],
    0,
  );
  const efficiencyScore = Math.round(
    totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0,
  );

  // Suggested focus: top pending high priority task, or first pending
  const suggestedTask =
    highPendingTasks[0] ??
    pendingTasks.sort((a, b) => {
      const wa = PRIORITY_WEIGHT[a.priority ?? "medium"];
      const wb = PRIORITY_WEIGHT[b.priority ?? "medium"];
      return wb - wa;
    })[0];

  // Overspent categories (compare to budget)
  const overspentCats = budgets
    .filter((b) => {
      const spent = filteredExpenses
        .filter((e) => e.category === b.category)
        .reduce((s, e) => s + e.amount, 0);
      return spent > b.limit;
    })
    .map((b) => b.category);

  const periods: { id: Period; label: string }[] = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
  ];

  return (
    <div
      className="p-6 md:p-8 max-w-5xl pb-24"
      style={{ color: "var(--text-primary)" }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Review
        </h1>
        <div
          className="px-4 py-2.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.28)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--accent-cyan)" }}>
            See your productivity and finances at a glance! Track your tasks,
            focus, and spending — and know exactly where you stand. 📊
          </p>
        </div>
      </div>

      {/* Period toggle */}
      <div className="flex items-center gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={
              period === p.id
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
            data-ocid="review.tab"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Scores: Confidence & Efficiency ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Confidence Ring */}
        <div
          style={{
            ...cardStyle,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div className="relative" style={{ width: 100, height: 100 }}>
            <svg
              aria-hidden="true"
              role="presentation"
              width="100"
              height="100"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(102,252,241,0.12)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#66FCF1"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - confidence / 100)}`}
                style={{
                  transition: "stroke-dashoffset 1s ease",
                  filter: "drop-shadow(0 0 6px rgba(102,252,241,0.6))",
                }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="text-lg font-bold" style={{ color: "#66FCF1" }}>
                {confidence}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Confidence
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Tasks + quiz results
            </p>
          </div>
        </div>

        {/* Efficiency Ring */}
        <div
          style={{
            ...cardStyle,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div className="relative" style={{ width: 100, height: 100 }}>
            <svg
              aria-hidden="true"
              role="presentation"
              width="100"
              height="100"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(167,139,250,0.12)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#A78BFA"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - efficiencyScore / 100)}`}
                style={{
                  transition: "stroke-dashoffset 1s ease",
                  filter: "drop-shadow(0 0 6px rgba(167,139,250,0.6))",
                }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="text-lg font-bold" style={{ color: "#A78BFA" }}>
                {efficiencyScore}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Efficiency
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Priority-weighted tasks
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 1: Task Status ── */}
      <div className="mb-6">
        <h2
          className="text-lg font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          📁 Task Status
        </h2>

        {/* Weighted progress bar */}
        <div style={{ ...cardStyle, padding: "18px", marginBottom: "16px" }}>
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              WEIGHTED PROGRESS
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: "var(--accent-cyan)" }}
            >
              {Math.round(weightedPct)}%
            </span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.10)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${weightedPct}%`,
                background: "linear-gradient(90deg, #e8e8e8, #f2f6ff)",
                boxShadow: "0 0 12px rgba(255,255,255,0.50)",
              }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {earnedPoints} pts earned
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {totalPoints} pts total
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              High=3pts · Med=2pts · Low=1pt
            </span>
          </div>
        </div>

        {/* Completed / Pending columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Completed */}
          <div style={{ ...cardStyle, padding: "18px" }}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--accent-green)" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                COMPLETED
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(43,214,123,0.12)",
                  color: "var(--accent-green)",
                }}
              >
                {completedTasks.length}
              </span>
            </div>
            {completedTasks.length === 0 ? (
              <p
                className="text-xs py-4 text-center"
                style={{ color: "var(--text-muted)" }}
                data-ocid="review.empty_state"
              >
                No completed tasks yet
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {completedTasks.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{ background: "rgba(43,214,123,0.05)" }}
                    data-ocid={`review.item.${i + 1}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--accent-green)" }}
                    />
                    <span
                      className="text-xs flex-1 truncate"
                      style={{
                        color: "var(--text-primary)",
                        textDecoration: "line-through",
                        opacity: 0.7,
                      }}
                    >
                      {t.name}
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending */}
          <div style={{ ...cardStyle, padding: "18px" }}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.70)" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                PENDING
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.14)",
                  color: "var(--accent-cyan)",
                }}
              >
                {pendingTasks.length}
              </span>
            </div>
            {pendingTasks.length === 0 ? (
              <p
                className="text-xs py-4 text-center"
                style={{ color: "var(--text-muted)" }}
              >
                All tasks done! 🎉
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {pendingTasks.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{
                      background:
                        t.priority === "high"
                          ? "rgba(255,68,68,0.07)"
                          : "rgba(255,255,255,0.04)",
                      border:
                        t.priority === "high"
                          ? "1px solid rgba(255,68,68,0.15)"
                          : "1px solid transparent",
                    }}
                    data-ocid={`review.item.${i + 1}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.70)" }}
                    />
                    <span
                      className="text-xs flex-1 truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {t.name}
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Money Snapshot ── */}
      <div className="mb-6">
        <h2
          className="text-lg font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          💰 Money Snapshot
        </h2>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            {
              label: "Income",
              value: periodTotalIncome,
              color: "#10B981",
              prefix: "+",
            },
            {
              label: "Expenses",
              value: periodTotalExpenses,
              color: "#EF4444",
              prefix: "-",
            },
            {
              label: "Net Balance",
              value: periodNet,
              color: periodNet >= 0 ? "#f2f6ff" : "#EF4444",
              prefix: periodNet >= 0 ? "+" : "-",
            },
          ].map((s) => (
            <div key={s.label} style={{ ...cardStyle, padding: "18px" }}>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                {s.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.prefix}
                {formatAmount(s.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Category breakdown + Income vs Expense chart */}
        {categoryData.length > 0 || filteredIncomes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Pie chart */}
            <div style={{ ...cardStyle, padding: "20px" }}>
              <p
                className="text-sm font-semibold mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                Expenses by Category
              </p>
              {categoryData.length === 0 ? (
                <p
                  className="text-xs text-center py-8"
                  style={{ color: "var(--text-muted)" }}
                >
                  No expenses this {period}
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#0B1220",
                          border: "1px solid rgba(255,255,255,0.28)",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                        formatter={(v: number) => [formatAmount(v), ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {categoryData.map((d, i) => {
                      const isOver = overspentCats.includes(d.name);
                      return (
                        <div key={d.name} className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                          <span
                            className="text-xs"
                            style={{
                              color: isOver ? "#EF4444" : "var(--text-muted)",
                            }}
                          >
                            {d.name}
                            {isOver ? " ⚠️" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Bar chart: Income vs Expenses */}
            <div style={{ ...cardStyle, padding: "20px" }}>
              <p
                className="text-sm font-semibold mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                Income vs Expenses
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={[
                    { name: "Income", value: periodTotalIncome },
                    { name: "Expenses", value: periodTotalExpenses },
                  ]}
                  barGap={8}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0B1220",
                      border: "1px solid rgba(255,255,255,0.28)",
                      borderRadius: "10px",
                      color: "#fff",
                    }}
                    formatter={(v: number) => [formatAmount(v), ""]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <Cell fill="#10B981" />
                    <Cell fill="#EF4444" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div
            style={{ ...cardStyle, padding: "32px", textAlign: "center" }}
            data-ocid="review.empty_state"
          >
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              No financial data for this {period} yet
            </p>
          </div>
        )}
      </div>

      {/* ── Section 3: Insights ── */}
      <div>
        <h2
          className="text-lg font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          💡 Insights
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {topCategory && (
            <div
              style={{ ...cardStyle, padding: "16px 20px" }}
              className="flex items-center gap-3"
            >
              <span className="text-lg">💸</span>
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  TOP SPENDING CATEGORY
                </p>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {topCategory.name}{" "}
                  <span style={{ color: "#EF4444" }}>
                    ({formatAmount(topCategory.value)})
                  </span>
                </p>
              </div>
            </div>
          )}

          <div
            style={{ ...cardStyle, padding: "16px 20px" }}
            className="flex items-center gap-3"
          >
            <span className="text-lg">✅</span>
            <div>
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                TASKS COMPLETED
              </p>
              <p
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {completedTasks.length} / {tasks.length}{" "}
                {tasks.length > 0
                  ? `(${Math.round(
                      (completedTasks.length / tasks.length) * 100,
                    )}%)`
                  : ""}
              </p>
            </div>
          </div>

          {suggestedTask && (
            <div
              style={{
                ...cardStyle,
                padding: "16px 20px",
                border:
                  suggestedTask.priority === "high"
                    ? "1px solid rgba(255,68,68,0.25)"
                    : "1px solid rgba(255,255,255,0.18)",
              }}
              className="flex items-center gap-3"
            >
              <span className="text-lg">🎯</span>
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  SUGGESTED FOCUS
                </p>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {suggestedTask.name}{" "}
                  <PriorityBadge priority={suggestedTask.priority} />
                </p>
              </div>
            </div>
          )}

          {overspentCats.length > 0 && (
            <div
              style={{
                ...cardStyle,
                padding: "16px 20px",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
              className="flex items-center gap-3"
            >
              <span className="text-lg">⚠️</span>
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "#EF4444" }}
                >
                  OVERSPENT CATEGORIES
                </p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {overspentCats.join(", ")}
                </p>
              </div>
            </div>
          )}

          {periodNet < 0 && (
            <div
              style={{
                ...cardStyle,
                padding: "16px 20px",
                border: "1px solid rgba(255,209,102,0.2)",
              }}
              className="flex items-center gap-3"
            >
              <span className="text-lg">💡</span>
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "#FFD166" }}
                >
                  SAVING TIP
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  You're spending {formatAmount(Math.abs(periodNet))} more than
                  you earn this {period}. Review your top category to save more!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
