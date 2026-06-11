"use client";

import { createContext, useContext, useState } from "react";
import type { Report } from "@/lib/report";

type Mode = "live" | "baseline";

const ModeContext = createContext<{
  mode: Mode;
  setMode: (m: Mode) => void;
}>({ mode: "live", setMode: () => {} });

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("live");
  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}

export function usePick(live: Report, baseline: Report): Report {
  const { mode } = useMode();
  return mode === "live" ? live : baseline;
}

export function ModeToggle() {
  const { mode, setMode } = useMode();
  return (
    <div
      className="flex items-center rounded-full bg-ink/[0.06] p-0.5"
      role="tablist"
      aria-label="Data mode"
    >
      <button
        role="tab"
        aria-selected={mode === "live"}
        onClick={() => setMode("live")}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-all ${
          mode === "live"
            ? "bg-white text-ink shadow-sm"
            : "text-ink-dim hover:text-ink"
        }`}
      >
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            mode === "live" ? "bg-win" : "bg-ink/20"
          }`}
        />
        Live
      </button>
      <button
        role="tab"
        aria-selected={mode === "baseline"}
        onClick={() => setMode("baseline")}
        className={`rounded-full px-3 py-1 text-[13px] font-medium transition-all ${
          mode === "baseline"
            ? "bg-white text-ink shadow-sm"
            : "text-ink-dim hover:text-ink"
        }`}
      >
        Pre-cup
      </button>
    </div>
  );
}
