import { ChevronRight, Play, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Priority, TaskState } from "../../backend";
import type { TaskWithId } from "../../hooks/useTasks";

interface TaskCardProps {
  task: TaskWithId;
  onUpdate: (localId: number, updates: Partial<TaskWithId>) => void;
  onDelete: (localId: number) => void;
  onStartFocus?: (localId: number) => void;
  isActive?: boolean;
}

const priorityConfig: Record<
  Priority,
  { label: string; color: string; border: string }
> = {
  [Priority.Urgent]: {
    label: "Urgent",
    color: "#FF4757",
    border: "rgba(255,71,87,0.4)",
  },
  [Priority.High]: {
    label: "High",
    color: "#22C1FF",
    border: "rgba(34,193,255,0.4)",
  },
  [Priority.Medium]: {
    label: "Medium",
    color: "#F0A13A",
    border: "rgba(240,161,58,0.4)",
  },
  [Priority.Low]: {
    label: "Low",
    color: "#2BD67B",
    border: "rgba(43,214,123,0.4)",
  },
};

const stateConfig: Record<TaskState, { label: string; color: string }> = {
  [TaskState.NotStarted]: { label: "Not Started", color: "#6E7C8F" },
  [TaskState.InProgress]: { label: "In Progress", color: "#22C1FF" },
  [TaskState.Completed]: { label: "Completed", color: "#2BD67B" },
  [TaskState.Overtime]: { label: "Overtime", color: "#FF4757" },
};

function extractYouTubeLink(notes?: string): string | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed.youtubeLink || null;
  } catch {
    return null;
  }
}

export function TaskCard({
  task,
  onUpdate,
  onDelete,
  onStartFocus,
  isActive,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.name);
  const [hovered, setHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const p = priorityConfig[task.priority];
  const s = stateConfig[task.state];
  const youtubeLink = extractYouTubeLink(task.notes);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const saveEdit = () => {
    if (editValue.trim() && editValue !== task.name) {
      onUpdate(task._localId, { name: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(task._localId), 280);
  };

  const handleToggleComplete = () => {
    const next =
      task.state === TaskState.Completed
        ? TaskState.NotStarted
        : TaskState.Completed;
    if (next === TaskState.Completed) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 450);
    }
    onUpdate(task._localId, { state: next });
  };

  const truncateUrl = (url: string, max = 28) =>
    url.length > max ? `${url.slice(0, max)}\u2026` : url;

  return (
    <div
      className={`rounded-xl p-3 transition-all duration-200 animate-slide-in-up ${
        isDeleting ? "animate-fade-out-shrink" : ""
      } ${justCompleted ? "animate-complete-tick" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${
          isActive
            ? p.border
            : hovered
              ? "rgba(34,193,255,0.18)"
              : "var(--border-color)"
        }`,
        boxShadow: isActive
          ? `0 0 12px ${p.color}22`
          : hovered
            ? "0 4px 20px rgba(34,193,255,0.06), 0 2px 8px rgba(0,0,0,0.25)"
            : "none",
        transform: hovered && !isDeleting ? "translateY(-1px)" : "none",
        overflow: isDeleting ? "hidden" : undefined,
      }}
      data-ocid="tasks.item"
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          className="w-4 h-4 mt-0.5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all"
          style={{
            borderColor:
              task.state === TaskState.Completed
                ? "#2BD67B"
                : "var(--border-color)",
            background:
              task.state === TaskState.Completed ? "#2BD67B" : "transparent",
            minHeight: 44,
            minWidth: 44,
            margin: "-14px 0 -14px -14px",
            padding: "14px",
          }}
          data-ocid="tasks.checkbox"
        >
          {task.state === TaskState.Completed && (
            <ChevronRight className="w-2.5 h-2.5 text-black" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") {
                  setEditValue(task.name);
                  setIsEditing(false);
                }
              }}
              className="w-full bg-transparent text-sm font-medium outline-none border-b"
              style={{
                color: "var(--text-primary)",
                borderColor: "var(--accent-cyan)",
              }}
              data-ocid="tasks.input"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium cursor-text truncate text-left w-full"
              style={{
                color:
                  task.state === TaskState.Completed
                    ? "var(--text-muted)"
                    : "var(--text-primary)",
                textDecoration:
                  task.state === TaskState.Completed ? "line-through" : "none",
              }}
            >
              {task.name}
            </button>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {Number(task.effortTracks)}\u03c4
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ color: s.color, background: `${s.color}20` }}
            >
              {s.label}
            </span>
            {youtubeLink && (
              <span
                className="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,0,0,0.1)",
                  color: "#ff6b6b",
                  border: "1px solid rgba(255,0,0,0.2)",
                }}
                title={youtubeLink}
              >
                \uD83C\uDFB5 {truncateUrl(youtubeLink)}
              </span>
            )}
          </div>
        </div>

        {/* Priority badge + actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              color: p.color,
              background: `${p.color}20`,
              border: `1px solid ${p.border}`,
            }}
          >
            {p.label}
          </span>
          {hovered && onStartFocus && task.state !== TaskState.Completed && (
            <button
              type="button"
              onClick={() => onStartFocus(task._localId)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, #22C1FF, #2D7CFF)",
                color: "#05080D",
                boxShadow: "0 0 0 0 rgba(34,193,255,0)",
                transition:
                  "transform 150ms var(--ease-spring), box-shadow 200ms var(--ease-smooth)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.07)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 14px rgba(34,193,255,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 0 0 rgba(34,193,255,0)";
              }}
              data-ocid="tasks.primary_button"
            >
              <Play className="w-3 h-3" /> Focus
            </button>
          )}
          {hovered && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 rounded opacity-60 hover:opacity-100"
              style={{
                transition: "opacity 150ms, transform 150ms var(--ease-spring)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
              data-ocid="tasks.delete_button"
            >
              <Trash2
                className="w-3.5 h-3.5"
                style={{ color: "var(--accent-red)" }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
