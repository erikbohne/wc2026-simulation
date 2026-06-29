import type { Metadata } from "next";
import { ScenarioView, type GroupFixture } from "@/components/scenario-tree";
import { loadReport } from "@/lib/report";

export const metadata: Metadata = {
  title: "Scenario",
  description:
    "Live Monte Carlo scenario tree — change any group-stage result and watch a team's advancement odds resimulate in real time, in the browser.",
};

export default function ScenarioPage() {
  const report = loadReport();

  const teams = report.teams
    .map((t) => ({ code: t.code, name: t.name, group: t.group }))
    .sort((a, b) => (a.group === b.group ? a.name.localeCompare(b.name) : a.group.localeCompare(b.group)));

  const groupFixtures: GroupFixture[] = report.fixtures
    .filter((f) => f.stage === "group" && f.home && f.away)
    .map((f) => ({
      match: f.match,
      group: f.group as string,
      home: f.home as string,
      away: f.away as string,
      homeLabel: f.home_label,
      awayLabel: f.away_label,
      status: f.status,
      score: f.score,
    }));

  // Real played group results, with each match's group, to seed the simulation.
  const groupOf: Record<string, string> = {};
  for (const t of report.teams) groupOf[t.code] = t.group;
  const baseMatches = groupFixtures
    .filter((f) => f.status === "played" && f.score)
    .map((f) => ({ home: f.home, away: f.away, score: f.score as [number, number], group: f.group }));

  return (
    <ScenarioView
      teams={teams}
      groupFixtures={groupFixtures}
      baseMatches={baseMatches}
      updated={report.results_updated}
    />
  );
}
