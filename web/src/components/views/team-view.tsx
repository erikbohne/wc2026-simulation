"use client";

import Link from "next/link";
import { GroupCard } from "@/components/group-card";
import { MatchCard } from "@/components/match-card";
import { Flag } from "@/components/flag";
import { usePick } from "@/components/mode";
import { pct } from "@/lib/format";
import type { Report, TeamRow } from "@/lib/report";

function JourneyStep({
  label,
  p,
  last,
}: {
  label: string;
  p: number;
  last?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div
        className={`font-data text-lg font-semibold tabular-nums ${
          last ? "text-gold" : "text-win-deep"
        }`}
      >
        {pct(p)}
      </div>
      <div className="h-20 w-3 overflow-hidden rounded-full bg-ink/8 sm:h-24">
        <div
          className={`mx-auto w-3 rounded-full ${last ? "bg-gold" : "bg-win"}`}
          style={{ height: `${Math.max(p * 100, 2)}%`, marginTop: "auto" }}
        />
      </div>
      <div className="font-data text-[10px] tracking-[0.1em] text-ink-dim uppercase">
        {label}
      </div>
    </div>
  );
}

export function TeamView({
  code,
  live,
  baseline,
}: {
  code: string;
  live: Report;
  baseline: Report;
}) {
  const report = usePick(live, baseline);
  const simRank = report.teams.findIndex((t) => t.code === code) + 1;
  const team = report.teams[simRank - 1] as TeamRow | undefined;
  if (!team) return null;

  const matches = report.fixtures.filter(
    (f) => f.home === code || f.away === code,
  );
  const gp = team.group_position;

  return (
    <section className="py-10">
      <div className="glass rounded-3xl p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Flag code={team.code} className="text-5xl" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {team.name}
              </h1>
              <div className="font-data mt-1 text-xs text-ink-dim">
                <Link
                  href="/groups"
                  className="transition-colors hover:text-accent"
                >
                  Group {team.group}
                </Link>{" "}
                · Elo {team.elo.toFixed(0)} (#{team.elo_rank}) · sim rank #
                {simRank}
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="font-data text-3xl font-semibold tabular-nums text-win-deep">
                {pct(team.win)}
              </div>
              <div className="font-data text-[10px] tracking-[0.15em] text-ink-dim uppercase">
                wins the title
              </div>
            </div>
            <div>
              <div className="font-data text-3xl font-semibold tabular-nums">
                {team.expected_points.toFixed(1)}
              </div>
              <div className="font-data text-[10px] tracking-[0.15em] text-ink-dim uppercase">
                expected points
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="glass rounded-3xl p-6 lg:col-span-3">
          <h2 className="text-sm font-bold tracking-tight text-ink-dim">
            Projected journey
          </h2>
          <div className="mt-4 flex items-end gap-1 sm:gap-2">
            <JourneyStep label="R32" p={team.r32} />
            <JourneyStep label="R16" p={team.r16} />
            <JourneyStep label="QF" p={team.qf} />
            <JourneyStep label="SF" p={team.sf} />
            <JourneyStep label="Final" p={team.final} />
            <JourneyStep label="Title" p={team.win} last />
          </div>
          <div className="font-data mt-4 text-[11px] text-ink-dim">
            Group finish: 1st {pct(gp.first)} · 2nd {pct(gp.second)} · 3rd
            &amp; through {pct(gp.third_qualified)} · out{" "}
            {pct(gp.third_eliminated + gp.fourth)} · xGD{" "}
            {team.expected_gd >= 0 ? "+" : ""}
            {team.expected_gd.toFixed(1)}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <h2 className="text-sm font-bold tracking-tight text-ink-dim">
            Most likely R32 opponents
          </h2>
          <div className="mt-4 flex flex-col gap-2.5">
            {team.r32_opponents.slice(0, 6).map((o) => (
              <Link
                key={o.code}
                href={`/team/${o.code}`}
                className="flex items-center justify-between rounded-xl px-2 py-1 transition-colors hover:bg-white/60"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Flag code={o.code} className="text-sm" />
                  {o.code}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1 w-24 overflow-hidden rounded-full bg-ink/8">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(o.p * 400, 100)}%` }}
                    />
                  </span>
                  <span className="font-data w-12 text-right text-xs tabular-nums text-ink-dim">
                    {pct(o.p)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-sm font-bold tracking-tight text-ink-dim">
          Matches
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((f) => (
            <MatchCard key={f.match} f={f} />
          ))}
        </div>
      </div>

      <div className="mt-10 pb-4">
        <h2 className="mb-4 text-sm font-bold tracking-tight text-ink-dim">
          Group {team.group} in full
        </h2>
        <div className="lg:max-w-xl">
          <GroupCard
            letter={team.group}
            teams={report.teams.filter((t) => t.group === team.group)}
          />
        </div>
      </div>
    </section>
  );
}
