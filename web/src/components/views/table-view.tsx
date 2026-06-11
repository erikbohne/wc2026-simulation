"use client";

import { Leaderboard } from "@/components/leaderboard";
import { usePick } from "@/components/mode";
import type { Report } from "@/lib/report";

export function TableView({
  live,
  baseline,
}: {
  live: Report;
  baseline: Report;
}) {
  const report = usePick(live, baseline);
  return (
    <section className="py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">All 48 teams</h1>
        <span className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          sorted by title probability · ▲▼ = sim rank vs Elo rank
        </span>
      </div>
      <div className="pb-4">
        <Leaderboard teams={report.teams} />
      </div>
    </section>
  );
}
