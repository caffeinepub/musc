import { useCallback, useEffect, useState } from "react";
import type { Task } from "../backend";
import { Priority, TaskState } from "../backend";
import { useActor } from "./useActor";

export interface TaskWithId extends Task {
  _localId: number;
}

export function useTasks() {
  const { actor } = useActor();
  const [tasks, setTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [idMap, setIdMap] = useState<Map<number, bigint>>(new Map());

  const loadTasks = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const raw = await actor.getAllTasks();
      // We need backend IDs — use index as local IDs, backend uses separate ID store
      // getAllTasks returns tasks but no IDs; we track via a separate refetch pattern
      const withIds: TaskWithId[] = raw.map((t, i) => ({ ...t, _localId: i }));
      setTasks(withIds);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = useCallback(
    async (
      name: string,
      effortTracks: number,
      priority: Priority,
      deadline?: Date,
      notes?: string,
    ) => {
      if (!actor) return;
      const task: Task = {
        name,
        effortTracks: BigInt(effortTracks),
        priority,
        state: TaskState.NotStarted,
        createdAt: BigInt(Date.now()),
        deadline: deadline ? BigInt(deadline.getTime()) : undefined,
        notes,
      };
      // Optimistic update
      const tempId = Date.now();
      setTasks((prev) => [...prev, { ...task, _localId: tempId }]);
      try {
        const id = await actor.createTask(task);
        setIdMap((prev) => new Map(prev).set(tempId, id));
        await loadTasks();
      } catch {
        setTasks((prev) => prev.filter((t) => t._localId !== tempId));
      }
    },
    [actor, loadTasks],
  );

  const updateTask = useCallback(
    async (localId: number, updates: Partial<Task>) => {
      if (!actor) return;
      const task = tasks.find((t) => t._localId === localId);
      if (!task) return;
      const updated = { ...task, ...updates };
      // Optimistic
      setTasks((prev) =>
        prev.map((t) => (t._localId === localId ? { ...t, ...updates } : t)),
      );
      const backendId = idMap.get(localId) ?? BigInt(localId);
      try {
        await actor.updateTask(backendId, { ...updated });
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t._localId === localId ? task : t)),
        );
      }
    },
    [actor, tasks, idMap],
  );

  const deleteTask = useCallback(
    async (localId: number) => {
      if (!actor) return;
      setTasks((prev) => prev.filter((t) => t._localId !== localId));
      const backendId = idMap.get(localId) ?? BigInt(localId);
      try {
        await actor.deleteTask(backendId);
      } catch {
        loadTasks();
      }
    },
    [actor, idMap, loadTasks],
  );

  return { tasks, loading, createTask, updateTask, deleteTask, loadTasks };
}

export { Priority, TaskState };
