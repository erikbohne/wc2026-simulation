"use client";

import { Flag } from "@/components/flag";

const COLORS = [
  "#0071e3",
  "#ff3b30",
  "#34c759",
  "#ff9500",
  "#af52de",
  "#00c7be",
  "#5856d6",
  "#ff2d55",
  "#a2845e",
  "#b08700",
  "#32ade6",
  "#8e8e93",
];

const W = 760;
const H = 300;
const PAD = { top: 16, right: 64, bottom: 30, left: 40 };

export type ConvergenceData = {
  teams: string[];
  points: { n: number; win: Record<string, number> }[];
};

export function ConvergenceChart({ data }: { data: ConvergenceData }) {
  const { teams, points } = data;
  const lx = Math.log10;
  const x0 = lx(points[0].n);
  const x1 = lx(points[points.length - 1].n);
  const x = (n: number) =>
    PAD.left + ((lx(n) - x0) / (x1 - x0)) * (W - PAD.left - PAD.right);

  let max = 0;
  for (const p of points) {
    for (const t of teams) max = Math.max(max, p.win[t] ?? 0);
  }
  const yMax = Math.ceil(max * 10) / 10 + 0.05;
  const y = (p: number) =>
    H - PAD.bottom - (p / yMax) * (H - PAD.top - PAD.bottom);

  const last = points[points.length - 1];
  const labels = teams.map((t, ti) => ({
    code: t,
    color: COLORS[ti],
    p: last.win[t] ?? 0,
    y: y(last.win[t] ?? 0),
  }));
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].y < labels[i - 1].y + 14) labels[i].y = labels[i - 1].y + 14;
  }
  const maxLabelY = H - PAD.bottom + 6;
  if (labels.length && labels[labels.length - 1].y > maxLabelY) {
    labels[labels.length - 1].y = maxLabelY;
    for (let i = labels.length - 2; i >= 0; i--) {
      if (labels[i].y > labels[i + 1].y - 14) labels[i].y = labels[i + 1].y - 14;
    }
  }

  const gridStep = yMax > 0.3 ? 0.1 : 0.05;
  const grid: number[] = [];
  for (let g = gridStep; g <= yMax; g += gridStep) grid.push(g);
  const ticks = points
    .map((p) => p.n)
    .filter((n) => Number.isInteger(lx(n)));

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold tracking-tight text-ink-dim">
          Convergence
        </h2>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          title odds vs number of simulated tournaments · same seed
        </span>
      </div>
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
          {grid.map((g) => (
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
          {ticks.map((n) => (
            <g key={n}>
              <line
                x1={x(n)}
                x2={x(n)}
                y1={H - PAD.bottom}
                y2={H - PAD.bottom + 4}
                stroke="rgba(60,60,67,0.3)"
              />
              <text
                x={x(n)}
                y={H - 8}
                textAnchor="middle"
                className="fill-ink-dim"
                fontSize="10"
                fontFamily="var(--font-data)"
              >
                {n >= 1000 ? `${n / 1000}k` : n}
              </text>
            </g>
          ))}
          {teams.map((t, ti) => (
            <g key={t}>
              <path
                d={points
                  .map(
                    (p, i) =>
                      `${i === 0 ? "M" : "L"}${x(p.n).toFixed(1)},${y(p.win[t] ?? 0).toFixed(1)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={COLORS[ti]}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={x(last.n)}
                cy={y(last.win[t] ?? 0)}
                r="3.5"
                fill={COLORS[ti]}
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>
        {labels.map((l) => (
          <span
            key={l.code}
            className="pointer-events-none absolute flex -translate-y-1/2 items-center gap-1"
            style={{
              left: `${((x(last.n) + 9) / W) * 100}%`,
              top: `${(l.y / H) * 100}%`,
            }}
          >
            <Flag code={l.code} className="text-[8px]" />
            <span className="font-data text-[10px] tabular-nums text-ink-dim">
              {(l.p * 100).toFixed(1)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
