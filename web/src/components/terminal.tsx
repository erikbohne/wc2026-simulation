"use client";

import { useEffect, useMemo, useState } from "react";
import type { Report } from "@/lib/report";
import type { ReactNode } from "react";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const RUN_TICKS = 30;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

type Scene = {
  kind: "sim" | "plain";
  cmd: string;
  lines: ReactNode[];
};

export function Terminal({ report }: { report: Report }) {
  const scenes = useMemo<Scene[]>(() => {
    const top = report.teams.slice(0, 8);
    const maxWin = top[0]?.win ?? 1;
    const leader = report.teams[0];

    const tableLines: ReactNode[] = [
      <span key="hdr" className="text-accent">
        {"rank  team           grp    win%  final%  "}
      </span>,
      ...top.map((t, i) => (
        <span key={t.code}>
          <span className="text-ink-dim">{String(i + 1).padEnd(6)}</span>
          <span className="text-ink">{t.name.slice(0, 12).padEnd(14)}</span>
          <span className="text-ink-dim">{t.group.padEnd(4)}</span>
          <span className="text-win-deep">
            {`${(t.win * 100).toFixed(1)}%`.padStart(7)}
          </span>
          <span className="text-ink-dim">
            {`${(t.final * 100).toFixed(1)}%`.padStart(8)}
          </span>{" "}
          <span className="text-win/70">
            {"▇".repeat(Math.max(1, Math.round((t.win / maxWin) * 10)))}
          </span>
        </span>
      )),
    ];

    const kv = (k: string, v: string, str: boolean, last = false): ReactNode => (
      <>
        {"  "}
        <span className="text-accent">&quot;{k}&quot;</span>
        <span className="text-ink-dim">: </span>
        <span className={str ? "text-amber" : "text-win-deep"}>
          {str ? `"${v}"` : v}
        </span>
        {!last && <span className="text-ink-dim">,</span>}
      </>
    );
    const jsonLines: ReactNode[] = [
      <span key="o" className="text-ink-dim">
        {"{"}
      </span>,
      <span key="code">{kv("code", leader.code, true)}</span>,
      <span key="name">{kv("name", leader.name, true)}</span>,
      <span key="group">{kv("group", leader.group, true)}</span>,
      <span key="win">{kv("win", leader.win.toFixed(4), false)}</span>,
      <span key="final">{kv("final", leader.final.toFixed(4), false)}</span>,
      <span key="sf">{kv("sf", leader.sf.toFixed(4), false)}</span>,
      <span key="r16">{kv("r16", leader.r16.toFixed(4), false, true)}</span>,
      <span key="c" className="text-ink-dim">
        {"}"}
      </span>,
    ];

    const nextFixtures = report.fixtures
      .filter((f) => f.status === "upcoming" && f.home && f.away)
      .slice(0, 6);
    const nextLines: ReactNode[] = nextFixtures.length
      ? [
          <span key="hdr" className="text-accent">
            {"match  fixture          home   draw   away"}
          </span>,
          ...nextFixtures.map((f) => (
            <span key={f.match}>
              <span className="text-ink-dim">
                {String(f.match).padEnd(7)}
              </span>
              <span className="text-ink">
                {`${f.home}–${f.away}`.padEnd(9)}
              </span>
              <span className="text-win-deep">
                {`${Math.round((f.p_home ?? 0) * 100)}%`.padStart(7)}
              </span>
              <span className="text-ink-dim">
                {`${Math.round((f.p_draw ?? 0) * 100)}%`.padStart(7)}
              </span>
              <span className="text-amber">
                {`${Math.round((f.p_away ?? 0) * 100)}%`.padStart(7)}
              </span>
            </span>
          )),
        ]
      : [];

    const list: Scene[] = [
      {
        kind: "sim",
        cmd: "wcsim -n 100000 --results data/results.json",
        lines: tableLines,
      },
      {
        kind: "plain",
        cmd: "wcsim --results data/results.json -o json | jq '.teams[0]'",
        lines: jsonLines,
      },
    ];
    if (nextLines.length) {
      list.push({
        kind: "plain",
        cmd: "wcsim --results data/results.json -o json | jq .fixtures",
        lines: nextLines,
      });
    }
    return list;
  }, [report]);

  const [scene, setScene] = useState(0);
  const [typed, setTyped] = useState(0);
  const [pre, setPre] = useState(0);
  const [tick, setTick] = useState(-1);
  const [shown, setShown] = useState(-1);
  const [done, setDone] = useState(false);

  const cur = scenes[scene % scenes.length];

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

    const cmd = cur.cmd;
    const outLen = cur.lines.length;
    const isSim = cur.kind === "sim";

    at(0, () => {
      setTyped(0);
      setPre(0);
      setTick(-1);
      setShown(-1);
      setDone(false);
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      at(0, () => {
        setTyped(cmd.length);
        setPre(3);
        setTick(isSim ? RUN_TICKS : -1);
        setShown(outLen);
        setDone(true);
      });
      at(4500, () => setScene((s) => s + 1));
      return cleanup;
    }

    for (let i = 1; i <= cmd.length; i++) at(300 + i * 24, () => setTyped(i));
    let t = 300 + cmd.length * 24 + 220;

    if (isSim) {
      for (let i = 1; i <= 3; i++) {
        at(t, () => setPre(i));
        t += 160;
      }
      t += 140;
      for (let i = 0; i <= RUN_TICKS; i++) at(t + i * 42, () => setTick(i));
      t += RUN_TICKS * 42 + 220;
    } else {
      t += 180;
    }

    at(t, () => setShown(0));
    for (let i = 1; i <= outLen; i++) at(t + 70 + i * 52, () => setShown(i));
    t += 70 + outLen * 52 + 180;
    at(t, () => setDone(true));
    at(t + 4200, () => setScene((s) => s + 1));

    return cleanup;
  }, [scene, cur]);

  const progress = Math.max(0, Math.min(1, tick / RUN_TICKS));
  const running = tick >= 0 && tick < RUN_TICKS;
  const ran = tick >= RUN_TICKS;
  const barW = 12;
  const filled = Math.round(progress * barW);
  const speed = Math.round(51.3 + Math.sin(tick * 1.7) * 4.2);

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
          wcsim — zsh
        </span>
      </div>
      <div className="font-data h-[21.5rem] overflow-hidden p-4 text-[10.5px] leading-[1.75] sm:text-[11.5px]">
        <div className="whitespace-pre text-ink">
          <span className="text-win-deep">➜</span>{" "}
          <span className="text-accent">~</span> {cur.cmd.slice(0, typed)}
          {typed < cur.cmd.length && (
            <span className="animate-pulse text-ink/70">▍</span>
          )}
        </div>

        {cur.kind === "sim" && (
          <>
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
                    {fmt(Math.round(progress * report.simulations))} · {speed}M
                    m/s
                  </>
                ) : (
                  <>
                    <span className="text-win-deep">✔</span>{" "}
                    {fmt(report.simulations)} tournaments in 0.19s
                  </>
                )}
              </div>
            )}
          </>
        )}

        {(cur.kind === "plain" || ran) &&
          shown >= 0 &&
          cur.lines.slice(0, Math.max(0, shown)).map((l, i) => (
            <div key={i} className="whitespace-pre">
              {l}
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
