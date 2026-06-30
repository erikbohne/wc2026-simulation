import type { Fixture, TitlePath } from "@/lib/report";

export type BracketFixtureStatus = Fixture["status"] | "path";

export type BracketFixture = Omit<Fixture, "status"> & {
  status: BracketFixtureStatus;
};

function slotFavorsTeam(
  f: Pick<Fixture, "home" | "away" | "likely_home" | "likely_away">,
  team: string,
  side: "home" | "away",
): boolean {
  if (side === "home" ? f.home === team : f.away === team) return true;
  const likely = side === "home" ? f.likely_home : f.likely_away;
  return likely?.some((s) => s.code === team) ?? false;
}

export function applyTitlePath(
  fixtures: Fixture[],
  team: string,
  titlePath: TitlePath,
): Map<number, BracketFixture> {
  const byMatch = new Map<number, BracketFixture>(
    fixtures.map((f) => [f.match, { ...f }]),
  );

  titlePath.matches.forEach((matchNo, i) => {
    const opp = titlePath.opponents[i];
    const fx = byMatch.get(matchNo);
    if (!fx || fx.status === "played") return;

    const teamHome =
      slotFavorsTeam(fx, team, "home") ||
      (!slotFavorsTeam(fx, team, "away") && i % 2 === 0);

    byMatch.set(matchNo, {
      ...fx,
      status: "path",
      home: teamHome ? team : opp,
      away: teamHome ? opp : team,
      home_label: teamHome ? team : opp,
      away_label: teamHome ? opp : team,
      winner: team,
      score: null,
      p_home: null,
      p_away: null,
      likely_home: undefined,
      likely_away: undefined,
    });
  });

  return byMatch;
}