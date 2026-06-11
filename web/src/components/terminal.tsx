"use client";

import { useEffect, useMemo, useState } from "react";
import type { Report } from "@/lib/report";

const CMD = "wc2026-sim -n 100000 --results data/results.json";
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const RUN_TICKS = 30;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function Terminal({ report }: { report: Report }) {
  const rows = useMemo(() => {
    const top = report.teams.slice(0, 8);
    const maxWin = top[0]?.win ?? 1;
    return top.map((t, i) => ({
      rank: i + 1,
      name: t.name.slice(0, 13),
      group: t.group,
      win: t.win,
      final: t.final,
      bar: "▇".repeat(Math.max(1, Math.round((t.win / maxWin) * 12))),
    }));
  }, [report]);

  const [typed, setTyped] = useState(0);
  const [pre, setPre] = useState(0);
  const [tick, setTick] = useState(-1);
  const [shownRows, setShownRows] = useState(-1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(
        setTimeout(() => {
          if (!cancelled) fn();
        }, ms),
      );
    };
    const cleanup = () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      at(0, () => {
        setTyped(CMD.length);
        setPre(3);
        setTick(RUN_TICKS);
        setShownRows(rows.length);
        setDone(true);
      });
      return cleanup;
    }
    const run = () => {
      setTyped(0);
      setPre(0);
      setTick(-1);
      setShownRows(-1);
      setDone(false);
      for (let i = 1; i <= CMD.length; i++) at(300 + i * 26, () => setTyped(i));
      let t = 300 + CMD.length * 26 + 200;
      for (let i = 1; i <= 3; i++) {
        at(t, () => setPre(i));
        t += 170;
      }
      t += 150;
      for (let i = 0; i <= RUN_TICKS; i++) {
        at(t + i * 45, () => setTick(i));
      }
      t += RUN_TICKS * 45 + 200;
      at(t, () => setShownRows(0));
      for (let i = 1; i <= rows.length; i++) {
        at(t + 80 + i * 55, () => setShownRows(i));
      }
      t += 80 + rows.length * 55 + 180;
      at(t, () => setDone(true));
      at(t + 6500, run);
    };
    run();
    return cleanup;
  }, [rows]);

  const progress = Math.max(0, Math.min(1, tick / RUN_TICKS));
  const running = tick >= 0 && tick < RUN_TICKS;
  const ran = tick >= RUN_TICKS;
  const barW = 18;
  const filled = Math.round(progress * barW);
  const speed = (51.3 + Math.sin(tick * 1.7) * 4.2).toFixed(1);

  const preflight = [
    <>
      <span className="text-accent">→</span> teams.json
      <span className="text-ink-dim/60"> … </span>48 teams · 12 groups · elo{" "}
      {report.elo_snapshot_date}
    </>,
    <>
      <span className="text-accent">→</span> results.json
      <span className="text-ink-dim/60"> … </span>
      {report.fixed_matches} of 104 matches locked
    </>,
    <>
      <span className="text-accent">→</span> rng xoshiro256++ · seed{" "}
      {report.seed} · splitmix64 streams
    </>,
  ];

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
      <div className="font-data h-[21.5rem] overflow-hidden p-4 text-[10.5px] leading-[1.75] sm:text-[11.5px]">
        <div className="whitespace-pre text-ink">
          <span className="text-win-deep">➜</span>{" "}
          <span className="text-accent">~</span> {CMD.slice(0, typed)}
          {typed < CMD.length && (
            <span className="animate-pulse text-ink/70">▍</span>
          )}
        </div>
        {preflight.slice(0, pre).map((l, i) => (
          <div key={i} className="whitespace-pre text-ink/70">
            {l}
          </div>
        ))}
        {tick >= 0 && (
          <div className="whitespace-pre text-ink/80">
            {running ? (
              <>
                <span className="text-amber">{SPINNER[tick % 10]}</span>{" "}
                simulating{" "}
                <span className="text-ink-dim/50">
                  ▕{"█".repeat(filled)}
                  {"░".repeat(barW - filled)}▏
                </span>{" "}
                <span className="text-ink">
                  {String(Math.round(progress * 100)).padStart(3)}%
                </span>{" "}
                {fmt(Math.round(progress * report.simulations))} runs ·{" "}
                {speed}M matches/s
              </>
            ) : (
              <>
                <span className="text-win-deep">✔</span>{" "}
                {fmt(report.simulations)} tournaments ·{" "}
                {fmt(report.simulations * 104)} matches in 0.19s
              </>
            )}
          </div>
        )}
        {ran && shownRows >= 0 && (
          <div className="whitespace-pre text-accent">
            {"rank  team           grp    win%  final%  "}
          </div>
        )}
        {ran &&
          rows.slice(0, Math.max(0, shownRows)).map((r) => (
            <div key={r.rank} className="whitespace-pre">
              <span className="text-ink-dim">
                {String(r.rank).padEnd(6)}
              </span>
              <span className="text-ink">{r.name.padEnd(15)}</span>
              <span className="text-ink-dim">{r.group.padEnd(4)}</span>
              <span className="text-win-deep">
                {`${(r.win * 100).toFixed(1)}%`.padStart(7)}
              </span>
              <span className="text-ink-dim">
                {`${(r.final * 100).toFixed(1)}%`.padStart(8)}
              </span>{" "}
              <span className="text-win/70">{r.bar}</span>
            </div>
          ))}
        {done && (
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
