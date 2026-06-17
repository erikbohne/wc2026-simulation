"use client";

import { useMemo, useState } from "react";
import { Flag } from "@/components/flag";
import { teamColor } from "@/lib/team-colors";
import type { HistoryPoint, TeamRow } from "@/lib/report";

const W = 760;
const H = 300;
const PAD = { top: 16, right: 44, bottom: 36, left: 40 };
const TOTAL_MATCHES = 104;
const DEFAULT_N = 8;
const MAX_SELECTED = 12;

// Knockout phase boundaries (last match number of each phase).
const PHASES = [
  { end: 72, label: "Groups" },
  { end: 88, label: "R32" },
  { end: 96, label: "R16" },
  { end: 100, label: "QF" },
  { end: 102, label: "SF" },
  { end: 104, label: "F" },
];

export function OddsChart({
  history,
  teams,
}: {
  history: HistoryPoint[];
  teams: TeamRow[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>(() =>
    teams.slice(0, DEFAULT_N).map((t) => t.code),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byCode = useMemo(
    () => new Map(teams.map((t) => [t.code, t])),
    [teams],
  );
  const series = useMemo(
    () => selected.map((c) => byCode.get(c)).filter(Boolean) as TeamRow[],
    [selected, byCode],
  );

  const { points, yMax, maxMatches } = useMemo(() => {
    const pts = [...history].sort((a, b) => a.matches - b.matches);
    let max = 0;
    for (const p of pts) {
      for (const c of selected) max = Math.max(max, p.win[c] ?? 0);
    }
    return {
      points: pts,
      yMax: Math.max(0.1, Math.ceil(max * 20) / 20 + 0.05),
      maxMatches: pts.length ? pts[pts.length - 1].matches : 0,
    };
  }, [history, selected]);

  const n = points.length;
  const innerW = W - PAD.left - PAD.right;
  const x = (m: number) => PAD.left + (m / TOTAL_MATCHES) * innerW;
  const y = (p: number) =>
    H - PAD.bottom - (p / yMax) * (H - PAD.top - PAD.bottom);

  const endFlags = useMemo(() => {
    const raw = series.map((t) => ({
      code: t.code,
      color: teamColor(t.code),
      y: y(points[n - 1]?.win[t.code] ?? 0),
    }));
    raw.sort((a, b) => a.y - b.y);
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].y < raw[i - 1].y + 15) raw[i].y = raw[i - 1].y + 15;
    }
    return raw;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, series, n, yMax]);

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => yMax * f);
  const hi = hover ?? n - 1;
  const shown = points[hi];
  const tooltipRows = shown
    ? series
        .map((t) => ({
          code: t.code,
          color: teamColor(t.code),
          p: shown.win[t.code] ?? 0,
        }))
        .sort((a, b) => b.p - a.p)
    : [];

  const nearestIndex = (matchVal: number) => {
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.matches - matchVal);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const addable = teams
    .filter((t) => !selected.includes(t.code))
    .filter((t) => {
      const q = query.trim().toLowerCase();
      return (
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
      );
    });
  const atMax = selected.length >= MAX_SELECTED;

  const remove = (code: string) =>
    setSelected((s) => (s.length > 1 ? s.filter((c) => c !== code) : s));
  const add = (code: string) =>
    setSelected((s) =>
      s.includes(code) || s.length >= MAX_SELECTED ? s : [...s, code],
    );

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold tracking-tight text-ink-dim">
          Title race
        </h2>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          win probability · {maxMatches}/{TOTAL_MATCHES} matches played
        </span>
      </div>

      {/* team selector */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {series.map((t) => (
          <span
            key={t.code}
            className="group flex items-center gap-1.5 rounded-full border border-hair bg-white/60 py-1 pr-1 pl-2 text-[11px]"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: teamColor(t.code) }}
            />
            <Flag code={t.code} className="text-[8px]" />
            <span className="font-data font-medium text-ink">{t.code}</span>
            <button
              type="button"
              onClick={() => remove(t.code)}
              aria-label={`Remove ${t.name}`}
              disabled={series.length <= 1}
              className="grid h-4 w-4 place-items-center rounded-full text-ink-dim transition-colors hover:bg-ink/10 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg width="7" height="7" viewBox="0 0 8 8">
                <path
                  d="M1 1l6 6M7 1l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            disabled={atMax}
            className="flex items-center gap-1 rounded-full border border-dashed border-ink/20 px-2.5 py-1 text-[11px] text-ink-dim transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-[13px] leading-none">+</span>
            {atMax ? `max ${MAX_SELECTED}` : "Add team"}
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close team menu"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => {
                  setMenuOpen(false);
                  setQuery("");
                }}
              />
              <div className="glass-strong absolute left-0 z-30 mt-2 flex max-h-72 w-60 flex-col overflow-hidden rounded-2xl p-1.5">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teams…"
                  className="mb-1 rounded-lg bg-ink/[0.04] px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-dim/60"
                />
                <div className="flex flex-col overflow-y-auto">
                  {addable.length === 0 && (
                    <span className="px-2 py-3 text-center text-[11px] text-ink-dim">
                      no teams found
                    </span>
                  )}
                  {addable.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => {
                        add(t.code);
                        setQuery("");
                      }}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ink/[0.05]"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: teamColor(t.code) }}
                      />
                      <Flag code={t.code} className="text-[8px]" />
                      <span className="text-[12.5px] text-ink">{t.name}</span>
                      <span className="font-data ml-auto text-[11px] tabular-nums text-ink-dim">
                        {(t.win * 100).toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          onPointerMove={(e) => {
            if (n < 2) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const matchVal = ((px - PAD.left) / innerW) * TOTAL_MATCHES;
            setHover(nearestIndex(matchVal));
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

          {/* phase boundary separators + labels */}
          {PHASES.map((ph, i) => {
            const startM = i === 0 ? 0 : PHASES[i - 1].end;
            const mid = (startM + ph.end) / 2;
            return (
              <g key={ph.label}>
                {ph.end < TOTAL_MATCHES && (
                  <line
                    x1={x(ph.end)}
                    x2={x(ph.end)}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke="rgba(60,60,67,0.08)"
                  />
                )}
                <text
                  x={x(mid)}
                  y={H - PAD.bottom + 22}
                  textAnchor="middle"
                  className="fill-ink-dim"
                  fontSize="9"
                  fontFamily="var(--font-data)"
                  opacity={0.7}
                >
                  {ph.label}
                </text>
              </g>
            );
          })}

          {/* baseline */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(0)}
            y2={y(0)}
            stroke="rgba(60,60,67,0.2)"
          />

          {/* per-match ticks: played vs upcoming */}
          {Array.from({ length: TOTAL_MATCHES }, (_, k) => k + 1).map((m) => {
            const played = m <= maxMatches;
            return (
              <line
                key={m}
                x1={x(m)}
                x2={x(m)}
                y1={y(0)}
                y2={y(0) + (played ? 5 : 3)}
                stroke={
                  played ? "rgba(60,60,67,0.45)" : "rgba(60,60,67,0.15)"
                }
                strokeWidth={1}
              />
            );
          })}

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

          {series.map((t) => (
            <g key={t.code}>
              {n > 1 && (
                <path
                  d={points
                    .map(
                      (p, i) =>
                        `${i === 0 ? "M" : "L"}${x(p.matches).toFixed(1)},${y(p.win[t.code] ?? 0).toFixed(1)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={teamColor(t.code)}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              <circle
                cx={x(points[hi]?.matches ?? 0)}
                cy={y(points[hi]?.win[t.code] ?? 0)}
                r="4"
                fill={teamColor(t.code)}
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {hover != null && n > 1 && (
            <line
              x1={x(points[hover].matches)}
              x2={x(points[hover].matches)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(60,60,67,0.25)"
            />
          )}

          {/* x-axis endpoints */}
          {n > 1 && (
            <>
              <text
                x={x(0)}
                y={H - 6}
                textAnchor="start"
                className="fill-ink-dim"
                fontSize="10"
                fontFamily="var(--font-data)"
              >
                kickoff
              </text>
              <text
                x={x(TOTAL_MATCHES)}
                y={H - 6}
                textAnchor="end"
                className="fill-ink-dim"
                fontSize="10"
                fontFamily="var(--font-data)"
              >
                104
              </text>
            </>
          )}
        </svg>

        {endFlags.map((f) => (
          <span
            key={f.code}
            className="pointer-events-none absolute -translate-y-1/2"
            style={{
              left: `${((x(maxMatches) + 10) / W) * 100}%`,
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
              left: `${Math.min(82, Math.max(8, (x(shown.matches) / W) * 100))}%`,
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
