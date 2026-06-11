import type { Metadata } from "next";
import { Leaderboard } from "@/components/leaderboard";
import { loadReport } from "@/lib/report";

export const metadata: Metadata = {
  title: "Table — WC26·SIM",
  description:
    "Advancement probabilities for all 48 World Cup 2026 teams, from 100,000 simulated tournaments.",
};

export default function TablePage() {
  const report = loadReport();
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
