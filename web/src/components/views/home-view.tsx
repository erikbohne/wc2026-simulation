"use client";

import Link from "next/link";
import { MatchCard } from "@/components/match-card";
import { usePick } from "@/components/mode";
import { OddsChart } from "@/components/odds-chart";
import { PodiumCard } from "@/components/podium-card";
import { Terminal } from "@/components/terminal";
import type { HistoryPoint, Report } from "@/lib/report";

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
  const played = report.fixtures.filter((f) => f.status === "played");
  const recent = played.slice(-2);
  const next = report.fixtures
    .filter((f) => f.status === "upcoming")
    .slice(0, 3);

  return (
    <>
      <section className="py-10 sm:py-14">
        <div className="rise mx-auto max-w-3xl">
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
