"use client";

import { Flag } from "@/components/flag";
import { usePick } from "@/components/mode";
import { shortDate } from "@/lib/format";
import type { Fixture, Report } from "@/lib/report";

const LEFT = {
  r32: [74, 77, 73, 75, 83, 84, 81, 82],
  r16: [89, 90, 93, 94],
  qf: [97, 98],
  sf: [101],
};
const RIGHT = {
  r32: [76, 78, 79, 80, 86, 88, 85, 87],
  r16: [91, 92, 95, 96],
  qf: [99, 100],
  sf: [102],
};

function Side({
  f,
  side,
}: {
  f: Fixture;
  side: "home" | "away";
}) {
  const code = side === "home" ? f.home : f.away;
  const label = side === "home" ? f.home_label : f.away_label;
  const likely = (side === "home" ? f.likely_home : f.likely_away) ?? [];
  const goals = f.score ? (side === "home" ? f.score[0] : f.score[1]) : null;
  const won = f.winner != null && f.winner === code;
  const p =
    f.status === "upcoming"
      ? side === "home"
        ? f.p_home
        : f.p_away
      : null;

  if (code) {
    return (
      <div
        className={`flex items-center gap-1.5 ${
          f.status === "played" && !won ? "opacity-45" : ""
        }`}
      >
        <Flag code={code} className="text-[9px]" />
        <span className="font-data text-[11px] font-semibold">{code}</span>
        <span className="font-data ml-auto text-[10px] tabular-nums text-ink-dim">
          {goals != null ? (
            <span className="text-[11px] font-semibold text-ink">{goals}</span>
          ) : p != null ? (
            `${Math.round(p * 100)}%`
          ) : (
            ""
          )}
        </span>
      </div>
    );
  }
  const top = likely[0];
  return (
    <div
      className="flex items-center gap-1.5"
      title={likely.map((s) => `${s.code} ${(s.p * 100).toFixed(1)}%`).join(" · ")}
    >
      <span className="font-data w-6 text-[9px] text-ink-dim/70">{label}</span>
      {top ? (
        <>
          <Flag code={top.code} className="text-[9px] opacity-60" />
          <span className="font-data text-[10px] text-ink-dim">
            {top.code}
          </span>
          <span className="font-data ml-auto text-[10px] tabular-nums text-ink-dim/60">
            {Math.round(top.p * 100)}%
          </span>
        </>
      ) : (
        <span className="font-data text-[10px] text-ink-dim/50">tbd</span>
      )}
    </div>
  );
}

function Box({ f, final }: { f: Fixture; final?: boolean }) {
  return (
    <div
      className={`glass rounded-xl px-2.5 py-2 ${final ? "glass-strong" : ""}`}
      title={f.city ?? undefined}
    >
      <div className="font-data mb-1 flex justify-between text-[8px] tracking-[0.08em] text-ink-dim/70 uppercase">
        <span>M{f.match}</span>
        <span>{shortDate(f.date)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <Side f={f} side="home" />
        <Side f={f} side="away" />
      </div>
    </div>
  );
}

function Column({
  fixtures,
  ids,
  className = "",
}: {
  fixtures: Map<number, Fixture>;
  ids: number[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col justify-around gap-2 ${className}`}>
      {ids.map((id) => (
        <Box key={id} f={fixtures.get(id)!} />
      ))}
    </div>
  );
}

export function BracketView({
  live,
  baseline,
}: {
  live: Report;
  baseline: Report;
}) {
  const report = usePick(live, baseline);
  const fx = new Map(report.fixtures.map((f) => [f.match, f]));
  const final = fx.get(104)!;
  const third = fx.get(103)!;

  return (
    <section className="py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bracket</h1>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          each slot: most likely team + chance of landing there · hover for
          top 3
        </span>
      </div>

      <div className="hidden grid-cols-9 gap-2 xl:grid">
        <Column fixtures={fx} ids={LEFT.r32} />
        <Column fixtures={fx} ids={LEFT.r16} />
        <Column fixtures={fx} ids={LEFT.qf} />
        <Column fixtures={fx} ids={LEFT.sf} />
        <div className="flex flex-col justify-center gap-3">
          <div className="font-data text-center text-[9px] tracking-[0.2em] text-ink-dim uppercase">
            Final
          </div>
          <Box f={final} final />
          <div className="mt-4">
            <div className="font-data mb-1 text-center text-[8px] tracking-[0.15em] text-ink-dim/70 uppercase">
              3rd place
            </div>
            <Box f={third} />
          </div>
        </div>
        <Column fixtures={fx} ids={RIGHT.sf} />
        <Column fixtures={fx} ids={RIGHT.qf} />
        <Column fixtures={fx} ids={RIGHT.r16} />
        <Column fixtures={fx} ids={RIGHT.r32} />
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 xl:hidden">
        {[
          { label: "Round of 32", ids: [...LEFT.r32, ...RIGHT.r32] },
          { label: "Round of 16", ids: [...LEFT.r16, ...RIGHT.r16] },
          { label: "Quarter-finals", ids: [...LEFT.qf, ...RIGHT.qf] },
          { label: "Semi-finals", ids: [...LEFT.sf, ...RIGHT.sf] },
          { label: "Final", ids: [104, 103] },
        ].map((col) => (
          <div key={col.label} className="w-56 shrink-0 snap-start">
            <div className="font-data mb-2 text-[9px] tracking-[0.15em] text-ink-dim uppercase">
              {col.label}
            </div>
            <div className="flex flex-col gap-2">
              {col.ids.map((id) => (
                <Box key={id} f={fx.get(id)!} final={id === 104} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
