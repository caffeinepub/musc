import {
  CheckCircle,
  DollarSign,
  Download,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  CURRENCIES,
  type CurrencyCode,
  useCurrency,
} from "../context/CurrencyContext";

type ExpenseCategory =
  | "Food"
  | "Study"
  | "Subscription"
  | "Transport"
  | "Entertainment"
  | "Health"
  | "Other";
type IncomeSource = "Allowance" | "Job" | "Scholarship" | "Freelance" | "Other";

interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  name: string;
  date: string;
  note?: string;
  taskId?: string;
}
interface Income {
  id: string;
  amount: number;
  source: IncomeSource;
  date: string;
}
interface Budget {
  category: ExpenseCategory;
  limit: number;
  period: "weekly" | "monthly";
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Study",
  "Subscription",
  "Transport",
  "Entertainment",
  "Health",
  "Other",
];
const INCOME_SOURCES: IncomeSource[] = [
  "Allowance",
  "Job",
  "Scholarship",
  "Freelance",
  "Other",
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: "#ffffff",
  Study: "#e0e0e0",
  Subscription: "#A855F7",
  Transport: "#10B981",
  Entertainment: "#F59E0B",
  Health: "#EF4444",
  Other: "#6B7280",
};

function playSfxPing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => ctx.close();
  } catch {}
}

function playSfxTick() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    osc.onended = () => ctx.close();
  } catch {}
}

function playSfxDelete() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  } catch {}
}

const today = () => new Date().toISOString().split("T")[0];

const cardStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "16px",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
} as React.CSSProperties;

const inputStyle = {
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "10px",
  color: "var(--text-primary)",
  padding: "8px 12px",
  fontSize: "13px",
  outline: "none",
  width: "100%",
  transition: "border-color 200ms ease",
} as React.CSSProperties;

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none" as const,
} as React.CSSProperties;

const btnPrimary = {
  background: "linear-gradient(135deg, #e8e8e8, #f2f6ff)",
  color: "#05080D",
  border: "none",
  borderRadius: "10px",
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "opacity 200ms ease, transform 150ms ease",
} as React.CSSProperties;

const slideInStyle = {
  animation: "moneySlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
};

interface MuscTask {
  id: string;
  name: string;
}

// ── Inline Editable Expense Card ──────────────────────────────────────────────
function ExpenseCard({
  exp,
  idx,
  muscTasks,
  onSave,
  onDelete,
}: {
  exp: Expense;
  idx: number;
  muscTasks: MuscTask[];
  onSave: (id: string, partial: Partial<Expense>) => void;
  onDelete: (id: string) => void;
}) {
  const { formatAmount } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(exp.name);
  const [amount, setAmount] = useState(String(exp.amount));
  const [category, setCategory] = useState<ExpenseCategory>(exp.category);
  const [date, setDate] = useState(exp.date);
  const [note, setNote] = useState(exp.note ?? "");
  const [taskId, setTaskId] = useState(exp.taskId ?? "");

  const save = () => {
    onSave(exp.id, {
      name,
      amount: Number.parseFloat(amount) || exp.amount,
      category,
      date,
      note: note.trim() || undefined,
      taskId: taskId || undefined,
    });
    playSfxPing();
    setEditing(false);
  };

  const categoryColor = CATEGORY_COLORS[exp.category] ?? "#6B7280";

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        ...cardStyle,
        borderLeft: `3px solid ${categoryColor}88`,
        animation: "moneySlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
      data-ocid={`money.expenses.item.${idx + 1}`}
    >
      {!editing ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-semibold text-sm truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {exp.name}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: `${categoryColor}22`,
                  color: categoryColor,
                  border: `1px solid ${categoryColor}44`,
                }}
              >
                {exp.category}
              </span>
              {exp.taskId && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(102,252,241,0.1)",
                    color: "var(--accent-cyan)",
                  }}
                >
                  linked
                </span>
              )}
            </div>
            {exp.note && (
              <p
                className="text-xs mt-0.5 truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {exp.note}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {exp.date}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-base font-bold" style={{ color: "#EF4444" }}>
              -{formatAmount(exp.amount)}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "var(--text-muted)",
              }}
              data-ocid={`money.expenses.edit_button.${idx + 1}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(exp.id);
                playSfxDelete();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#EF4444",
              }}
              data-ocid={`money.expenses.delete_button.${idx + 1}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="money-input"
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              data-ocid="money.expenses.input"
            />
            <input
              className="money-input"
              style={inputStyle}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="money-input"
              style={selectStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className="money-input"
              style={inputStyle}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <input
            className="money-input"
            style={inputStyle}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
          />
          {muscTasks.length > 0 && (
            <select
              className="money-input"
              style={selectStyle}
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">No task link</option>
              {muscTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              style={{ ...btnPrimary, fontSize: "12px", padding: "6px 12px" }}
              data-ocid="money.expenses.save_button"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "var(--text-muted)",
              }}
              data-ocid="money.expenses.cancel_button"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline Editable Income Card ───────────────────────────────────────────────
function IncomeCard({
  inc,
  idx,
  onSave,
  onDelete,
}: {
  inc: Income;
  idx: number;
  onSave: (id: string, partial: Partial<Income>) => void;
  onDelete: (id: string) => void;
}) {
  const { formatAmount } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<IncomeSource>(inc.source);
  const [amount, setAmount] = useState(String(inc.amount));
  const [date, setDate] = useState(inc.date);

  const save = () => {
    onSave(inc.id, {
      source,
      amount: Number.parseFloat(amount) || inc.amount,
      date,
    });
    playSfxPing();
    setEditing(false);
  };

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        ...cardStyle,
        borderLeft: "3px solid #10B98188",
        animation: "moneySlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
      data-ocid={`money.income.item.${idx + 1}`}
    >
      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {inc.source}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  color: "#10B981",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                income
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {inc.date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: "#10B981" }}>
              +{formatAmount(inc.amount)}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "var(--text-muted)",
              }}
              data-ocid={`money.income.edit_button.${idx + 1}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(inc.id);
                playSfxDelete();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#EF4444",
              }}
              data-ocid={`money.income.delete_button.${idx + 1}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <select
              className="money-input"
              style={selectStyle}
              value={source}
              onChange={(e) => setSource(e.target.value as IncomeSource)}
            >
              {INCOME_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              className="money-input"
              style={inputStyle}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              className="money-input"
              style={inputStyle}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              style={{ ...btnPrimary, fontSize: "12px", padding: "6px 12px" }}
              data-ocid="money.income.save_button"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "var(--text-muted)",
              }}
              data-ocid="money.income.cancel_button"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main MoneyPage ─────────────────────────────────────────────────────────────
export function MoneyPage() {
  const { formatAmount, currency, setCurrency } = useCurrency();

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("musc_expenses") ?? "[]");
    } catch {
      return [];
    }
  });

  const [income, setIncome] = useState<Income[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("musc_income") ?? "[]");
    } catch {
      return [];
    }
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("musc_budgets") ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("musc_expenses", JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem("musc_income", JSON.stringify(income));
  }, [income]);
  useEffect(() => {
    localStorage.setItem("musc_budgets", JSON.stringify(budgets));
  }, [budgets]);

  const [tab, setTab] = useState<
    "expenses" | "income" | "budgets" | "analytics"
  >("expenses");

  // Add Expense form
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Food");
  const [expDate, setExpDate] = useState(today);
  const [expNote, setExpNote] = useState("");
  const [expTaskId, setExpTaskId] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Add Income form
  const [incSource, setIncSource] = useState<IncomeSource>("Job");
  const [incAmount, setIncAmount] = useState("");
  const [incDate, setIncDate] = useState(today);
  const [showAddIncome, setShowAddIncome] = useState(false);

  // Add Budget form
  const [budgetCategory, setBudgetCategory] = useState<ExpenseCategory>("Food");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<"weekly" | "monthly">(
    "monthly",
  );

  const muscTasks: MuscTask[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("musc_tasks") ?? "[]");
    } catch {
      return [];
    }
  })();

  const addExpense = () => {
    if (!expName.trim() || !expAmount) return;
    const newExp: Expense = {
      id: Date.now().toString(),
      name: expName.trim(),
      amount: Number.parseFloat(expAmount),
      category: expCategory,
      date: expDate,
      note: expNote.trim() || undefined,
      taskId: expTaskId || undefined,
    };
    setExpenses((prev) => [newExp, ...prev]);
    playSfxTick();
    setExpName("");
    setExpAmount("");
    setExpNote("");
    setExpTaskId("");
    setShowAddExpense(false);
  };

  const addIncome = () => {
    if (!incAmount) return;
    const newInc: Income = {
      id: Date.now().toString(),
      source: incSource,
      amount: Number.parseFloat(incAmount),
      date: incDate,
    };
    setIncome((prev) => [newInc, ...prev]);
    playSfxTick();
    setIncAmount("");
    setShowAddIncome(false);
  };

  const saveBudget = () => {
    if (!budgetLimit) return;
    const existing = budgets.findIndex((b) => b.category === budgetCategory);
    const newBudget: Budget = {
      category: budgetCategory,
      limit: Number.parseFloat(budgetLimit),
      period: budgetPeriod,
    };
    if (existing >= 0) {
      setBudgets((prev) =>
        prev.map((b, i) => (i === existing ? newBudget : b)),
      );
    } else {
      setBudgets((prev) => [...prev, newBudget]);
    }
    playSfxPing();
    setBudgetLimit("");
  };

  function getSpentForBudget(budget: Budget): number {
    return expenses
      .filter((e) => {
        if (e.category !== budget.category) return false;
        const d = new Date(e.date);
        const now = new Date();
        if (budget.period === "weekly") {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return d >= weekAgo;
        }
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, e) => s + e.amount, 0);
  }

  // Analytics data
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const categoryMap: Record<string, number> = {};
  for (const e of expenses) {
    categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount;
  }
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly chart data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthExp = expenses
      .filter((e) => {
        const ed = new Date(e.date);
        return ed.getMonth() === month && ed.getFullYear() === year;
      })
      .reduce((s, e) => s + e.amount, 0);
    const monthInc = income
      .filter((inc) => {
        const id = new Date(inc.date);
        return id.getMonth() === month && id.getFullYear() === year;
      })
      .reduce((s, inc) => s + inc.amount, 0);
    return {
      label: d.toLocaleString("default", { month: "short" }),
      expenses: monthExp,
      income: monthInc,
    };
  });

  const exportCSV = () => {
    const rows = [
      ["Type", "Name/Source", "Category", "Amount", "Date", "Note"],
      ...expenses.map((e) => [
        "Expense",
        e.name,
        e.category,
        e.amount,
        e.date,
        e.note ?? "",
      ]),
      ...income.map((i) => ["Income", i.source, "", i.amount, i.date, ""]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "musc-finances.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "expenses", label: "Expenses" },
    { id: "income", label: "Income" },
    { id: "budgets", label: "Budgets" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div
      className="p-6 md:p-8 max-w-5xl pb-24"
      style={{ color: "var(--text-primary)" }}
    >
      <style>{`
        @keyframes moneySlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .money-input::placeholder { color: rgba(255,255,255,0.45); }
        .money-input:focus { border-color: rgba(255,255,255,0.50) !important; }
        .money-input option { background: #0d1117; color: #fff; }
      `}</style>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Money
          </h1>
          <div className="flex items-center gap-2">
            <select
              className="money-input"
              style={{
                ...selectStyle,
                width: "auto",
                padding: "6px 10px",
                fontSize: "12px",
              }}
              value={currency.code}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              data-ocid="money.currency.select"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "var(--text-muted)",
              }}
              data-ocid="money.export.button"
            >
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
        </div>

        <div
          className="px-4 py-2.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--accent-cyan)" }}>
            Keep your money as organized as your tasks! Track, budget, and grow
            while you focus. Your money, your way!
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Income",
              value: totalIncome,
              icon: <TrendingUp className="w-4 h-4" />,
              color: "#10B981",
            },
            {
              label: "Total Expenses",
              value: totalExpenses,
              icon: <TrendingDown className="w-4 h-4" />,
              color: "#EF4444",
            },
            {
              label: "Net Balance",
              value: netBalance,
              icon: <PiggyBank className="w-4 h-4" />,
              color: netBalance >= 0 ? "#f2f6ff" : "#EF4444",
            },
          ].map((s) => (
            <div key={s.label} style={{ ...cardStyle, padding: "14px 16px" }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: s.color }}>{s.icon}</span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.label}
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: s.color }}>
                {s.label === "Total Expenses"
                  ? "-"
                  : netBalance < 0 && s.label === "Net Balance"
                    ? "-"
                    : "+"}
                {formatAmount(Math.abs(s.value))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-2xl mb-5"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          width: "fit-content",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all"
            style={{
              background:
                tab === t.id ? "rgba(255,255,255,0.18)" : "transparent",
              border:
                tab === t.id
                  ? "1px solid rgba(255,255,255,0.35)"
                  : "1px solid transparent",
              color:
                tab === t.id ? "var(--accent-cyan)" : "var(--text-secondary)",
            }}
            data-ocid={`money.${t.id}.tab`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Expenses Tab */}
      {tab === "expenses" && (
        <div style={slideInStyle}>
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              All Expenses
            </span>
            <button
              type="button"
              onClick={() => setShowAddExpense(!showAddExpense)}
              style={btnPrimary}
              data-ocid="money.expenses.open_modal_button"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>

          {showAddExpense && (
            <div
              style={{
                ...cardStyle,
                padding: "20px",
                marginBottom: "16px",
                animation: "moneySlideIn 0.3s ease",
              }}
            >
              <p
                className="text-sm font-semibold mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                New Expense
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  className="money-input"
                  style={inputStyle}
                  placeholder="Name"
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  data-ocid="money.expenses.input"
                />
                <input
                  className="money-input"
                  style={inputStyle}
                  type="number"
                  placeholder="Amount"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <select
                  className="money-input"
                  style={selectStyle}
                  value={expCategory}
                  onChange={(e) =>
                    setExpCategory(e.target.value as ExpenseCategory)
                  }
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  className="money-input"
                  style={inputStyle}
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
                <input
                  className="money-input"
                  style={inputStyle}
                  placeholder="Note"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                />
              </div>
              {muscTasks.length > 0 && (
                <select
                  className="money-input"
                  style={{ ...selectStyle, marginBottom: "8px" }}
                  value={expTaskId}
                  onChange={(e) => setExpTaskId(e.target.value)}
                >
                  <option value="">Link to task (optional)</option>
                  {muscTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addExpense}
                  style={btnPrimary}
                  data-ocid="money.expenses.submit_button"
                >
                  <DollarSign className="w-4 h-4" /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: "rgba(255,255,255,0.09)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "var(--text-muted)",
                  }}
                  data-ocid="money.expenses.cancel_button"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          )}

          {expenses.length === 0 ? (
            <div
              style={{ ...cardStyle, padding: "40px", textAlign: "center" }}
              data-ocid="money.expenses.empty_state"
            >
              <p style={{ color: "var(--text-muted)" }}>
                No expenses yet — start tracking! 💸
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {expenses.map((exp, idx) => (
                <ExpenseCard
                  key={exp.id}
                  exp={exp}
                  idx={idx}
                  muscTasks={muscTasks}
                  onSave={(id, partial) =>
                    setExpenses((prev) =>
                      prev.map((e) => (e.id === id ? { ...e, ...partial } : e)),
                    )
                  }
                  onDelete={(id) =>
                    setExpenses((prev) => prev.filter((e) => e.id !== id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Income Tab */}
      {tab === "income" && (
        <div style={slideInStyle}>
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              All Income
            </span>
            <button
              type="button"
              onClick={() => setShowAddIncome(!showAddIncome)}
              style={btnPrimary}
              data-ocid="money.income.open_modal_button"
            >
              <Plus className="w-4 h-4" /> Add Income
            </button>
          </div>

          {showAddIncome && (
            <div
              style={{
                ...cardStyle,
                padding: "20px",
                marginBottom: "16px",
                animation: "moneySlideIn 0.3s ease",
              }}
            >
              <p
                className="text-sm font-semibold mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                New Income
              </p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <select
                  className="money-input"
                  style={selectStyle}
                  value={incSource}
                  onChange={(e) => setIncSource(e.target.value as IncomeSource)}
                >
                  {INCOME_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  className="money-input"
                  style={inputStyle}
                  type="number"
                  placeholder="Amount"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  data-ocid="money.income.input"
                />
                <input
                  className="money-input"
                  style={inputStyle}
                  type="date"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addIncome}
                  style={btnPrimary}
                  data-ocid="money.income.submit_button"
                >
                  <TrendingUp className="w-4 h-4" /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddIncome(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: "rgba(255,255,255,0.09)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "var(--text-muted)",
                  }}
                  data-ocid="money.income.cancel_button"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          )}

          {income.length === 0 ? (
            <div
              style={{ ...cardStyle, padding: "40px", textAlign: "center" }}
              data-ocid="money.income.empty_state"
            >
              <p style={{ color: "var(--text-muted)" }}>
                No income entries yet — add your first! 💰
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {income.map((inc, idx) => (
                <IncomeCard
                  key={inc.id}
                  inc={inc}
                  idx={idx}
                  onSave={(id, partial) =>
                    setIncome((prev) =>
                      prev.map((i) => (i.id === id ? { ...i, ...partial } : i)),
                    )
                  }
                  onDelete={(id) =>
                    setIncome((prev) => prev.filter((i) => i.id !== id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Budgets Tab */}
      {tab === "budgets" && (
        <div style={slideInStyle}>
          <div style={{ ...cardStyle, padding: "20px", marginBottom: "16px" }}>
            <p
              className="text-sm font-semibold mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Set Budget Limit
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <select
                className="money-input"
                style={selectStyle}
                value={budgetCategory}
                onChange={(e) =>
                  setBudgetCategory(e.target.value as ExpenseCategory)
                }
                data-ocid="money.budget.select"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="money-input"
                style={inputStyle}
                type="number"
                placeholder="Limit amount"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                data-ocid="money.budget.input"
              />
              <select
                className="money-input"
                style={selectStyle}
                value={budgetPeriod}
                onChange={(e) =>
                  setBudgetPeriod(e.target.value as "weekly" | "monthly")
                }
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <button
              type="button"
              onClick={saveBudget}
              style={btnPrimary}
              data-ocid="money.budget.submit_button"
            >
              <Plus className="w-4 h-4" /> Save Budget
            </button>
          </div>

          {budgets.length === 0 ? (
            <div
              style={{ ...cardStyle, padding: "32px", textAlign: "center" }}
              data-ocid="money.budgets.empty_state"
            >
              <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                No budgets set yet — take control of your spending!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {budgets.map((budget, idx) => {
                const spent = getSpentForBudget(budget);
                const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
                const clampedPct = Math.min(pct, 100);
                const barColor =
                  pct < 70 ? "#10B981" : pct < 100 ? "#F59E0B" : "#EF4444";
                const remaining = budget.limit - spent;
                return (
                  <div
                    key={budget.category}
                    style={{ ...cardStyle, padding: "18px" }}
                    data-ocid={`money.budgets.item.${idx + 1}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: CATEGORY_COLORS[budget.category],
                          }}
                        />
                        <span
                          className="font-semibold text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {budget.category}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(255,255,255,0.10)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {budget.period}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium"
                          style={{ color: barColor }}
                        >
                          {remaining >= 0
                            ? `${formatAmount(remaining)} remaining`
                            : `${formatAmount(Math.abs(remaining))} over budget`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setBudgets((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                            playSfxDelete();
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            color: "#EF4444",
                          }}
                          data-ocid={`money.budgets.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div
                      className="relative h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.12)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${clampedPct}%`,
                          background: barColor,
                          boxShadow: `0 0 8px ${barColor}66`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Spent: {formatAmount(spent)}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Limit: {formatAmount(budget.limit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Budget Forecast */}
          {(() => {
            const now = new Date();
            const dayOfMonth = now.getDate();
            const daysInMonth = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
            ).getDate();
            const thisMonthExpenses = expenses.filter((e) => {
              const d = new Date(e.date);
              return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            });
            const totalThisMonth = thisMonthExpenses.reduce(
              (s, e) => s + e.amount,
              0,
            );
            const projectedMonthly =
              dayOfMonth > 0 ? (totalThisMonth / dayOfMonth) * daysInMonth : 0;
            const totalBudgetLimit = budgets.reduce(
              (s, b) => (b.period === "monthly" ? s + b.limit : s),
              0,
            );
            const budgetPct =
              totalBudgetLimit > 0
                ? (projectedMonthly / totalBudgetLimit) * 100
                : 0;
            const forecastColor =
              budgetPct < 80
                ? "#10B981"
                : budgetPct < 100
                  ? "#F59E0B"
                  : "#EF4444";
            const forecastLabel =
              budgetPct < 80
                ? "On track"
                : budgetPct < 100
                  ? "Approaching limit"
                  : "Over budget";
            return (
              <div
                style={{
                  ...cardStyle,
                  padding: "20px",
                  marginTop: 16,
                  border: `1px solid ${forecastColor}33`,
                }}
              >
                <p
                  className="text-sm font-bold mb-3"
                  style={{ color: forecastColor }}
                >
                  Budget Forecast
                </p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Spent so far
                    </p>
                    <p
                      className="text-base font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatAmount(totalThisMonth)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Projected month end
                    </p>
                    <p
                      className="text-base font-bold"
                      style={{ color: forecastColor }}
                    >
                      {formatAmount(Math.round(projectedMonthly))}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Status
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: forecastColor }}
                    >
                      {forecastLabel}
                    </p>
                  </div>
                </div>
                {totalBudgetLimit > 0 ? (
                  <>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.12)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, budgetPct)}%`,
                          background: forecastColor,
                          boxShadow: `0 0 8px ${forecastColor}66`,
                        }}
                      />
                    </div>
                    <p
                      className="text-xs mt-1.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {Math.round(budgetPct)}% of monthly budget (
                      {formatAmount(totalBudgetLimit)} limit) projected
                    </p>
                  </>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Set monthly budgets above to see percentage forecast
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && (
        <div style={slideInStyle}>
          <div className="grid grid-cols-2 gap-5">
            <div style={{ ...cardStyle, padding: "24px" }}>
              <p
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Expenses by Category
              </p>
              {categoryData.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    textAlign: "center",
                    padding: "32px 0",
                  }}
                >
                  No expense data yet
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              CATEGORY_COLORS[entry.name as ExpenseCategory] ??
                              "#6B7280"
                            }
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {categoryData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              CATEGORY_COLORS[d.name as ExpenseCategory],
                          }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {d.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ ...cardStyle, padding: "24px" }}>
              <p
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Income vs Expenses (6 months)
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barGap={4}>
                  <XAxis
                    dataKey="label"
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
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#10B981" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Income
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#EF4444" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Expenses
                  </span>
                </div>
              </div>
            </div>
          </div>

          {totalExpenses > 0 && totalIncome > 0 && (
            <div
              style={{
                ...cardStyle,
                padding: "20px",
                marginTop: "16px",
                borderColor:
                  netBalance >= 0
                    ? "rgba(16,185,129,0.2)"
                    : "rgba(239,68,68,0.2)",
              }}
            >
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: netBalance >= 0 ? "#10B981" : "#EF4444" }}
              >
                Saving Insight
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {netBalance >= 0
                  ? `You're saving ${((netBalance / totalIncome) * 100).toFixed(1)}% of your income. Keep it up!`
                  : `Your expenses exceed income by ${formatAmount(Math.abs(netBalance))}. Consider reviewing your top spending category.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
