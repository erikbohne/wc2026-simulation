"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runScenario, type Tree, type TreeNode } from "@/lib/sim";

export interface GroupFixture {
  match: number;
  group: string;
  home: string;
  away: string;
  homeLabel: string;
  awayLabel: string;
  status: "played" | "upcoming" | "tbd";
  score: [number, number] | null;
}

interface TeamLite {
  code: string;
  name: string;
  group: string;
}

interface BaseMatch {
  home: string;
  away: string;
  score: [number, number];
  group: string;
}

interface PlayedGame {
  opp: string;
  res: "W" | "D" | "L";
  gf: number;
  ga: number;
}

const C = {
  win: "#34c759",
  amber: "#ff9500",
  loss: "#ff3b30",
  accent: "#0071e3",
  ink: "#1d1d1f",
  dim: "#6e6e73",
  faint: "#86868b",
};
const SANS = "-apple-system,'SF Pro Display',system-ui,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,monospace";

const SIMS = 16000;
const Y = (p: number) => 64 + (100 - p) * 4.0;
const NOWX = 158;
const LASTX = 752;
const resColor = (r: string) => (r === "W" ? C.win : r === "D" ? C.amber : C.loss);
const word = (r: string) => (r === "W" ? "Win" : r === "D" ? "Draw" : "Lose");
const outcome = (gf: number, ga: number): "W" | "D" | "L" => (gf > ga ? "W" : gf < ga ? "L" : "D");

type ScoreOverride = Record<number, [number, number] | null>;

export function ScenarioView({
  teams,
  groupFixtures,
  baseMatches,
  updated,
}: {
  teams: TeamLite[];
  groupFixtures: GroupFixture[];
  baseMatches: BaseMatch[];
  updated: string | null;
}) {
  const [focus, setFocus] = useState("NOR");
  const [ov, setOv] = useState<ScoreOverride>({});
  const [tree, setTree] = useState<Tree | null>(null);
  const [pending, setPending] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teams) m[t.code] = t.name;
    return m;
  }, [teams]);

  const focusTeam = teams.find((t) => t.code === focus)!;
  const focusGroup = focusTeam.group;

  const groupSix = useMemo(
    () => groupFixtures.filter((f) => f.group === focusGroup).sort((a, b) => a.match - b.match),
    [groupFixtures, focusGroup],
  );

  const steppers = useMemo(
    () => groupSix.filter((f) => f.status === "played" || (f.home !== focus && f.away !== focus)),
    [groupSix, focus],
  );

  const effective = (f: GroupFixture): [number, number] | null => {
    if (f.match in ov) return ov[f.match];
    return f.status === "played" && f.score ? f.score : null;
  };

  // Focus team's own games, split into played (locked → the NOW form) and
  // upcoming (the tree stages).
  const focusGames = useMemo(
    () => groupSix.filter((f) => f.home === focus || f.away === focus),
    [groupSix, focus],
  );
  const played: PlayedGame[] = focusGames
    .map((f) => ({ f, s: effective(f) }))
    .filter((x) => x.s)
    .map(({ f, s }) => {
      const sc = s as [number, number];
      const homeF = f.home === focus;
      const gf = homeF ? sc[0] : sc[1];
      const ga = homeF ? sc[1] : sc[0];
      return { opp: homeF ? f.away : f.home, res: outcome(gf, ga), gf, ga };
    });
  const treeOpps = focusGames.filter((f) => !effective(f)).map((f) => (f.home === focus ? f.away : f.home));

  // Resimulate (debounced) on any change.
  useEffect(() => {
    const otherGroups = baseMatches
      .filter((m) => m.group !== focusGroup)
      .map((m) => ({ home: m.home, away: m.away, score: m.score }));
    const focusLocked = steppers
      .map((f) => ({ f, s: effective(f) }))
      .filter((x) => x.s)
      .map((x) => ({ home: x.f.home, away: x.f.away, score: x.s as [number, number] }));
    const matches = [...otherGroups, ...focusLocked];

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPending(true);
      runScenario({ focus, results: { updated: "live", matches }, sims: SIMS, seed: 2026 })
        .then((t) => {
          setTree(t);
          setPending(false);
        })
        .catch(() => setPending(false));
    }, 110);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ov, focusGroup, baseMatches, steppers]);

  const bump = (match: number, side: 0 | 1, d: number, base: [number, number]) => {
    setOv((prev) => {
      const cur = (match in prev ? prev[match] : base) ?? base;
      const next: [number, number] = [cur[0], cur[1]];
      next[side] = Math.max(0, Math.min(9, next[side] + d));
      return { ...prev, [match]: next };
    });
  };
  const clear = (match: number) => setOv((prev) => ({ ...prev, [match]: null }));
  const reset = () => setOv({});

  const nowPct = tree ? Math.round(tree.now_pct) : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-28 pb-28 sm:px-6">
      <div className="glass rounded-3xl p-6 sm:p-9">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="font-data text-[10px] tracking-[0.16em] text-ink-dim uppercase">
              World Cup 2026 · Live Monte Carlo
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink">
                {focusTeam.name}&rsquo;s road out
              </h1>
              <select
                value={focus}
                onChange={(e) => {
                  setFocus(e.target.value);
                  setOv({});
                }}
                aria-label="Focus team"
                className="font-data rounded-lg border border-hair bg-white/60 px-2 py-1 text-[13px] font-semibold text-accent"
              >
                {teams.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.group} · {t.name}
                  </option>
                ))}
              </select>
            </div>
            {/* form strip — what's already played */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {played.length === 0 ? (
                <span className="font-data rounded-md bg-ink/[0.05] px-2 py-1 text-[10px] tracking-[0.12em] text-ink-dim uppercase">
                  Pre-tournament · 3 to play
                </span>
              ) : (
                <>
                  {played.map((p, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold"
                      style={{ background: resColor(p.res) + "1a", color: resColor(p.res) }}
                    >
                      <span className="font-data text-[10px] tracking-wide">{p.res}</span>
                      <span className="text-ink-dim">vs {p.opp}</span>
                      <span className="tabular-nums text-ink">
                        {p.gf}–{p.ga}
                      </span>
                    </span>
                  ))}
                  <span className="font-data text-[10px] tracking-[0.1em] text-faint uppercase">
                    {treeOpps.length} to play
                  </span>
                </>
              )}
            </div>
            <p className="mt-2 max-w-[540px] text-[14px] leading-relaxed text-ink-dim">
              Tap any score in Group {focusGroup} below — every probability resimulates from{" "}
              {SIMS.toLocaleString()} runs of the real engine.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[50px] leading-none font-semibold tracking-tight text-ink tabular-nums">
              {nowPct ?? "··"}
              <span className="text-[25px] font-medium text-ink-dim">%</span>
            </div>
            <div className="font-data mt-1 text-[10px] tracking-[0.14em] text-ink-dim uppercase">
              advance · {played.length === 0 ? "pre-cup" : "today"}
            </div>
          </div>
        </div>

        {/* chart */}
        <div className={`mt-3 transition-opacity duration-150 ${pending ? "opacity-60" : "opacity-100"}`}>
          {tree ? (
            tree.depth === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-1.5">
                <div className="text-[15px] text-ink-dim">All three group games played.</div>
                <div className="text-[15px] font-semibold text-ink">
                  {focusTeam.name} {tree.now_pct >= 99.5 ? "have advanced" : tree.now_pct <= 0.5 ? "are eliminated" : `— ${Math.round(tree.now_pct)}% (pending other groups)`}
                </div>
              </div>
            ) : (
              <Chart tree={tree} hovered={hovered} setHovered={setHovered} treeOpps={treeOpps} nameOf={nameOf} />
            )
          ) : (
            <div className="flex h-[320px] items-center justify-center text-[13px] text-ink-dim">
              loading simulator…
            </div>
          )}
        </div>

        {/* controls */}
        <div className="mt-4 border-t border-hair pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="font-data text-[10px] tracking-[0.14em] text-ink-dim uppercase">
              Group {focusGroup} · tap to change · others simulated
            </div>
            <div className="flex items-center gap-3.5">
              <span className="font-data text-[10px] tracking-[0.1em] text-faint">TOP 2 + BEST 3RD</span>
              <button
                onClick={reset}
                className="font-data rounded-lg bg-accent/[0.08] px-3 py-1.5 text-[10px] tracking-[0.12em] text-accent uppercase"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {steppers.map((f) => {
              const eff = effective(f);
              const base: [number, number] = eff ?? (f.status === "played" && f.score ? f.score : [0, 0]);
              const sim = eff === null;
              return (
                <Stepper
                  key={f.match}
                  fx={f}
                  value={base}
                  simulated={sim}
                  played={f.status === "played"}
                  focus={focus}
                  onBump={(side, d) => bump(f.match, side, d, base)}
                  onClear={() => clear(f.match)}
                />
              );
            })}
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
            Each stage is one of {focusTeam.name}&rsquo;s remaining games; node height = advancement %, so the gap
            between nodes is the probability difference; branch weight = how often that result happens; nodes at the
            same level merge (hover to trace a path).{updated ? ` Real results through ${updated}.` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- score stepper ----------------------------- */

function Stepper({
  fx,
  value,
  simulated,
  played,
  focus,
  onBump,
  onClear,
}: {
  fx: GroupFixture;
  value: [number, number];
  simulated: boolean;
  played: boolean;
  focus: string;
  onBump: (side: 0 | 1, d: number) => void;
  onClear: () => void;
}) {
  const stepper = (i: 0 | 1) => (
    <div className="flex flex-col items-center gap-[3px]">
      <button
        onClick={() => onBump(i, 1)}
        className="h-6 w-[30px] rounded-t-lg rounded-b bg-ink/[0.07] text-[15px] leading-none text-ink hover:bg-accent/15"
      >
        +
      </button>
      <span
        className="min-w-6 text-center text-[30px] leading-none font-semibold tracking-tight tabular-nums text-ink"
        style={simulated ? { color: "#c7c7cc" } : undefined}
      >
        {simulated ? "·" : value[i]}
      </span>
      <button
        onClick={() => onBump(i, -1)}
        className="h-6 w-[30px] rounded-t rounded-b-lg bg-ink/[0.07] text-[15px] leading-none text-ink hover:bg-accent/15"
      >
        −
      </button>
    </div>
  );
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-hair bg-white/50 px-4 py-3">
      <span
        className={`min-w-0 flex-1 truncate text-right text-[15px] font-semibold ${
          fx.home === focus ? "text-accent" : "text-ink"
        }`}
      >
        {fx.homeLabel}
      </span>
      {stepper(0)}
      <span className="self-center text-[16px] text-[#c7c7cc]">–</span>
      {stepper(1)}
      <span
        className={`min-w-0 flex-1 truncate text-left text-[15px] font-semibold ${
          fx.away === focus ? "text-accent" : "text-ink"
        }`}
      >
        {fx.awayLabel}
      </span>
      <button
        onClick={onClear}
        title={simulated ? "simulated — tap a score to set it" : played ? "real result — clear to simulate" : "clear to simulated"}
        className={`font-data ml-1 rounded-md px-1.5 py-1 text-[9px] tracking-wide ${
          simulated ? "bg-ink/[0.05] text-faint hover:text-ink" : played ? "bg-win/15 text-win-deep" : "bg-accent/[0.08] text-accent"
        }`}
      >
        {simulated ? "SIM" : played ? "REAL" : "SET"}
      </button>
    </div>
  );
}

/* ------------------------------- the chart ------------------------------- */

interface Cluster {
  id: string;
  level: number;
  y: number;
  members: TreeNode[];
  pmin: number;
  pmax: number;
}

function Chart({
  tree,
  hovered,
  setHovered,
  treeOpps,
  nameOf,
}: {
  tree: Tree;
  hovered: string | null;
  setHovered: (h: string | null) => void;
  treeOpps: string[];
  nameOf: Record<string, string>;
}) {
  const depth = tree.depth;
  const colX = (stage: number) => (depth <= 1 ? LASTX : NOWX + (stage * (LASTX - NOWX)) / depth);

  const path = (ax: number, ay: number, bx: number, by: number) => {
    const cx = (ax + bx) / 2;
    return `M${ax} ${ay} C${cx} ${ay} ${cx} ${by} ${bx} ${by}`;
  };

  const { clusters, yOfCode, idOfCode } = useMemo(() => {
    const yOfCode: Record<string, number> = {};
    const idOfCode: Record<string, string> = {};
    const clusters: Cluster[] = [];
    const MIN = 24;
    for (let L = 1; L <= depth; L++) {
      const lvl = tree.nodes
        .filter((n) => n.level === L)
        .map((n) => ({ n, y: Y(n.pct) }))
        .sort((a, b) => b.n.pct - a.n.pct);
      let ci = 0;
      let cur: Cluster | null = null;
      for (const { n, y } of lvl) {
        if (cur && Math.abs(y - Y(cur.members[cur.members.length - 1].pct)) < MIN) {
          cur.members.push(n);
        } else {
          cur = { id: `l${L}c${ci++}`, level: L, y: 0, members: [n], pmin: 0, pmax: 0 };
          clusters.push(cur);
        }
      }
      for (const c of clusters.filter((c) => c.level === L)) {
        c.y = c.members.reduce((s, m) => s + Y(m.pct), 0) / c.members.length;
        c.pmin = Math.min(...c.members.map((m) => m.pct));
        c.pmax = Math.max(...c.members.map((m) => m.pct));
        for (const m of c.members) {
          yOfCode[m.code] = c.y;
          idOfCode[m.code] = c.id;
        }
      }
    }
    return { clusters, yOfCode, idOfCode };
  }, [tree.nodes, depth]);

  const nowY = Y(tree.now_pct);
  const parentY = (code: string) => (code.length === 1 ? nowY : yOfCode[code.slice(0, -1)]);

  // hover-to-trace
  let active: "all" | { edges: Set<string>; nodes: Set<string> } | null = null;
  if (hovered === "now") active = "all";
  else if (hovered) {
    const cl = clusters.find((c) => c.id === hovered);
    if (cl) {
      const edges = new Set<string>();
      const nodes = new Set<string>(["now", hovered]);
      for (const m of cl.members) {
        for (let k = 1; k <= m.code.length; k++) {
          const pre = m.code.slice(0, k);
          edges.add(pre);
          nodes.add(idOfCode[pre]);
        }
      }
      active = { edges, nodes };
    }
  }
  const eOn = (code: string) => active == null || active === "all" || active.edges.has(code);
  const nOn = (id: string) => active == null || active === "all" || active.nodes.has(id);

  // grid
  const grid: React.ReactNode[] = [
    <line key="ax" x1={122} y1={Y(100)} x2={122} y2={Y(0)} stroke="rgba(60,60,67,0.16)" strokeWidth={1} />,
  ];
  for (const t of [0, 25, 50, 75, 100]) {
    grid.push(<line key={"g" + t} x1={122} y1={Y(t)} x2={840} y2={Y(t)} stroke="rgba(60,60,67,0.07)" strokeWidth={1} />);
    grid.push(
      <text key={"t" + t} x={112} y={Y(t) + 3.5} textAnchor="end" style={{ fontFamily: MONO, fontSize: 10, fill: C.faint }}>
        {t}
      </text>,
    );
  }

  const head = (x: number, a: string, b: string) => (
    <g key={"h" + x + a}>
      <text x={x} y={34} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 10.5, fill: C.dim, letterSpacing: "0.16em" }}>
        {a}
      </text>
      <text x={x} y={47} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 9, fill: C.faint, letterSpacing: "0.1em" }}>
        {b}
      </text>
    </g>
  );

  const grp = (id: string, label: string, inner: React.ReactNode) => (
    <g
      key={id}
      role="button"
      tabIndex={0}
      aria-label={label}
      style={{ cursor: "default", outline: "none" }}
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(id)}
      onBlur={() => setHovered(null)}
    >
      {inner}
    </g>
  );

  return (
    <svg viewBox="0 0 900 524" width="100%" style={{ display: "block", height: "auto", overflow: "visible" }} role="img"
      aria-label={`Scenario tree. ${tree.focus} ${Math.round(tree.now_pct)} percent to advance now.`}>
      <defs>
        <filter id="nwSoft" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx={0} dy={1} stdDeviation={1.4} floodColor="#1d1d1f" floodOpacity={0.16} />
        </filter>
      </defs>

      <g>{grid}</g>
      {head(NOWX, "NOW", treeOpps.length === 3 ? "pre-cup" : "today")}
      {Array.from({ length: depth }, (_, i) => {
        const L = i + 1;
        const opp = treeOpps[i];
        return head(colX(L), depth === 1 ? "FINAL GAME" : `GAME ${L}`, opp ? "vs " + (nameOf[opp] ?? opp) : "");
      })}

      {/* connectors (deepest first so root edges sit on top) */}
      <g fill="none" strokeLinecap="round">
        {[...tree.nodes]
          .sort((a, b) => b.level - a.level)
          .map((n) => {
            const on = eOn(n.code);
            const lvl1 = n.code.length === 1;
            const w = Math.max(1.4, Math.min(13, 1.4 + (n.n / tree.sims) * (lvl1 ? 26 : 30)));
            return (
              <path
                key={"e" + n.code}
                d={path(colX(n.code.length - 1) || NOWX, parentY(n.code), colX(n.code.length), yOfCode[n.code])}
                stroke={lvl1 ? resColor(n.code[0]) : on && active ? "rgba(60,60,67,0.5)" : "rgba(60,60,67,0.26)"}
                strokeWidth={w}
                opacity={on ? (lvl1 ? 0.9 : 1) : 0.08}
                style={{ transition: "opacity .2s" }}
              />
            );
          })}
      </g>

      {/* today line */}
      <line x1={NOWX} y1={nowY} x2={826} y2={nowY} stroke={C.accent} strokeWidth={1} strokeDasharray="2 5" opacity={active ? 0.05 : 0.16} />

      {/* NOW node */}
      {grp(
        "now",
        `Today: ${Math.round(tree.now_pct)} percent`,
        <g opacity={nOn("now") ? 1 : 0.25} style={{ transition: "opacity .2s" }}>
          <circle cx={NOWX} cy={nowY} r={8.5} fill={C.ink} stroke="#fff" strokeWidth={2.5} filter="url(#nwSoft)" />
          <text x={NOWX} y={nowY - 18} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 600, fill: C.ink, letterSpacing: "-0.02em" }}>
            {Math.round(tree.now_pct)}%
          </text>
        </g>,
      )}

      {/* cluster nodes */}
      {clusters.map((c) => {
        const merged = c.members.length > 1;
        const last = c.members[0].code.slice(-1);
        const ring = merged ? "rgba(60,60,67,0.4)" : resColor(last);
        const isFinal = c.level === depth;
        const x = colX(c.level);
        const lbl =
          Math.round(c.pmin) === Math.round(c.pmax) ? Math.round(c.pmax) + "%" : Math.round(c.pmin) + "–" + Math.round(c.pmax) + "%";
        const inner = (
          <g opacity={nOn(c.id) ? 1 : 0.2} style={{ transition: "opacity .2s" }}>
            <circle cx={x} cy={c.y} r={merged ? 8 : 7} fill="#fff" stroke={ring} strokeWidth={merged ? 2.5 : 3} filter="url(#nwSoft)" />
            {isFinal ? (
              <>
                <text x={x + 16} y={c.y + 6} style={{ fontFamily: SANS, fontSize: 17, fontWeight: 600, fill: C.ink, letterSpacing: "-0.02em" }}>
                  {lbl}
                </text>
                {merged && (
                  <>
                    <rect x={x + 16} y={c.y + 10} width={60} height={14} rx={7} fill="rgba(60,60,67,0.08)" />
                    <text x={x + 23} y={c.y + 20} style={{ fontFamily: MONO, fontSize: 8.5, fill: C.dim, letterSpacing: "0.06em" }}>
                      {c.members.length} PATHS
                    </text>
                  </>
                )}
              </>
            ) : (
              // flip the % below the dot when near the top so it clears the column header
              (() => {
                const below = c.y < 92;
                return (
                  <>
                    <text x={x} y={below ? c.y + 20 : c.y - 15} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, fill: C.ink, letterSpacing: "-0.02em" }}>
                      {lbl}
                    </text>
                    <text x={x} y={below ? c.y + 32 : c.y + 21} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 8.5, fill: C.dim, letterSpacing: "0.1em" }}>
                      {merged ? `${c.members.length} PATHS` : c.level === 1 ? word(last).toUpperCase() : c.members[0].code}
                    </text>
                  </>
                );
              })()
            )}
          </g>
        );
        return grp(c.id, `${lbl} to advance`, inner);
      })}
    </svg>
  );
}
