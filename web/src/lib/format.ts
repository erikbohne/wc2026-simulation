import type { Fixture, TeamRow } from "@/lib/report";

export function pct(p: number, digits = 1): string {
  if (p === 0) return "—";
  if (p < 0.001) return "<0.1%";
  return `${(p * 100).toFixed(digits)}%`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

const STAGE_LABEL: Record<Fixture["stage"], string> = {
  group: "Group",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  third: "3rd place",
  final: "Final",
};

export function fixtureStage(f: Fixture): string {
  return f.stage === "group" ? `Group ${f.group}` : STAGE_LABEL[f.stage];
}

export function advanceProb(t: TeamRow): number {
  return (
    t.group_position.first +
    t.group_position.second +
    t.group_position.third_qualified
  );
}
