import {
  BarChart2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  Settings,
  Volume2,
  VolumeX,
  Youtube,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../../App";
import { useSFXContext } from "../../context/SFXContext";

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  { id: "focus", label: "Focus Session", icon: <Zap className="w-4 h-4" /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="w-4 h-4" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { id: "review", label: "Review", icon: <BarChart2 className="w-4 h-4" /> },
  { id: "money", label: "Money", icon: <DollarSign className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggle,
}: SidebarProps) {
  const { isMuted, toggleMute } = useSFXContext();
  const ytLabel = localStorage.getItem("yt_current_label");

  const width = isCollapsed ? "56px" : "240px";

  return (
    <aside
      className="fixed left-0 top-0 h-screen hidden md:flex flex-col z-50 overflow-hidden"
      style={{
        width,
        transition: "width 250ms cubic-bezier(0.4,0,0.2,1)",
        background: "rgba(8, 13, 24, 0.92)",
        backdropFilter: "blur(24px) saturate(1.6)",
        WebkitBackdropFilter: "blur(24px) saturate(1.6)",
        borderRight: "1px solid rgba(34,193,255,0.08)",
        boxShadow: "2px 0 24px rgba(5,22,26,0.4)",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center overflow-hidden"
        style={{
          height: 72,
          paddingLeft: isCollapsed ? 0 : 16,
          justifyContent: isCollapsed ? "center" : "flex-start",
          transition: "padding 250ms cubic-bezier(0.4,0,0.2,1)",
          borderBottom: "1px solid rgba(34,193,255,0.06)",
        }}
      >
        {isCollapsed ? (
          <img
            src="/assets/generated/musc-icon-transparent.dim_256x256.png"
            alt="musc"
            style={{
              width: 28,
              height: 28,
              objectFit: "contain",
              filter: "drop-shadow(0 0 6px rgba(34,193,255,0.6))",
            }}
          />
        ) : (
          <div
            style={{ transition: "filter 250ms ease, transform 200ms ease" }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.filter = "drop-shadow(0 0 12px rgba(34,193,255,0.8))";
              el.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.filter = "drop-shadow(0 0 4px rgba(34,193,255,0.2))";
              el.style.transform = "scale(1)";
            }}
          >
            <img
              src="/assets/generated/musc-logo-transparent.dim_400x160.png"
              alt="musc"
              style={{
                width: 96,
                objectFit: "contain",
                display: "block",
                filter: "drop-shadow(0 0 4px rgba(34,193,255,0.2))",
              }}
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-hidden">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? item.label : undefined}
              className="w-full flex items-center rounded-xl mb-1 text-sm font-medium"
              style={{
                gap: isCollapsed ? 0 : 12,
                padding: isCollapsed ? "10px 0" : "10px 12px",
                justifyContent: isCollapsed ? "center" : "flex-start",
                background: isActive
                  ? "rgba(34, 193, 255, 0.12)"
                  : "transparent",
                color: isActive
                  ? "var(--accent-cyan)"
                  : "var(--text-secondary)",
                borderLeft: `3px solid ${isActive ? "var(--accent-cyan)" : "transparent"}`,
                boxShadow: isActive ? "0 0 20px rgba(34,193,255,0.1)" : "none",
                transition:
                  "background 200ms var(--ease-smooth), color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth), box-shadow 200ms var(--ease-smooth), transform 150ms var(--ease-spring), padding 250ms cubic-bezier(0.4,0,0.2,1)",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(34,193,255,0.06)";
                  el.style.color = "var(--text-primary)";
                  el.style.transform = isCollapsed
                    ? "scale(1.1)"
                    : "translateX(3px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "transparent";
                  el.style.color = "var(--text-secondary)";
                  el.style.transform = "";
                }
              }}
              data-ocid={`sidebar.${item.id}.link`}
            >
              <span
                style={{
                  color: isActive ? "var(--accent-cyan)" : "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              {!isCollapsed && item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 flex flex-col gap-2">
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full flex items-center rounded-xl py-2"
          style={{
            gap: isCollapsed ? 0 : 8,
            padding: isCollapsed ? "8px 0" : "8px 12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            background: "rgba(15,150,156,0.05)",
            border: "1px solid rgba(15,150,156,0.10)",
            color: "var(--text-muted)",
            transition: "all 200ms ease",
          }}
          data-ocid="sidebar.toggle"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>

        {/* YT status */}
        {!isCollapsed && (
          <div
            className="p-3 rounded-xl"
            style={{
              background: "rgba(15,150,156,0.05)",
              border: "1px solid rgba(15,150,156,0.10)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: ytLabel
                    ? "rgba(255,71,87,0.15)"
                    : "var(--bg-card)",
                  border: ytLabel
                    ? "1px solid rgba(255,71,87,0.3)"
                    : "1px solid rgba(15,150,156,0.10)",
                }}
              >
                <Youtube
                  className="w-3.5 h-3.5"
                  style={{ color: ytLabel ? "#ff4757" : "var(--text-muted)" }}
                />
              </div>
              <p
                className="text-xs truncate"
                style={{
                  color: ytLabel ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {ytLabel ?? "No video loaded"}
              </p>
            </div>
          </div>
        )}

        {/* YT icon only when collapsed */}
        {isCollapsed && (
          <div
            className="flex items-center justify-center w-full py-2"
            title={ytLabel ?? "No video loaded"}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: ytLabel ? "rgba(255,71,87,0.15)" : "var(--bg-card)",
                border: ytLabel
                  ? "1px solid rgba(255,71,87,0.3)"
                  : "1px solid rgba(15,150,156,0.10)",
              }}
            >
              <Youtube
                className="w-3.5 h-3.5"
                style={{ color: ytLabel ? "#ff4757" : "var(--text-muted)" }}
              />
            </div>
          </div>
        )}

        {/* SFX mute toggle */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className="flex items-center rounded-xl w-full"
          style={{
            gap: isCollapsed ? 0 : 8,
            padding: isCollapsed ? "8px 0" : "8px 12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            background: isMuted
              ? "rgba(255,71,87,0.08)"
              : "rgba(34,193,255,0.06)",
            border: `1px solid ${isMuted ? "rgba(255,71,87,0.25)" : "rgba(34,193,255,0.2)"}`,
            color: isMuted ? "var(--accent-red)" : "var(--accent-cyan)",
            transition:
              "background 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth), transform 150ms var(--ease-spring)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
          data-ocid="sidebar.sfx.toggle"
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
          {!isCollapsed && (
            <span className="text-xs">
              {isMuted ? "Sound muted" : "Sound on"}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
