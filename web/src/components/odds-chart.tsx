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
const PAD = { top: 16, right: 44, bottom: 28, left: 40 };

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
    let max = 0;
    for (const p of history) {
      for (const t of top) max = Math.max(max, p.win[t.code] ?? 0);
    }
    return {
      points: history,
      yMax: Math.max(0.1, Math.ceil(max * 20) / 20 + 0.05),
    };
  }, [history, top]);

  const n = points.length;
  const x = (i: number) =>
    n <= 1 ? PAD.left : PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
  const y = (p: number) =>
    H - PAD.bottom - (p / yMax) * (H - PAD.top - PAD.bottom);

  const endFlags = useMemo(() => {
    const raw = top.map((t, ti) => ({
      code: t.code,
      color: COLORS[ti],
      y: y(points[n - 1]?.win[t.code] ?? 0),
    }));
    raw.sort((a, b) => a.y - b.y);
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].y < raw[i - 1].y + 17) raw[i].y = raw[i - 1].y + 17;
    }
    return raw;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, top, n, yMax]);

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => yMax * f);
  const hi = hover ?? n - 1;
  const shown = points[hi];
  const tooltipRows = shown
    ? top
        .map((t, ti) => ({
          code: t.code,
          color: COLORS[ti],
          p: shown.win[t.code] ?? 0,
        }))
        .sort((a, b) => b.p - a.p)
    : [];

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold tracking-tight text-ink-dim">
          Title race
        </h2>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          win probability · updates after every match
        </span>
      </div>
      <div className="relative mt-4">
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
          {top.map((t, ti) => (
            <g key={t.code}>
              {n > 1 && (
                <path
                  d={points
                    .map(
                      (p, i) =>
                        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.win[t.code] ?? 0).toFixed(1)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={COLORS[ti]}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              <circle
                cx={x(hi)}
                cy={y(points[hi]?.win[t.code] ?? 0)}
                r="4"
                fill={COLORS[ti]}
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
          ))}
          {hover != null && n > 1 && (
            <line
              x1={x(hover)}
              x2={x(hover)}
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

        {endFlags.map((f) => (
          <span
            key={f.code}
            className="pointer-events-none absolute -translate-y-1/2"
            style={{
              left: `${((x(n - 1) + 10) / W) * 100}%`,
              top: `${(f.y / H) * 100}%`,
            }}
            title={f.code}
          >
            <Flag code={f.code} className="text-[9px]" />
          </span>
        ))}

        {hover != null && shown && (
          <div
            className="glass-strong pointer-events-none absolute top-2 z-10 rounded-xl px-3 py-2"
            style={{
              left: `${Math.min(82, Math.max(8, (x(hover) / W) * 100))}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-data text-[10px] tracking-[0.1em] text-ink-dim uppercase">
              {shown.matches === 0
                ? "kickoff"
                : `after ${shown.matches} matches`}
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {tooltipRows.map((r) => (
                <div key={r.code} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: r.color }}
                  />
                  <Flag code={r.code} className="text-[8px]" />
                  <span className="font-data text-[11px]">{r.code}</span>
                  <span className="font-data ml-auto pl-3 text-[11px] font-semibold tabular-nums">
                    {(r.p * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
