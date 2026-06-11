import type { Metadata } from "next";
import { GroupCard } from "@/components/group-card";
import { loadReport } from "@/lib/report";

export const metadata: Metadata = {
  title: "Groups — WC26·SIM",
  description:
    "Finishing-position probabilities for all 12 World Cup 2026 groups, from 100,000 simulated tournaments.",
};

export default function GroupsPage() {
  const report = loadReport();
  return (
    <section className="py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">The 12 groups</h1>
        <div className="font-data flex items-center gap-4 text-[10px] tracking-[0.12em] text-ink-dim uppercase">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-win/70" />
            ≥50%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber/70" />
            25–50%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-loss/60" />
            &lt;25%
          </span>
          <span>→ KO = advance incl. best thirds</span>
        </div>
      </div>
      <div className="grid gap-4 pb-4 lg:grid-cols-2">
        {Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)).map(
          (letter) => (
            <GroupCard
              key={letter}
              letter={letter}
              teams={report.teams.filter((t) => t.group === letter)}
            />
          ),
        )}
      </div>
    </section>
  );
}
