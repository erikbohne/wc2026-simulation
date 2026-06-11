"use client";

import { useEffect, useMemo, useState } from "react";
import type { Report } from "@/lib/report";

const CMD = "wc2026-sim -n 100000 --results data/results.json";

function buildOutput(report: Report): string[] {
  const pad = (s: string, w: number) => s.padEnd(w);
  const num = (p: number) => `${(p * 100).toFixed(1)}%`.padStart(6);
  const lines = [
    `simulating 100,000 tournaments (seed ${report.seed}, dynamic elo, ${report.fixed_matches} matches locked)`,
    `${pad("Rank", 5)} ${pad("Team", 14)} ${pad("Grp", 4)} ${num(0).replace("0.0%", "  Win%")} ${"Final%".padStart(7)} ${"SF%".padStart(6)}`,
  ];
  for (const [i, t] of report.teams.slice(0, 8).entries()) {
    lines.push(
      `${pad(String(i + 1), 5)} ${pad(t.name, 14)} ${pad(t.group, 4)} ${num(t.win)} ${num(t.final).padStart(7)} ${num(t.sf)}`,
    );
  }
  lines.push(`104 matches × 100,000 runs — done in 0.19s`);
  return lines;
}

export function Terminal({ report }: { report: Report }) {
  const lines = useMemo(() => buildOutput(report), [report]);
  const [typed, setTyped] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(t);
    };
    const cleanup = () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      at(0, () => {
        setTyped(CMD.length);
        setShown(lines.length);
      });
      return cleanup;
    }
    const run = () => {
      setTyped(0);
      setShown(0);
      for (let i = 1; i <= CMD.length; i++) {
        at(300 + i * 28, () => setTyped(i));
      }
      const cmdDone = 300 + CMD.length * 28;
      lines.forEach((_, i) => {
        const delay =
          i === 0
            ? cmdDone + 250
            : i === 1
              ? cmdDone + 700
              : cmdDone + 700 + i * 60;
        at(delay, () => setShown(i + 1));
      });
      at(cmdDone + 700 + lines.length * 60 + 5200, run);
    };
    run();
    return cleanup;
  }, [lines]);
  return (
    <div className="glass-strong overflow-hidden rounded-2xl">
      <div className="flex items-center gap-1.5 border-b border-hair px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="font-data ml-3 text-[11px] text-ink-dim/70">
          wc2026-simulation — zsh
        </span>
      </div>
      <div className="font-data h-72 overflow-hidden p-4 text-[11px] leading-[1.7] sm:text-xs">
        <div className="whitespace-pre text-ink">
          <span className="text-win-deep">➜</span>{" "}
          <span className="text-accent">~</span> {CMD.slice(0, typed)}
          {typed < CMD.length && (
            <span className="animate-pulse text-ink/70">▍</span>
          )}
        </div>
        {lines.slice(0, shown).map((l, i) => (
          <div
            key={i}
            className={`whitespace-pre ${
              i === 0
                ? "text-ink-dim/70"
                : i === 1
                  ? "text-accent"
                  : i === lines.length - 1
                    ? "text-win-deep"
                    : "text-ink/80"
            }`}
          >
            {l}
          </div>
        ))}
        {shown === lines.length && (
          <div className="whitespace-pre text-ink">
            <span className="text-win-deep">➜</span>{" "}
            <span className="text-accent">~</span>{" "}
            <span className="animate-pulse text-ink/70">▍</span>
          </div>
        )}
      </div>
    </div>
  );
}
