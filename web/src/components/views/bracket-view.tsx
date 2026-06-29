"use client";

import { useEffect, useRef } from "react";
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

type BracketPhase = "played" | "next" | "potential";

function phase(f: Fixture): BracketPhase {
  if (f.status === "played") return "played";
  if (f.status === "upcoming") return "next";
  return "potential";
}

function boxClass(f: Fixture, final?: boolean): string {
  const p = phase(f);
  const tone =
    p === "played"
      ? "bracket-played"
      : p === "next"
        ? "bracket-next"
        : "bracket-potential";
  return `bracket-box ${tone}${final ? " bracket-final" : ""}`;
}

function connectorClass(f: Fixture): string {
  const p = phase(f);
  return p === "played"
    ? "bracket-connector-played"
    : p === "next"
      ? "bracket-connector-next"
      : "bracket-connector-potential";
}

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
  const p = phase(f) === "next" ? (side === "home" ? f.p_home : f.p_away) : null;
  const dimPlayed = f.status === "played" && !won;
  const dimPotential = phase(f) === "potential";

  if (code) {
    return (
      <div
        className={`flex items-center gap-1.5 ${
          dimPlayed ? "opacity-40" : dimPotential ? "opacity-75" : ""
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
  const ghost = phase(f) === "potential";
  return (
    <div
      className={`flex items-center gap-1.5 ${ghost ? "opacity-55" : ""}`}
      title={likely.map((s) => `${s.code} ${(s.p * 100).toFixed(1)}%`).join(" · ")}
    >
      <span className="font-data w-6 text-[9px] text-ink-dim/50">{label}</span>
      {top ? (
        <>
          <Flag code={top.code} className="text-[9px] opacity-45" />
          <span className="font-data text-[10px] text-ink-dim/80">
            {top.code}
          </span>
          <span className="font-data ml-auto text-[10px] tabular-nums text-ink-dim/45">
            {Math.round(top.p * 100)}%
          </span>
        </>
      ) : (
        <span className="font-data text-[10px] text-ink-dim/35">—</span>
      )}
    </div>
  );
}

function Box({ f, final }: { f: Fixture; final?: boolean }) {
  return (
    <div
      className={`rounded-xl px-2.5 py-2 ${boxClass(f, final)}`}
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

function MiniSide({ f, side }: { f: Fixture; side: "home" | "away" }) {
  const code = side === "home" ? f.home : f.away;
  const label = side === "home" ? f.home_label : f.away_label;
  const likely = (side === "home" ? f.likely_home : f.likely_away) ?? [];
  const goals = f.score ? (side === "home" ? f.score[0] : f.score[1]) : null;
  const won = f.winner != null && f.winner === code;
  const p = phase(f) === "next" ? (side === "home" ? f.p_home : f.p_away) : null;
  const top = likely[0];
  const dimPlayed = f.status === "played" && !won;
  const dimPotential = phase(f) === "potential";

  return (
    <div
      className={`flex w-9 flex-col items-center gap-0.5 ${
        dimPlayed ? "opacity-40" : dimPotential ? "opacity-55" : ""
      }`}
      title={
        code
          ? code
          : likely.map((s) => `${s.code} ${(s.p * 100).toFixed(1)}%`).join(" · ")
      }
    >
      {code ? (
        <Flag code={code} className="text-[10px]" />
      ) : top ? (
        <Flag code={top.code} className="text-[10px] opacity-40" />
      ) : (
        <span className="h-[10px] w-[13px] rounded-[2px] bg-ink/8" />
      )}
      <span className="font-data text-[9px] font-semibold">
        {code ?? label}
      </span>
      <span className="font-data text-[8px] tabular-nums text-ink-dim">
        {goals != null
          ? goals
          : p != null
            ? `${Math.round(p * 100)}%`
            : top
              ? `${Math.round(top.p * 100)}%`
              : ""}
      </span>
    </div>
  );
}

function MiniBox({ f, final }: { f: Fixture; final?: boolean }) {
  return (
    <div className={`rounded-xl px-1 py-1.5 ${boxClass(f, final)}`}>
      <div className="flex justify-center gap-1">
        <MiniSide f={f} side="home" />
        <MiniSide f={f} side="away" />
      </div>
      <div className="font-data mt-0.5 text-center text-[7px] tracking-[0.05em] text-ink-dim/70 uppercase">
        {shortDate(f.date)}
      </div>
    </div>
  );
}

function Elbow({ span, f }: { span: number; f: Fixture }) {
  const tone = connectorClass(f);
  return (
    <div style={{ gridColumn: `span ${span}` }} className="px-[25%]">
      <div
        className={`h-3 rounded-b-lg border-x border-b border-ink/15 ${tone}`}
      />
      <div className={`mx-auto h-2.5 w-px bg-ink/15 ${tone}`} />
    </div>
  );
}

const MOBILE_ROWS = [
  { ids: [...LEFT.r32, ...RIGHT.r32], span: 1 },
  { ids: [...LEFT.r16, ...RIGHT.r16], span: 2 },
  { ids: [97, 98, 99, 100], span: 4 },
  { ids: [101, 102], span: 8 },
];

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
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  return (
    <section className="py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bracket</h1>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          most likely team per slot · hover for top 3
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

      <div ref={scroller} className="-mx-5 overflow-x-auto px-5 pb-4 xl:hidden">
        <div className="grid w-[1380px] grid-cols-[repeat(16,1fr)] gap-x-1.5">
          {MOBILE_ROWS.map((row, ri) => (
            <div key={ri} className="contents">
              {ri > 0 &&
                row.ids.map((id) => (
                  <Elbow key={`e${id}`} span={row.span} f={fx.get(id)!} />
                ))}
              {row.ids.map((id) => (
                <div key={id} style={{ gridColumn: `span ${row.span}` }}>
                  <div className="mx-auto max-w-44">
                    <MiniBox f={fx.get(id)!} />
                  </div>
                </div>
              ))}
            </div>
          ))}
          <Elbow span={16} f={final} />
          <div className="col-span-full flex flex-col items-center gap-3">
            <div className="w-32">
              <div className="font-data mb-1 text-center text-[8px] tracking-[0.2em] text-ink-dim uppercase">
                Final
              </div>
              <MiniBox f={final} final />
            </div>
            <div className="w-32">
              <div className="font-data mb-1 text-center text-[8px] tracking-[0.15em] text-ink-dim/70 uppercase">
                3rd place
              </div>
              <MiniBox f={third} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
