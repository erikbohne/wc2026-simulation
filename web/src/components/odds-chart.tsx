"use client";

import { useMemo, useState } from "react";
import { Flag } from "@/components/flag";
import type { HistoryPoint, TeamRow } from "@/lib/report";

const COLORS = [
  "#0071e3",
  "#ff3b30",
  "#34c759",
  "#ff9500",
  "#af52de",
  "#00c7be",
];

const W = 760;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

export function OddsChart({
  history,
  teams,
}: {
  history: HistoryPoint[];
  teams: TeamRow[];
}) {
  const top = teams.slice(0, 6);
  const [hover, setHover] = useState<number | null>(null);

  const { points, yMax } = useMemo(() => {
    const pts = history.length > 0 ? history : [];
    let max = 0;
    for (const p of pts) {
      for (const t of top) max = Math.max(max, p.win[t.code] ?? 0);
    }
    return { points: pts, yMax: Math.max(0.1, Math.ceil(max * 20) / 20 + 0.05) };
  }, [history, top]);

  const n = points.length;
  const x = (i: number) =>
    n <= 1
      ? PAD.left
      : PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
  const y = (p: number) =>
    H - PAD.bottom - (p / yMax) * (H - PAD.top - PAD.bottom);

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => yMax * f);
  const hovered = hover != null ? points[hover] : null;
  const last = points[n - 1];
  const shown = hovered ?? last;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold tracking-tight text-ink-dim">
          Title race
        </h2>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          win probability · one point per update ·{" "}
          {shown
            ? hovered
              ? `after ${shown.matches} matches`
              : "live"
            : ""}
        </span>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_220px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          onPointerMove={(e) => {
            if (n < 2) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const i = Math.round(
              ((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1),
            );
            setHover(Math.max(0, Math.min(n - 1, i)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          {gridLines.map((g) => (
            <g key={g}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(g)}
                y2={y(g)}
                stroke="rgba(60,60,67,0.1)"
                strokeDasharray="3 5"
              />
              <text
                x={PAD.left - 8}
                y={y(g) + 3}
                textAnchor="end"
                className="fill-ink-dim"
                fontSize="10"
                fontFamily="var(--font-data)"
              >
                {Math.round(g * 100)}%
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(0)}
            y2={y(0)}
            stroke="rgba(60,60,67,0.2)"
          />
          {n === 1 && (
            <text
              x={(PAD.left + W - PAD.right) / 2}
              y={H / 2}
              textAnchor="middle"
              className="fill-ink-dim"
              fontSize="11"
              fontFamily="var(--font-data)"
            >
              the race chart fills in as matches are played
            </text>
          )}
          {top.map((t, ti) => {
            const d = points
              .map(
                (p, i) =>
                  `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.win[t.code] ?? 0).toFixed(1)}`,
              )
              .join(" ");
            return (
              <g key={t.code}>
                {n > 1 && (
                  <path
                    d={d}
                    fill="none"
                    stroke={COLORS[ti]}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                <circle
                  cx={x(hover ?? n - 1)}
                  cy={y(points[hover ?? n - 1]?.win[t.code] ?? 0)}
                  r="4"
                  fill={COLORS[ti]}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
          {hovered && n > 1 && (
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(60,60,67,0.25)"
            />
          )}
          {points.map((p, i) =>
            n > 1 && (i === 0 || i === n - 1) ? (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor={i === 0 ? "start" : "end"}
                className="fill-ink-dim"
                fontSize="10"
                fontFamily="var(--font-data)"
              >
                {i === 0 ? "kickoff" : `after ${p.matches}`}
              </text>
            ) : null,
          )}
        </svg>
        <div className="flex flex-col justify-center gap-2">
          {top.map((t, ti) => {
            const cur = shown?.win[t.code] ?? t.win;
            const base = points[0]?.win[t.code] ?? cur;
            const delta = (cur - base) * 100;
            return (
              <div
                key={t.code}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: COLORS[ti] }}
                  />
                  <Flag code={t.code} className="text-[10px]" />
                  <span className="truncate text-sm font-medium">
                    {t.name}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-data text-sm font-semibold tabular-nums">
                    {(cur * 100).toFixed(1)}%
                  </span>
                  <span
                    className={`font-data w-12 text-right text-[11px] tabular-nums ${
                      delta > 0.05
                        ? "text-win-deep"
                        : delta < -0.05
                          ? "text-loss"
                          : "text-ink-dim/50"
                    }`}
                  >
                    {delta > 0.05 ? "▲" : delta < -0.05 ? "▼" : ""}
                    {Math.abs(delta) > 0.05 ? Math.abs(delta).toFixed(1) : "—"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
