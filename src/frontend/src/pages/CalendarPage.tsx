import {
  ChevronLeft,
  ChevronRight,
  Link,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { useTaskContext } from "../context/TaskContext";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
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
  category: string;
  limit: number;
  period: "weekly" | "monthly";
}

type FinanceCategory =
  | "Food"
  | "Study"
  | "Subscription"
  | "Transport"
  | "Entertainment"
  | "Health"
  | "Other";
type IncomeSource = "Allowance" | "Job" | "Scholarship" | "Freelance" | "Other";

const EXPENSE_CATEGORIES: FinanceCategory[] = [
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

// ─── localStorage helpers ────────────────────────────────────────────────────
function loadExpenses(): Expense[] {
  try {
    return JSON.parse(localStorage.getItem("musc_expenses") ?? "[]");
  } catch {
    return [];
  }
}
function saveExpenses(data: Expense[]) {
  localStorage.setItem("musc_expenses", JSON.stringify(data));
}
function loadIncome(): Income[] {
  try {
    return JSON.parse(localStorage.getItem("musc_income") ?? "[]");
  } catch {
    return [];
  }
}
function saveIncome(data: Income[]) {
  localStorage.setItem("musc_income", JSON.stringify(data));
}
function loadBudgets(): Budget[] {
  try {
    return JSON.parse(localStorage.getItem("musc_budgets") ?? "[]");
  } catch {
    return [];
  }
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function CalendarPage() {
  const { formatAmount } = useCurrency();
  const { tasks } = useTaskContext();

  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [income, setIncome] = useState<Income[]>(loadIncome);
  const budgets = useMemo(() => loadBudgets(), []);

  // calendar nav
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // editing state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Partial<Expense>>({});
  const [editIncome, setEditIncome] = useState<Partial<Income>>({});

  // add forms
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: "",
    category: "Food" as FinanceCategory,
    amount: "",
    note: "",
    taskId: "",
  });
  const [newIncome, setNewIncome] = useState({
    source: "Allowance" as IncomeSource,
    amount: "",
  });

  // Compute daily budget average
  const dailyBudgetAvg = useMemo(() => {
    if (budgets.length === 0) return 50;
    const monthly = budgets
      .map((b) => (b.period === "monthly" ? b.limit : b.limit * 4))
      .reduce((a, v) => a + v, 0);
    return monthly / 30;
  }, [budgets]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // cells with stable position-based keys
  const cells: Array<{ date: Date | null; key: string }> = [
    ...Array(firstDay)
      .fill(null)
      .map((_: null, i: number) => ({
        date: null,
        key: `pad-${viewYear}-${viewMonth}-${i}`,
      })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      date: new Date(viewYear, viewMonth, i + 1),
      key: `day-${viewYear}-${viewMonth}-${i + 1}`,
    })),
  ];
  // pad to complete rows
  while (cells.length % 7 !== 0)
    cells.push({
      date: null,
      key: `trail-${viewYear}-${viewMonth}-${cells.length}`,
    });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(
    "default",
    { month: "long", year: "numeric" },
  );

  // Per-day aggregates
  const dayExpenses = useCallback(
    (dateStr: string) => expenses.filter((e) => e.date === dateStr),
    [expenses],
  );
  const dayIncome = useCallback(
    (dateStr: string) => income.filter((i) => i.date === dateStr),
    [income],
  );

  const dayExpenseTotal = (dateStr: string) =>
    dayExpenses(dateStr).reduce((s, e) => s + e.amount, 0);
  const dayIncomeTotal = (dateStr: string) =>
    dayIncome(dateStr).reduce((s, i) => s + i.amount, 0);
  const hasTaskLink = (dateStr: string) =>
    dayExpenses(dateStr).some(
      (e) => e.taskId && tasks.some((t) => t.id === e.taskId),
    );

  const dayBg = (dateStr: string) => {
    const total = dayExpenseTotal(dateStr);
    if (total === 0) return "transparent";
    const pct = total / dailyBudgetAvg;
    if (pct < 0.7) return "rgba(43,222,123,0.08)";
    if (pct <= 1) return "rgba(255,209,102,0.12)";
    return "rgba(255,71,87,0.1)";
  };

  const todayStr = toDateStr(today);

  // ── CRUD helpers ────────────────────────────────────────────────────────────
  const mutateExpenses = (next: Expense[]) => {
    saveExpenses(next);
    setExpenses(next);
  };
  const mutateIncome = (next: Income[]) => {
    saveIncome(next);
    setIncome(next);
  };

  const deleteExpense = (id: string) =>
    mutateExpenses(expenses.filter((e) => e.id !== id));
  const deleteIncomeItem = (id: string) =>
    mutateIncome(income.filter((i) => i.id !== id));

  const startEditExpense = (e: Expense) => {
    setEditingExpenseId(e.id);
    setEditExpense({ ...e });
  };
  const saveEditExpense = () => {
    if (!editingExpenseId) return;
    mutateExpenses(
      expenses.map((e) =>
        e.id === editingExpenseId ? ({ ...e, ...editExpense } as Expense) : e,
      ),
    );
    setEditingExpenseId(null);
  };

  const startEditIncome = (i: Income) => {
    setEditingIncomeId(i.id);
    setEditIncome({ ...i });
  };
  const saveEditIncome = () => {
    if (!editingIncomeId) return;
    mutateIncome(
      income.map((i) =>
        i.id === editingIncomeId ? ({ ...i, ...editIncome } as Income) : i,
      ),
    );
    setEditingIncomeId(null);
  };

  const addExpenseItem = () => {
    if (!newExpense.name.trim() || !newExpense.amount || !selectedDate) return;
    const item: Expense = {
      id: Date.now().toString(),
      name: newExpense.name.trim(),
      category: newExpense.category,
      amount: Number.parseFloat(newExpense.amount),
      date: selectedDate,
      note: newExpense.note.trim() || undefined,
      taskId: newExpense.taskId || undefined,
    };
    mutateExpenses([...expenses, item]);
    setNewExpense({
      name: "",
      category: "Food",
      amount: "",
      note: "",
      taskId: "",
    });
    setShowAddExpense(false);
  };

  const addIncomeItem = () => {
    if (!newIncome.amount || !selectedDate) return;
    const item: Income = {
      id: Date.now().toString(),
      source: newIncome.source,
      amount: Number.parseFloat(newIncome.amount),
      date: selectedDate,
    };
    mutateIncome([...income, item]);
    setNewIncome({ source: "Allowance", amount: "" });
    setShowAddIncome(false);
  };

  // ── Shared input style ───────────────────────────────────────────────────────
  const inputStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    padding: "6px 10px",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  };
  const selectStyle = { ...inputStyle };

  const selectedDateItems = selectedDate
    ? {
        expenses: dayExpenses(selectedDate),
        income: dayIncome(selectedDate),
      }
    : null;

  return (
    <div className="p-3 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Usage note */}
      <div
        className="mb-6 px-4 py-3 rounded-xl text-sm"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "var(--text-secondary)",
        }}
      >
        See your spending at a glance! Track your daily expenses, income, and
        task-linked costs right on your calendar. 📅
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {monthLabel}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-xl transition-all"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
            data-ocid="calendar.pagination_prev"
          >
            <ChevronLeft
              className="w-4 h-4"
              style={{ color: "var(--text-secondary)" }}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.28)",
              color: "var(--accent-cyan)",
            }}
            data-ocid="calendar.today.button"
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-xl transition-all"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
            data-ocid="calendar.pagination_next"
          >
            <ChevronRight
              className="w-4 h-4"
              style={{ color: "var(--text-secondary)" }}
            />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 mb-1.5">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold py-1"
            style={{ color: "var(--text-muted)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
        {cells.map(({ date, key: cellKey }) => {
          if (!date)
            return (
              <div
                key={cellKey}
                className="rounded-xl"
                style={{ minHeight: 80 }}
              />
            );
          const ds = toDateStr(date);
          const expTotal = dayExpenseTotal(ds);
          const incTotal = dayIncomeTotal(ds);
          const taskLinked = hasTaskLink(ds);
          const isToday = ds === todayStr;
          const bg = dayBg(ds);
          const isHovered = hoverDate === ds;
          const expForDay = dayExpenses(ds);

          return (
            <button
              type="button"
              key={ds}
              className="relative rounded-xl cursor-pointer transition-all text-left"
              style={{
                minHeight: 80,
                background: isHovered
                  ? bg === "transparent"
                    ? "rgba(255,255,255,0.05)"
                    : bg
                  : bg === "transparent"
                    ? "rgba(255,255,255,0.05)"
                    : bg,
                border: isToday
                  ? "1.5px solid rgba(255,255,255,0.65)"
                  : "1px solid rgba(255,255,255,0.10)",
                boxShadow: isToday
                  ? "0 0 12px rgba(255,255,255,0.18)"
                  : isHovered
                    ? "0 0 8px rgba(255,255,255,0.10)"
                    : "none",
                transition: "all 180ms ease",
              }}
              onClick={() => setSelectedDate(ds)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedDate(ds);
              }}
              onMouseEnter={() => setHoverDate(ds)}
              onMouseLeave={() => setHoverDate(null)}
              data-ocid={`calendar.item.${date.getDate()}`}
            >
              <div className="p-2">
                <span
                  className="text-xs font-bold"
                  style={{
                    color: isToday
                      ? "var(--accent-cyan)"
                      : "var(--text-secondary)",
                  }}
                >
                  {date.getDate()}
                </span>
                {expTotal > 0 && (
                  <div
                    className="text-xs mt-0.5 font-medium"
                    style={{ color: "#ff6b7a" }}
                  >
                    -{formatAmount(expTotal)}
                  </div>
                )}
                {incTotal > 0 && (
                  <div
                    className="text-xs font-medium"
                    style={{ color: "#2bd67b" }}
                  >
                    +{formatAmount(incTotal)}
                  </div>
                )}
                {taskLinked && <div className="text-xs mt-0.5">🔗</div>}
              </div>

              {/* Hover tooltip */}
              {isHovered && expForDay.length > 0 && (
                <div
                  className="absolute z-30 left-full ml-1 top-0 w-44 rounded-xl p-2.5 pointer-events-none"
                  style={{
                    background: "rgba(11,18,32,0.95)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  <p
                    className="text-xs font-semibold mb-1.5"
                    style={{ color: "var(--accent-cyan)" }}
                  >
                    Expenses
                  </p>
                  {expForDay.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="flex justify-between text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span className="truncate mr-2">{e.name}</span>
                      <span style={{ color: "#ff6b7a" }}>
                        {formatAmount(e.amount)}
                      </span>
                    </div>
                  ))}
                  {expForDay.length > 3 && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      +{expForDay.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDate && selectedDateItems && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedDate(null);
                setShowAddExpense(false);
                setShowAddIncome(false);
                setEditingExpenseId(null);
                setEditingIncomeId(null);
              }
            }}
            data-ocid="calendar.modal"
          >
            <motion.div
              className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl"
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{
                background: "rgba(11,18,32,0.98)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
              }}
            >
              {/* Modal header */}
              <div
                className="sticky top-0 flex items-center justify-between p-4 pb-3"
                style={{
                  background: "rgba(11,18,32,0.98)",
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <h2
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                    "default",
                    { weekday: "long", month: "long", day: "numeric" },
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null);
                    setShowAddExpense(false);
                    setShowAddIncome(false);
                  }}
                  className="p-1.5 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.09)",
                    color: "var(--text-muted)",
                  }}
                  data-ocid="calendar.close_button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Expenses */}
                <section>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Expenses
                  </p>
                  {selectedDateItems.expenses.length === 0 && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                      data-ocid="calendar.expenses.empty_state"
                    >
                      No expenses for this day.
                    </p>
                  )}
                  {selectedDateItems.expenses.map((e, idx) => (
                    <div
                      key={e.id}
                      className="mb-2 p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                      data-ocid={`calendar.expense.item.${idx + 1}`}
                    >
                      {editingExpenseId === e.id ? (
                        <div className="space-y-2">
                          <input
                            style={inputStyle}
                            value={editExpense.name ?? e.name}
                            onChange={(ev) =>
                              setEditExpense((p) => ({
                                ...p,
                                name: ev.target.value,
                              }))
                            }
                            placeholder="Name"
                          />
                          <select
                            style={selectStyle}
                            value={editExpense.category ?? e.category}
                            onChange={(ev) =>
                              setEditExpense((p) => ({
                                ...p,
                                category: ev.target.value,
                              }))
                            }
                          >
                            {EXPENSE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <input
                            style={inputStyle}
                            type="number"
                            value={editExpense.amount ?? e.amount}
                            onChange={(ev) =>
                              setEditExpense((p) => ({
                                ...p,
                                amount: Number.parseFloat(ev.target.value),
                              }))
                            }
                            placeholder="Amount"
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={saveEditExpense}
                              className="text-xs px-3 py-1 rounded-lg"
                              style={{
                                background: "rgba(255,255,255,0.18)",
                                color: "var(--accent-cyan)",
                              }}
                              data-ocid="calendar.expense.save_button"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingExpenseId(null)}
                              className="text-xs px-3 py-1 rounded-lg"
                              style={{
                                background: "rgba(255,255,255,0.09)",
                                color: "var(--text-muted)",
                              }}
                              data-ocid="calendar.expense.cancel_button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-xs font-semibold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {e.name}
                              </span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  background: "rgba(255,255,255,0.10)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {e.category}
                              </span>
                              {e.taskId && (
                                <Link
                                  className="w-3 h-3"
                                  style={{ color: "var(--accent-cyan)" }}
                                />
                              )}
                            </div>
                            <span
                              className="text-xs font-bold"
                              style={{ color: "#ff6b7a" }}
                            >
                              -{formatAmount(e.amount)}
                            </span>
                            {e.note && (
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {e.note}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditExpense(e)}
                              className="p-1 rounded"
                              style={{ color: "var(--text-muted)" }}
                              data-ocid={`calendar.expense.edit_button.${idx + 1}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteExpense(e.id)}
                              className="p-1 rounded"
                              style={{ color: "#ff6b7a" }}
                              data-ocid={`calendar.expense.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </section>

                {/* Income */}
                <section>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Income
                  </p>
                  {selectedDateItems.income.length === 0 && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                      data-ocid="calendar.income.empty_state"
                    >
                      No income for this day.
                    </p>
                  )}
                  {selectedDateItems.income.map((i, idx) => (
                    <div
                      key={i.id}
                      className="mb-2 p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                      data-ocid={`calendar.income.item.${idx + 1}`}
                    >
                      {editingIncomeId === i.id ? (
                        <div className="space-y-2">
                          <select
                            style={selectStyle}
                            value={editIncome.source ?? i.source}
                            onChange={(ev) =>
                              setEditIncome((p) => ({
                                ...p,
                                source: ev.target.value,
                              }))
                            }
                          >
                            {INCOME_SOURCES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <input
                            style={inputStyle}
                            type="number"
                            value={editIncome.amount ?? i.amount}
                            onChange={(ev) =>
                              setEditIncome((p) => ({
                                ...p,
                                amount: Number.parseFloat(ev.target.value),
                              }))
                            }
                            placeholder="Amount"
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={saveEditIncome}
                              className="text-xs px-3 py-1 rounded-lg"
                              style={{
                                background: "rgba(255,255,255,0.18)",
                                color: "var(--accent-cyan)",
                              }}
                              data-ocid="calendar.income.save_button"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIncomeId(null)}
                              className="text-xs px-3 py-1 rounded-lg"
                              style={{
                                background: "rgba(255,255,255,0.09)",
                                color: "var(--text-muted)",
                              }}
                              data-ocid="calendar.income.cancel_button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {i.source}
                            </span>
                            <span
                              className="text-xs font-bold ml-2"
                              style={{ color: "#2bd67b" }}
                            >
                              +{formatAmount(i.amount)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => startEditIncome(i)}
                              className="p-1 rounded"
                              style={{ color: "var(--text-muted)" }}
                              data-ocid={`calendar.income.edit_button.${idx + 1}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteIncomeItem(i.id)}
                              className="p-1 rounded"
                              style={{ color: "#ff6b7a" }}
                              data-ocid={`calendar.income.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </section>

                {/* Add Expense inline form */}
                <div>
                  {!showAddExpense ? (
                    <button
                      type="button"
                      onClick={() => setShowAddExpense(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl w-full"
                      style={{
                        background: "rgba(255,107,122,0.08)",
                        border: "1px solid rgba(255,107,122,0.2)",
                        color: "#ff6b7a",
                      }}
                      data-ocid="calendar.expense.open_modal_button"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Expense
                    </button>
                  ) : (
                    <div
                      className="p-3 rounded-xl space-y-2"
                      style={{
                        background: "rgba(255,107,122,0.05)",
                        border: "1px solid rgba(255,107,122,0.15)",
                      }}
                    >
                      <input
                        style={inputStyle}
                        placeholder="Expense name"
                        value={newExpense.name}
                        onChange={(e) =>
                          setNewExpense((p) => ({ ...p, name: e.target.value }))
                        }
                        data-ocid="calendar.expense.input"
                      />
                      <select
                        style={selectStyle}
                        value={newExpense.category}
                        onChange={(e) =>
                          setNewExpense((p) => ({
                            ...p,
                            category: e.target.value as FinanceCategory,
                          }))
                        }
                        data-ocid="calendar.expense.select"
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        style={inputStyle}
                        type="number"
                        placeholder="Amount"
                        value={newExpense.amount}
                        onChange={(e) =>
                          setNewExpense((p) => ({
                            ...p,
                            amount: e.target.value,
                          }))
                        }
                      />
                      <input
                        style={inputStyle}
                        placeholder="Note (optional)"
                        value={newExpense.note}
                        onChange={(e) =>
                          setNewExpense((p) => ({ ...p, note: e.target.value }))
                        }
                      />
                      <select
                        style={selectStyle}
                        value={newExpense.taskId}
                        onChange={(e) =>
                          setNewExpense((p) => ({
                            ...p,
                            taskId: e.target.value,
                          }))
                        }
                        data-ocid="calendar.expense.task.select"
                      >
                        <option value="">Link to task (optional)</option>
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addExpenseItem}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: "rgba(255,107,122,0.15)",
                            color: "#ff6b7a",
                          }}
                          data-ocid="calendar.expense.submit_button"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddExpense(false)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: "rgba(255,255,255,0.09)",
                            color: "var(--text-muted)",
                          }}
                          data-ocid="calendar.expense.cancel_button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Income inline form */}
                <div>
                  {!showAddIncome ? (
                    <button
                      type="button"
                      onClick={() => setShowAddIncome(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl w-full"
                      style={{
                        background: "rgba(43,214,123,0.08)",
                        border: "1px solid rgba(43,214,123,0.2)",
                        color: "#2bd67b",
                      }}
                      data-ocid="calendar.income.open_modal_button"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Income
                    </button>
                  ) : (
                    <div
                      className="p-3 rounded-xl space-y-2"
                      style={{
                        background: "rgba(43,214,123,0.05)",
                        border: "1px solid rgba(43,214,123,0.15)",
                      }}
                    >
                      <select
                        style={selectStyle}
                        value={newIncome.source}
                        onChange={(e) =>
                          setNewIncome((p) => ({
                            ...p,
                            source: e.target.value as IncomeSource,
                          }))
                        }
                        data-ocid="calendar.income.select"
                      >
                        {INCOME_SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        style={inputStyle}
                        type="number"
                        placeholder="Amount"
                        value={newIncome.amount}
                        onChange={(e) =>
                          setNewIncome((p) => ({
                            ...p,
                            amount: e.target.value,
                          }))
                        }
                        data-ocid="calendar.income.input"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addIncomeItem}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: "rgba(43,214,123,0.15)",
                            color: "#2bd67b",
                          }}
                          data-ocid="calendar.income.submit_button"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddIncome(false)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: "rgba(255,255,255,0.09)",
                            color: "var(--text-muted)",
                          }}
                          data-ocid="calendar.income.cancel_button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
