import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";

export interface LocalTask {
  id: string;
  name: string;
  youtubeLink: string;
  duration: number; // minutes
  status: "pending" | "completed";
  createdAt: number;
  category?: string;
  priority?: "high" | "medium" | "low";
}

interface TaskContextValue {
  tasks: LocalTask[];
  addTask: (
    name: string,
    youtubeLink: string,
    duration: number,
    category?: string,
    priority?: "high" | "medium" | "low",
  ) => void;
  updateTask: (id: string, partial: Partial<LocalTask>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  reorderTasks: (newOrder: LocalTask[]) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

const STORAGE_KEY = "musc_tasks";
const RESET_KEY = "musc_last_reset";

function loadFromStorage(): LocalTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalTask[];
  } catch {
    return [];
  }
}

function saveToStorage(tasks: LocalTask[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // silently fail
  }
}

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function applyMidnightReset(tasks: LocalTask[]): LocalTask[] {
  try {
    const lastReset = localStorage.getItem(RESET_KEY);
    const today = getTodayDateString();
    if (lastReset !== today) {
      localStorage.setItem(RESET_KEY, today);
      return tasks.filter((t) => t.status !== "completed");
    }
  } catch {
    // ignore
  }
  return tasks;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasksState] = useState<LocalTask[]>(() => {
    const stored = loadFromStorage();
    return applyMidnightReset(stored);
  });
  const { actor } = useActor();

  const setTasks = useCallback(
    (updater: LocalTask[] | ((prev: LocalTask[]) => LocalTask[])) => {
      setTasksState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveToStorage(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!actor) return;
  }, [actor]);

  const addTask = useCallback(
    (
      name: string,
      youtubeLink: string,
      duration: number,
      category?: string,
      priority?: "high" | "medium" | "low",
    ) => {
      const newTask: LocalTask = {
        id: Date.now().toString(),
        name: name.trim(),
        youtubeLink: youtubeLink.trim(),
        duration: duration || 25,
        status: "pending",
        createdAt: Date.now(),
        category: category?.trim() || undefined,
        priority: priority ?? "medium",
      };
      setTasks((prev) => [newTask, ...prev]);

      if (actor) {
        try {
          const backendTask = {
            name: newTask.name,
            effortTracks: BigInt(Math.ceil(duration / 5)),
            priority: { Medium: null } as any,
            state: { NotStarted: null } as any,
            createdAt: BigInt(Date.now()),
            deadline: [] as any,
            notes: [
              JSON.stringify({ youtubeLink: newTask.youtubeLink }),
            ] as any,
          };
          actor.createTask(backendTask).catch(() => {});
        } catch {
          // silently ignore
        }
      }
    },
    [actor, setTasks],
  );

  const updateTask = useCallback(
    (id: string, partial: Partial<LocalTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...partial } : t)),
      );
    },
    [setTasks],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [setTasks],
  );

  const completeTask = useCallback(
    (id: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t)),
      );
    },
    [setTasks],
  );

  const reorderTasks = useCallback(
    (newOrder: LocalTask[]) => {
      setTasks(newOrder);
    },
    [setTasks],
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        reorderTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be used within TaskProvider");
  return ctx;
}
