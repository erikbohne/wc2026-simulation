"use client";

import Link from "next/link";
import { MatchCard } from "@/components/match-card";
import { usePick } from "@/components/mode";
import { PodiumCard } from "@/components/podium-card";
import { flag } from "@/lib/flags";
import { pct } from "@/lib/format";
import type { Report } from "@/lib/report";

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5">
      <div className="font-data text-[10px] tracking-[0.15em] text-ink-dim uppercase">
        {label}
      </div>
      <div className="font-data mt-1 text-lg tabular-nums">{value}</div>
    </div>
  );
}

export function HomeView({
  live,
  baseline,
}: {
  live: Report;
  baseline: Report;
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
      <section className="py-14 sm:py-20">
        <h1 className="text-5xl font-bold tracking-tighter sm:text-7xl">
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
          className="rise mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ animationDelay: "0.3s" }}
        >
          <StatChip
            label="Simulations"
            value={report.simulations.toLocaleString("en-US")}
          />
          <StatChip
            label="Matches played"
            value={`${report.fixed_matches} / 104`}
          />
          <StatChip
            label="Favourite"
            value={`${flag(favourite.code)} ${favourite.code} ${pct(favourite.win)}`}
          />
          <StatChip
            label="Goals / match"
            value={report.avg_goals_per_match.toFixed(2)}
          />
        </div>
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
