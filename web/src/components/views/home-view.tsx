"use client";

import { usePick } from "@/components/mode";
import { OddsChart } from "@/components/odds-chart";
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

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="py-10 sm:py-14">
        <div className="rise">
          <Terminal report={report} />
        </div>
      </section>
      <section className="pb-14">
        <OddsChart history={history} teams={live.teams} />
      </section>
    </div>
  );
}
