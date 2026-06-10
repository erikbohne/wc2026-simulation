import { readFileSync } from "node:fs";
import path from "node:path";

export interface GroupPositionDist {
  first: number;
  second: number;
  third_qualified: number;
  third_eliminated: number;
  fourth: number;
}

export interface TeamRow {
  code: string;
  name: string;
  group: string;
  win: number;
  final: number;
  sf: number;
  qf: number;
  r16: number;
  r32: number;
  third_place_win: number;
  expected_points: number;
  expected_gd: number;
  group_position: GroupPositionDist;
}

export interface Report {
  simulations: number;
  seed: number;
  dynamic_elo: boolean;
  pens: string;
  elo_snapshot_date: string;
  elo_source: string;
  results_updated: string | null;
  fixed_matches: number;
  avg_goals_per_match: number;
  teams: TeamRow[];
}

export function loadReport(): Report {
  const file = path.join(
    process.cwd(),
    "..",
    "data",
    "snapshots",
    "latest.json",
  );
  return JSON.parse(readFileSync(file, "utf8")) as Report;
}
