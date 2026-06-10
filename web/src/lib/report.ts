import { readFileSync } from "node:fs";
import path from "node:path";

export interface GroupPositionDist {
  first: number;
  second: number;
  third_qualified: number;
  third_eliminated: number;
  fourth: number;
}

export interface Fixture {
  match: number;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  group: string | null;
  date: string;
  city: string | null;
  home: string | null;
  away: string | null;
  home_label: string;
  away_label: string;
  status: "played" | "upcoming" | "tbd";
  score: [number, number] | null;
  penalties: boolean;
  winner: string | null;
  p_home: number | null;
  p_draw: number | null;
  p_away: number | null;
  likely_score: [number, number] | null;
  likely_p: number | null;
}

export interface TeamRow {
  code: string;
  name: string;
  group: string;
  elo: number;
  elo_rank: number;
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
  fixtures: Fixture[];
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
