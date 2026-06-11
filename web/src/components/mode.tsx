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
      className="flex items-center rounded-full p-0.5"
      role="tablist"
      aria-label="Data mode"
    >
      <button
        role="tab"
        aria-selected={mode === "live"}
        onClick={() => setMode("live")}
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-colors ${
          mode === "live"
            ? "font-medium text-ink"
            : "text-ink-dim/70 hover:text-ink-dim"
        }`}
      >
        <span
          className={`inline-block h-1 w-1 rounded-full ${
            mode === "live" ? "bg-win" : "bg-transparent"
          }`}
        />
        Live
      </button>
      <span className="text-[11px] text-ink-dim/30">/</span>
      <button
        role="tab"
        aria-selected={mode === "baseline"}
        onClick={() => setMode("baseline")}
        className={`rounded-full px-2 py-1 text-[12px] transition-colors ${
          mode === "baseline"
            ? "font-medium text-ink"
            : "text-ink-dim/70 hover:text-ink-dim"
        }`}
      >
        Pre-cup
      </button>
    </div>
  );
}
