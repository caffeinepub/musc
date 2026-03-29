import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart2,
  Calendar,
  CheckSquare,
  DollarSign,
  Gamepad2,
  LayoutDashboard,
  Settings,
  Volume2,
  VolumeX,
  Youtube,
  Zap,
} from "lucide-react";
import type { Page } from "../../App";
import { useSFXContext } from "../../context/SFXContext";

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  { id: "focus", label: "Focus", icon: <Zap className="w-4 h-4" /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="w-4 h-4" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { id: "review", label: "Review", icon: <BarChart2 className="w-4 h-4" /> },
  { id: "money", label: "Money", icon: <DollarSign className="w-4 h-4" /> },
  { id: "games", label: "Games 🎮", icon: <Gamepad2 className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export interface TopNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function TopNav({ currentPage, onNavigate }: TopNavProps) {
  const { isMuted, toggleMute } = useSFXContext();
  const ytLabel =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("yt_current_label")
      : null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 hidden md:flex items-center"
      style={{
        height: 56,
        background: "rgba(0,0,0,0.94)",
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 2px 32px rgba(0,0,0,0.5)",
        paddingLeft: 20,
        paddingRight: 20,
        gap: 16,
      }}
    >
      {/* Logo — left */}
      <button
        type="button"
        className="flex-shrink-0 bg-transparent border-0 p-0 cursor-pointer"
        style={{ transition: "filter 250ms ease, transform 200ms ease" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.filter = "drop-shadow(0 0 16px rgba(255,255,255,0.75))";
          el.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.filter = "drop-shadow(0 0 4px rgba(255,255,255,0.28))";
          el.style.transform = "scale(1)";
        }}
        onClick={() => onNavigate("dashboard")}
        aria-label="Go to dashboard"
        data-ocid="nav.logo.link"
      >
        <img
          src="/assets/generated/musc-logo-bw-transparent.dim_400x160.png"
          alt="musc"
          style={{
            width: 80,
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 0 4px rgba(255,255,255,0.28))",
          }}
        />
      </button>

      {/* Nav pill group — center */}
      <nav
        className="flex-1 flex items-center justify-center"
        aria-label="Main navigation"
      >
        <div
          className="flex items-center gap-1 p-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-[10px]"
                style={{
                  padding: "5px 10px",
                  background: isActive
                    ? "rgba(255,255,255,0.22)"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(255,255,255,0.42)"
                    : "1px solid transparent",
                  color: isActive ? "#f2f6ff" : "rgba(255,255,255,0.5)",
                  boxShadow: isActive
                    ? "0 0 16px rgba(255,255,255,0.28)"
                    : "none",
                  transition:
                    "background 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.color = "rgba(255,255,255,0.85)";
                    el.style.background = "rgba(255,255,255,0.07)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.color = "rgba(255,255,255,0.4)";
                    el.style.background = "transparent";
                  }
                }}
                data-ocid={`nav.${item.id}.link`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right controls */}
      <TooltipProvider delayDuration={300}>
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* SFX mute toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleMute}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{
                  background: isMuted
                    ? "rgba(255,71,87,0.1)"
                    : "rgba(255,255,255,0.10)",
                  border: `1px solid ${
                    isMuted ? "rgba(255,71,87,0.3)" : "rgba(255,255,255,0.28)"
                  }`,
                  color: isMuted ? "#ff4757" : "rgba(255,255,255,0.7)",
                  transition: "all 200ms ease",
                }}
                data-ocid="nav.sfx.toggle"
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isMuted ? "Unmute SFX" : "Mute SFX"}
            </TooltipContent>
          </Tooltip>

          {/* YouTube status indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="w-8 h-8 flex items-center justify-center rounded-lg relative"
                style={{
                  background: ytLabel
                    ? "rgba(255,71,87,0.1)"
                    : "rgba(255,255,255,0.07)",
                  border: ytLabel
                    ? "1px solid rgba(255,71,87,0.3)"
                    : "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <Youtube
                  className="w-3.5 h-3.5"
                  style={{
                    color: ytLabel ? "#ff4757" : "rgba(255,255,255,0.35)",
                  }}
                />
                {ytLabel && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#ff4757",
                      boxShadow: "0 0 6px rgba(255,71,87,0.8)",
                    }}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {ytLabel ?? "No video loaded"}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
