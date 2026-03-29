import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Coins, LogOut, Save, Volume2, VolumeX, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import type { WorkloadConfig } from "../backend";
import {
  CURRENCIES,
  type CurrencyCode,
  useCurrency,
} from "../context/CurrencyContext";
import { useSFXContext } from "../context/SFXContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function SettingsPage() {
  const { clear } = useInternetIdentity();
  const { currency, setCurrency } = useCurrency();
  const { actor } = useActor();
  const { isMuted, volume, toggleMute, setVolume } = useSFXContext();
  const [capacity, setCapacity] = useState(30);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!actor) return;
    actor
      .getWorkloadConfig()
      .then((c) => {
        setCapacity(Number(c.dailyTrackCapacity));
        setStartHour(Number(c.workStartHour));
        setEndHour(Number(c.workEndHour));
      })
      .catch(() => {});
  }, [actor]);

  const saveWorkload = async () => {
    if (!actor) return;
    await actor.updateWorkloadConfig({
      dailyTrackCapacity: BigInt(capacity),
      workStartHour: BigInt(startHour),
      workEndHour: BigInt(endHour),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Configure your musc experience
        </p>
      </div>

      {/* YouTube Section */}
      <div
        className="mb-6 p-6 rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(255,71,87,0.2)",
              border: "1px solid rgba(255,71,87,0.4)",
            }}
          >
            <Youtube className="w-4 h-4" style={{ color: "#ff4757" }} />
          </div>
          <h2
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            YouTube Integration
          </h2>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          YouTube is the primary music source for musc. No login or API key
          required.
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Go to the Focus Session page and paste any YouTube video or playlist
          URL to start. The embedded player runs fully within the app.
        </p>
        <div
          className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(43,214,123,0.08)",
            border: "1px solid rgba(43,214,123,0.25)",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--accent-green)" }}
          />
          <p className="text-xs" style={{ color: "var(--accent-green)" }}>
            Ready — no setup needed
          </p>
        </div>
      </div>

      {/* Sound Effects Section */}
      <div
        className="mb-6 p-6 rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(34,193,255,0.15)",
              border: "1px solid rgba(34,193,255,0.3)",
            }}
          >
            {isMuted ? (
              <VolumeX
                className="w-4 h-4"
                style={{ color: "var(--accent-cyan)" }}
              />
            ) : (
              <Volume2
                className="w-4 h-4"
                style={{ color: "var(--accent-cyan)" }}
              />
            )}
          </div>
          <h2
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Sound Effects
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Subtle audio cues for sessions and interactions
        </p>

        <div className="flex items-center justify-between mb-5">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Master mute
          </p>
          <Switch
            checked={isMuted}
            onCheckedChange={toggleMute}
            data-ocid="settings.switch"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Volume
            </p>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
          <Slider
            value={[Math.round(volume * 100)]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => setVolume(v / 100)}
            disabled={isMuted}
            data-ocid="settings.input"
          />
        </div>
      </div>

      {/* Workload Section */}
      <div
        className="mb-6 p-6 rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
        }}
      >
        <h2
          className="font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Workload Configuration
        </h2>

        <div className="mb-4">
          <p
            className="text-xs block mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Daily track capacity ({capacity} tracks)
          </p>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--accent-cyan)" }}
            data-ocid="settings.input"
          />
          <div
            className="flex justify-between text-xs mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            <span>5</span>
            <span>100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p
              className="text-xs block mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Work start hour
            </p>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
              data-ocid="settings.select"
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <p
              className="text-xs block mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Work end hour
            </p>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
              data-ocid="settings.select"
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={saveWorkload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{
            background: saved
              ? "rgba(43,214,123,0.15)"
              : "linear-gradient(135deg, #22C1FF, #2D7CFF)",
            color: saved ? "var(--accent-green)" : "#05080D",
            border: saved ? "1px solid rgba(43,214,123,0.4)" : "none",
          }}
          data-ocid="settings.save_button"
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Currency */}
      <div
        className="mb-6 p-6 rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(34,193,255,0.15)",
              border: "1px solid rgba(34,193,255,0.3)",
            }}
          >
            <Coins
              className="w-4 h-4"
              style={{ color: "var(--accent-cyan)" }}
            />
          </div>
          <h2
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Currency
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Choose the currency displayed across Money & Dashboard.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code as CurrencyCode)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
              style={{
                background:
                  currency.code === c.code
                    ? "rgba(34,193,255,0.15)"
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${currency.code === c.code ? "rgba(34,193,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                color:
                  currency.code === c.code
                    ? "var(--accent-cyan)"
                    : "var(--text-secondary)",
                boxShadow:
                  currency.code === c.code
                    ? "0 0 12px rgba(34,193,255,0.15)"
                    : "none",
              }}
              data-ocid="settings.select"
            >
              <span className="text-base">{c.symbol}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
        }}
      >
        <h2
          className="font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Account
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Sign out of your Internet Identity session
        </p>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{
            background: "rgba(255,71,87,0.1)",
            border: "1px solid rgba(255,71,87,0.3)",
            color: "var(--accent-red)",
          }}
          data-ocid="settings.delete_button"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
