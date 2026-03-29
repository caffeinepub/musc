import {
  BarChart2,
  Calendar,
  CheckSquare,
  DollarSign,
  Gamepad2,
  LayoutDashboard,
  Loader2,
  Settings,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TopNav } from "./components/layout/TopNav";
import { CurrencyProvider } from "./context/CurrencyContext";
import { GameProvider } from "./context/GameContext";
import { SFXProvider, useSFXContext } from "./context/SFXContext";
import { TaskProvider } from "./context/TaskContext";
import { useIsMobile } from "./hooks/use-mobile";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useSession } from "./hooks/useSession";
import { CalendarPage } from "./pages/CalendarPage";
import { Dashboard } from "./pages/Dashboard";
import { FocusPage } from "./pages/FocusPage";
import { GamesPage } from "./pages/GamesPage";
import { MoneyPage } from "./pages/MoneyPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TasksPage } from "./pages/TasksPage";

export type Page =
  | "dashboard"
  | "focus"
  | "tasks"
  | "calendar"
  | "review"
  | "money"
  | "games"
  | "settings";

const mobileNavItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Home",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { id: "focus", label: "Focus", icon: <Zap className="w-5 h-5" /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { id: "calendar", label: "Cal", icon: <Calendar className="w-5 h-5" /> },
  { id: "review", label: "Review", icon: <BarChart2 className="w-5 h-5" /> },
  { id: "money", label: "Money", icon: <DollarSign className="w-5 h-5" /> },
  { id: "games", label: "Games", icon: <Gamepad2 className="w-5 h-5" /> },
  { id: "settings", label: "More", icon: <Settings className="w-5 h-5" /> },
];

function MobileBottomNav({
  currentPage,
  onNavigate,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{
        background: "rgba(0,0,0,0.97)",
        backdropFilter: "blur(24px) saturate(1.8)",
        WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        borderTop: "1px solid rgba(255,255,255,0.14)",
        boxShadow:
          "0 -8px 32px rgba(0,0,0,0.5), 0 -1px 0 rgba(255,255,255,0.10)",
        paddingBottom: "env(safe-area-inset-bottom, 4px)",
      }}
    >
      {mobileNavItems.map((item) => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 min-h-[60px] relative"
            style={{
              color: isActive ? "#ffffff" : "rgba(255,255,255,0.4)",
              transition: "color 200ms ease",
            }}
            data-ocid={`nav.${item.id}.link`}
          >
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 2,
                  borderRadius: "0 0 4px 4px",
                  background: "#ffffff",
                  boxShadow: "0 0 8px rgba(255,255,255,0.85)",
                }}
              />
            )}
            <span
              style={{
                filter: isActive
                  ? "drop-shadow(0 0 5px rgba(255,255,255,0.85))"
                  : "none",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                display: "block",
                transition:
                  "transform 150ms var(--ease-spring), filter 200ms ease",
              }}
            >
              {item.icon}
            </span>
            <span
              className="text-[9px] mt-1 font-semibold tracking-wide uppercase"
              style={{ opacity: isActive ? 1 : 0.45 }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Ambient background orbs — CSS-only, no JS, pointer-events: none */
function AmbientOrbs() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}

function AppInner() {
  const { identity, login, isInitializing } = useInternetIdentity();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const { activeSession } = useSession();
  const { playSessionStart, playButtonTap } = useSFXContext();
  const prevSessionRef = useRef<typeof activeSession>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!prevSessionRef.current && activeSession) {
      playSessionStart();
    }
    prevSessionRef.current = activeSession;
  }, [activeSession, playSessionStart]);

  // Global button SFX — fires on any button / link click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest('button, [role="button"], a');
      if (interactive) playButtonTap();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [playButtonTap]);

  if (isInitializing) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <img
              src="/assets/generated/musc-icon-bw-transparent.dim_256x256.png"
              alt="musc"
              style={{
                width: 40,
                height: 40,
                objectFit: "contain",
                filter: "drop-shadow(0 0 12px rgba(255,255,255,0.70))",
              }}
            />
          </motion.div>
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: "var(--accent-cyan)", opacity: 0.7 }}
          />
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div
        className="flex items-center justify-center min-h-screen relative overflow-hidden"
        style={{ background: "var(--bg-base)" }}
      >
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 50%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex flex-col items-center gap-8 text-center max-w-sm px-6 relative z-10"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 16px rgba(255,255,255,0.50))",
                  "drop-shadow(0 0 32px rgba(255,255,255,0.75))",
                  "drop-shadow(0 0 16px rgba(255,255,255,0.50))",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <img
                src="/assets/generated/musc-icon-bw-transparent.dim_256x256.png"
                alt="musc"
                style={{ width: 72, height: 72, objectFit: "contain" }}
              />
            </motion.div>
            <div>
              <h1
                className="text-4xl font-bold tracking-tight"
                style={{
                  background:
                    "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.02em",
                }}
              >
                musc
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
              >
                music-driven productivity
              </p>
            </div>
          </div>

          <div
            className="w-full p-6 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow:
                "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Sign in to start your focus sessions
            </p>
            <motion.button
              type="button"
              onClick={login}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 px-6 rounded-xl font-semibold text-sm"
              style={{
                background: "#ffffff",
                color: "#000000",
                boxShadow:
                  "0 0 24px rgba(255,255,255,0.42), 0 4px 12px rgba(0,0,0,0.3)",
                letterSpacing: "0.01em",
              }}
              data-ocid="login.primary_button"
            >
              Sign in with Internet Identity
            </motion.button>
          </div>

          <p
            className="text-xs"
            style={{ color: "var(--text-muted)", opacity: 0.6 }}
          >
            Secure, decentralized authentication powered by ICP
          </p>
        </motion.div>
      </div>
    );
  }

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard onNavigate={setCurrentPage} />,
    focus: <FocusPage />,
    tasks: <TasksPage onNavigate={setCurrentPage} />,
    calendar: <CalendarPage />,
    review: <ReviewPage />,
    money: <MoneyPage />,
    games: <GamesPage />,
    settings: <SettingsPage />,
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-base)", position: "relative" }}
    >
      <AmbientOrbs />

      {/* Top nav — desktop only */}
      {!isMobile && (
        <TopNav currentPage={currentPage} onNavigate={setCurrentPage} />
      )}

      <main
        className="relative"
        style={{
          zIndex: 1,
          paddingTop: isMobile ? 0 : 56,
          paddingBottom: isMobile ? 80 : 0,
          minHeight: "100vh",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {pages[currentPage]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CurrencyProvider>
      <SFXProvider>
        <TaskProvider>
          <GameProvider>
            <AppInner />
          </GameProvider>
        </TaskProvider>
      </SFXProvider>
    </CurrencyProvider>
  );
}
