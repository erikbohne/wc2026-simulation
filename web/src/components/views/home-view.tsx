"use client";

import Link from "next/link";
import { Flag } from "@/components/flag";
import { MatchCard } from "@/components/match-card";
import { usePick } from "@/components/mode";
import { OddsChart } from "@/components/odds-chart";
import { PodiumCard } from "@/components/podium-card";
import { Terminal } from "@/components/terminal";
import { pct } from "@/lib/format";
import type { HistoryPoint, Report } from "@/lib/report";

function StatChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5">
      <div className="font-data text-[10px] tracking-[0.15em] text-ink-dim uppercase">
        {label}
      </div>
      <div className="font-data mt-1 flex items-center gap-1.5 text-lg tabular-nums">
        {value}
      </div>
    </div>
  );
}

export function HomeView({
  live,
  baseline,
  history,
}: {
  live: Report;
  baseline: Report;
  history: HistoryPoint[];
}) {
  const report = usePick(live, baseline);
  const teams = report.teams;
  const favourite = teams[0];
  const played = report.fixtures.filter((f) => f.status === "played");
  const recent = played.slice(-2);
  const next = report.fixtures
    .filter((f) => f.status === "upcoming")
    .slice(0, 3);

  return (
    <>
      <section className="grid items-center gap-10 py-12 lg:grid-cols-2 sm:py-16">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl">
            <span className="rise block" style={{ animationDelay: "0s" }}>
              104 matches.
            </span>
            <span
              className="rise block bg-gradient-to-r from-win-deep via-accent to-accent bg-clip-text text-transparent"
              style={{ animationDelay: "0.1s" }}
            >
              100,000 futures.
            </span>
          </h1>
          <p
            className="rise mt-5 max-w-xl text-lg leading-relaxed text-ink-dim"
            style={{ animationDelay: "0.2s" }}
          >
            A Monte Carlo simulation of the FIFA World Cup 2026, re-run after
            every real match. Elo-driven, Poisson-scored, reproducible to the
            last decimal — and fully open source.
          </p>
          <div
            className="rise mt-8 grid grid-cols-2 gap-3"
            style={{ animationDelay: "0.3s" }}
          >
            <StatChip
              label="Matches played"
              value={`${report.fixed_matches} / 104`}
            />
            <StatChip
              label="Favourite"
              value={
                <>
                  <Flag code={favourite.code} className="text-sm" />
                  {favourite.code} {pct(favourite.win)}
                </>
              }
            />
          </div>
        </div>
        <div className="rise" style={{ animationDelay: "0.25s" }}>
          <Terminal report={report} />
        </div>
      </section>

      <section className="pb-14">
        <OddsChart history={history} teams={live.teams} />
      </section>

      <section className="pb-14">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold tracking-tight text-ink-dim">
            Matchday
          </h2>
          <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
            {recent.length > 0 ? "last results · " : ""}next fixtures ·
            win/draw/win + most likely score
          </span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row">
          {recent.map((f) => (
            <MatchCard key={f.match} f={f} />
          ))}
          {next.map((f) => (
            <MatchCard key={f.match} f={f} />
          ))}
        </div>
      </section>

      <section className="pb-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-bold tracking-tight text-ink-dim">
            The podium
          </h2>
          <Link
            href="/table"
            className="text-sm font-medium text-accent transition-opacity hover:opacity-70"
          >
            Full table →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {teams.slice(0, 3).map((t, i) => (
            <PodiumCard key={t.code} team={t} rank={i + 1} />
          ))}
        </div>
      </section>
    </>
  );
}
