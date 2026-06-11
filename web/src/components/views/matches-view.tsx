"use client";

import { useEffect, useRef } from "react";
import { Flag } from "@/components/flag";
import { usePick } from "@/components/mode";
import { fixtureStage } from "@/lib/format";
import type { Fixture, Report } from "@/lib/report";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[day]} ${MONTHS[m - 1]} ${d}`;
}

function TeamCell({
  f,
  side,
  align,
}: {
  f: Fixture;
  side: "home" | "away";
  align: "left" | "right";
}) {
  const code = side === "home" ? f.home : f.away;
  const label = side === "home" ? f.home_label : f.away_label;
  const likely = (side === "home" ? f.likely_home : f.likely_away) ?? [];
  const won = f.winner != null && f.winner === code;
  const dim = f.status === "played" && !won;
  const top = likely[0];

  const content = code ? (
    <>
      <Flag code={code} className="text-xs" />
      <span className="font-data text-[13px] font-semibold">{code}</span>
    </>
  ) : (
    <>
      <span className="font-data text-[10px] text-ink-dim/70">{label}</span>
      {top && (
        <span
          className="flex items-center gap-1"
          title={likely
            .map((s) => `${s.code} ${(s.p * 100).toFixed(1)}%`)
            .join(" · ")}
        >
          <Flag code={top.code} className="text-[10px] opacity-60" />
          <span className="font-data text-[11px] text-ink-dim">
            {top.code} {Math.round(top.p * 100)}%
          </span>
        </span>
      )}
    </>
  );
  return (
    <div
      className={`flex items-center gap-1.5 ${
        align === "right" ? "flex-row-reverse" : ""
      } ${dim ? "opacity-45" : ""}`}
    >
      {content}
    </div>
  );
}

function MatchCard({ f, next }: { f: Fixture; next: boolean }) {
  const played = f.status === "played";
  return (
    <div
      className={`glass flex flex-col gap-2 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:gap-3 ${
        next ? "ring-1 ring-win/60" : ""
      } ${played ? "opacity-90" : ""}`}
    >
      <div className="font-data flex items-center gap-2 text-[10px] tracking-[0.08em] text-ink-dim uppercase sm:w-52 sm:shrink-0">
        <span className="w-9">M{f.match}</span>
        <span className="truncate">
          {fixtureStage(f)}
          {f.city ? ` · ${f.city}` : ""}
        </span>
        {next && (
          <span className="rounded-md bg-win/20 px-1.5 py-0.5 font-semibold text-win-deep">
            NEXT
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center gap-3">
        <div className="flex flex-1 justify-end">
          <TeamCell f={f} side="home" align="right" />
        </div>
        <div className="font-data w-14 text-center text-sm font-semibold tabular-nums">
          {played && f.score ? (
            <span className={f.penalties ? "text-amber" : ""}>
              {f.score[0]}–{f.score[1]}
            </span>
          ) : f.likely_score && f.home ? (
            <span className="text-ink-dim/80">
              ~{f.likely_score[0]}–{f.likely_score[1]}
            </span>
          ) : (
            <span className="text-ink-dim/50">vs</span>
          )}
        </div>
        <div className="flex flex-1 justify-start">
          <TeamCell f={f} side="away" align="left" />
        </div>
      </div>

      <div className="sm:w-56 sm:shrink-0">
        {played ? (
          <div className="font-data flex items-center gap-2 text-[10px] text-ink-dim sm:justify-end">
            <span className="rounded-md bg-win/15 px-1.5 py-0.5 font-semibold text-win-deep">
              FT{f.penalties ? "·PENS" : ""}
            </span>
            {f.p_home != null && (
              <span>
                pre-match {Math.round(f.p_home * 100)}/
                {Math.round((f.p_draw ?? 0) * 100)}/
                {Math.round((f.p_away ?? 0) * 100)}
              </span>
            )}
          </div>
        ) : f.p_home != null ? (
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-win"
                style={{ width: `${f.p_home * 100}%` }}
              />
              {f.p_draw != null && (
                <div
                  className="h-full rounded-full bg-ink/15"
                  style={{ width: `${f.p_draw * 100}%` }}
                />
              )}
              <div
                className="h-full rounded-full bg-loss/80"
                style={{ width: `${(f.p_away ?? 0) * 100}%` }}
              />
            </div>
            <span className="font-data w-20 text-right text-[10px] tabular-nums text-ink-dim">
              {Math.round(f.p_home * 100)}
              {f.p_draw != null ? ` · ${Math.round(f.p_draw * 100)}` : ""} ·{" "}
              {Math.round((f.p_away ?? 0) * 100)}
            </span>
          </div>
        ) : (
          <div className="font-data text-[10px] text-ink-dim/60 sm:text-right">
            most likely pairing shown
          </div>
        )}
      </div>
    </div>
  );
}

export function MatchesView({
  live,
  baseline,
}: {
  live: Report;
  baseline: Report;
}) {
  const report = usePick(live, baseline);
  const fixtures = report.fixtures;
  const nextMatch = fixtures.find((f) => f.status !== "played")?.match;
  const anyPlayed = fixtures.some((f) => f.status === "played");
  const nextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anyPlayed) {
      nextRef.current?.scrollIntoView({ block: "start" });
    }
  }, [anyPlayed, report]);

  const days: { date: string; fixtures: Fixture[] }[] = [];
  for (const f of fixtures) {
    const last = days[days.length - 1];
    if (last && last.date === f.date) {
      last.fixtures.push(f);
    } else {
      days.push({ date: f.date, fixtures: [f] });
    }
  }

  return (
    <section className="py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          all 104 · results above, schedule below
        </span>
      </div>
      <div className="flex flex-col gap-7">
        {days.map((day) => (
          <div key={day.date}>
            <div className="mb-3 flex items-center gap-4">
              <span className="font-data text-[11px] font-semibold tracking-[0.2em] text-ink-dim uppercase">
                {dayLabel(day.date)}
              </span>
              {day.fixtures[0].match === 73 && (
                <span className="font-data text-[10px] tracking-[0.15em] text-win-deep uppercase">
                  knockouts
                </span>
              )}
              <div className="h-px flex-1 bg-ink/10" />
            </div>
            <div className="flex flex-col gap-3">
              {day.fixtures.map((f) => {
                const isNext = f.match === nextMatch;
                return (
                  <div
                    key={f.match}
                    ref={isNext ? nextRef : undefined}
                    className="scroll-mt-24"
                  >
                    <MatchCard f={f} next={isNext} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
