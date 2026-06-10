import { flag } from "@/lib/flags";
import { loadReport, type TeamRow } from "@/lib/report";

const REPO = "https://github.com/erikbohne/wc2026-simulation";

function pct(p: number, digits = 1): string {
  if (p === 0) return "—";
  if (p < 0.001) return "<0.1%";
  return `${(p * 100).toFixed(digits)}%`;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-pitch-line bg-pitch-raised/60 px-4 py-3">
      <div className="font-data text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
        {label}
      </div>
      <div className="font-data mt-1 text-lg text-chalk">{value}</div>
    </div>
  );
}

function PodiumCard({ team, rank }: { team: TeamRow; rank: number }) {
  const first = rank === 1;
  return (
    <div
      className={`rise relative border bg-pitch-raised/70 p-6 ${
        first ? "border-gold/40" : "border-pitch-line"
      }`}
      style={{ animationDelay: `${0.25 + rank * 0.08}s` }}
    >
      <div
        className={`font-display absolute top-4 right-5 text-5xl font-extrabold ${
          first ? "text-gold/30" : "text-pitch-line"
        }`}
      >
        {rank}
      </div>
      <div className="text-5xl">{flag(team.code)}</div>
      <div className="font-display mt-3 text-3xl font-bold uppercase leading-none tracking-wide">
        {team.name}
      </div>
      <div className="font-data mt-1 text-xs text-chalk-dim">
        Group {team.group} · {team.code}
      </div>
      <div
        className={`font-data mt-5 text-5xl font-semibold tracking-tight ${
          first ? "text-gold" : "text-grass"
        }`}
      >
        {pct(team.win)}
      </div>
      <div className="font-data text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
        wins the title
      </div>
      <div className="mt-4 h-1 w-full bg-pitch-line">
        <div
          className={first ? "h-1 bg-gold" : "h-1 bg-grass"}
          style={{ width: `${Math.min(team.win * 200, 100)}%` }}
        />
      </div>
      <div className="font-data mt-3 flex gap-4 text-xs text-chalk-dim">
        <span>Final {pct(team.final)}</span>
        <span>SF {pct(team.sf)}</span>
      </div>
    </div>
  );
}

function advanceProb(t: TeamRow): number {
  return (
    t.group_position.first +
    t.group_position.second +
    t.group_position.third_qualified
  );
}

function GroupCard({ letter, teams }: { letter: string; teams: TeamRow[] }) {
  const sorted = [...teams].sort((a, b) => advanceProb(b) - advanceProb(a));
  return (
    <div className="border border-pitch-line bg-pitch-raised/60 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
          Group <span className="text-grass">{letter}</span>
        </h3>
        <span className="font-data text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
          advance
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((t) => {
          const gp = t.group_position;
          return (
            <div key={t.code}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base">{flag(t.code)}</span>
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <span className="font-data text-[10px] text-chalk-dim/70">
                    {t.expected_points.toFixed(1)} xPts
                  </span>
                </div>
                <span className="font-data text-sm font-semibold tabular-nums text-grass">
                  {pct(advanceProb(t))}
                </span>
              </div>
              <div
                className="mt-1.5 flex h-1.5 w-full overflow-hidden bg-pitch-line"
                title={`1st ${pct(gp.first)} · 2nd ${pct(gp.second)} · 3rd & through ${pct(gp.third_qualified)} · out ${pct(gp.third_eliminated + gp.fourth)}`}
              >
                <div
                  className="h-full bg-grass"
                  style={{ width: `${gp.first * 100}%` }}
                />
                <div
                  className="h-full bg-grass-dim"
                  style={{ width: `${gp.second * 100}%` }}
                />
                <div
                  className="h-full bg-gold"
                  style={{ width: `${gp.third_qualified * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProbCell({ p, hideOnMobile }: { p: number; hideOnMobile?: boolean }) {
  return (
    <td
      className={`font-data px-3 py-2.5 text-right text-sm tabular-nums text-chalk-dim ${
        hideOnMobile ? "hidden md:table-cell" : ""
      }`}
    >
      {pct(p)}
    </td>
  );
}

export default function Home() {
  const report = loadReport();
  const teams = report.teams;
  const favourite = teams[0];
  const updated =
    report.fixed_matches === 0
      ? `Pre-tournament baseline · Elo ${report.elo_snapshot_date}`
      : `Updated ${report.results_updated} · ${report.fixed_matches}/104 matches played`;

  return (
    <div className="mx-auto w-full max-w-6xl px-5">
      <header className="flex items-center justify-between border-b border-pitch-line py-5">
        <div className="font-display text-2xl font-extrabold tracking-wide">
          WC26<span className="text-grass">·</span>SIM
        </div>
        <div className="flex items-center gap-5">
          <span className="font-data hidden text-xs text-chalk-dim sm:block">
            {updated}
          </span>
          <a
            href={REPO}
            className="font-data border border-pitch-line px-3 py-1.5 text-xs text-chalk transition-colors hover:border-grass hover:text-grass"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 sm:py-24">
          <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-8xl">
            <span className="rise block" style={{ animationDelay: "0s" }}>
              104 matches.
            </span>
            <span
              className="rise block text-grass"
              style={{ animationDelay: "0.1s" }}
            >
              100,000 futures.
            </span>
          </h1>
          <p
            className="rise mt-6 max-w-xl text-lg leading-relaxed text-chalk-dim"
            style={{ animationDelay: "0.2s" }}
          >
            A Monte Carlo simulation of the FIFA World Cup 2026, re-run after
            every real match. Elo-driven, Poisson-scored, reproducible to the
            last decimal — and fully open source.
          </p>
          <div
            className="rise mt-10 grid grid-cols-2 gap-px sm:grid-cols-4"
            style={{ animationDelay: "0.3s" }}
          >
            <StatChip
              label="Simulations"
              value={report.simulations.toLocaleString("en-US")}
            />
            <StatChip
              label="Matches played"
              value={`${report.fixed_matches} / 104`}
            />
            <StatChip
              label="Favourite"
              value={`${flag(favourite.code)} ${favourite.code} ${pct(favourite.win)}`}
            />
            <StatChip
              label="Goals / match"
              value={report.avg_goals_per_match.toFixed(2)}
            />
          </div>
        </section>

        <section>
          <h2 className="font-display mb-4 text-sm font-bold uppercase tracking-[0.25em] text-chalk-dim">
            The podium
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {teams.slice(0, 3).map((t, i) => (
              <PodiumCard key={t.code} team={t} rank={i + 1} />
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-chalk-dim">
              The 12 groups
            </h2>
            <div className="font-data flex items-center gap-4 text-[10px] uppercase tracking-[0.15em] text-chalk-dim">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 bg-grass" /> 1st
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 bg-grass-dim" /> 2nd
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 bg-gold" /> 3rd &amp;
                through
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }, (_, i) =>
              String.fromCharCode(65 + i),
            ).map((letter) => (
              <GroupCard
                key={letter}
                letter={letter}
                teams={teams.filter((t) => t.group === letter)}
              />
            ))}
          </div>
        </section>

        <section className="pb-16">
          <h2 className="font-display mb-4 text-sm font-bold uppercase tracking-[0.25em] text-chalk-dim">
            All 48 teams
          </h2>
          <div className="overflow-x-auto border border-pitch-line">
            <table className="w-full border-collapse">
              <thead>
                <tr className="font-data border-b border-pitch-line bg-pitch-raised text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
                  <th className="px-3 py-3 text-left font-medium">#</th>
                  <th className="px-3 py-3 text-left font-medium">Team</th>
                  <th className="hidden px-3 py-3 text-left font-medium sm:table-cell">
                    Grp
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Title</th>
                  <th className="px-3 py-3 text-right font-medium">Final</th>
                  <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                    SF
                  </th>
                  <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                    QF
                  </th>
                  <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                    R16
                  </th>
                  <th className="px-3 py-3 text-right font-medium">R32</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => (
                  <tr
                    key={t.code}
                    className="border-b border-pitch-line/60 transition-colors last:border-0 hover:bg-pitch-raised"
                  >
                    <td className="font-data px-3 py-2.5 text-sm text-chalk-dim">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{flag(t.code)}</span>
                        <span className="font-medium">{t.name}</span>
                        <span className="font-data text-[10px] text-chalk-dim/70">
                          {t.code}
                        </span>
                      </div>
                    </td>
                    <td className="font-data hidden px-3 py-2.5 text-sm text-chalk-dim sm:table-cell">
                      {t.group}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-data text-sm font-semibold tabular-nums text-grass">
                        {pct(t.win)}
                      </div>
                      <div className="ml-auto mt-1 h-0.5 w-20 bg-pitch-line">
                        <div
                          className="h-0.5 bg-grass"
                          style={{
                            width: `${Math.min(t.win * 300, 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <ProbCell p={t.final} />
                    <ProbCell p={t.sf} hideOnMobile />
                    <ProbCell p={t.qf} hideOnMobile />
                    <ProbCell p={t.r16} hideOnMobile />
                    <ProbCell p={t.r32} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-pitch-line py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-chalk-dim">
              How it works
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-chalk-dim">
              Every run simulates the full 104-match tournament — group
              tiebreakers, third-place allocation and bracket per the official
              FIFA regulations. Goals are sampled from Elo-derived Poisson
              rates ({report.elo_source}, {report.elo_snapshot_date}), with
              ratings updating dynamically inside each tournament. Played
              matches are locked to their real results; only the remaining
              fixtures are sampled.
            </p>
          </div>
          <div className="font-data flex flex-col gap-2 text-xs text-chalk-dim">
            <a href={REPO} className="hover:text-grass">
              Source on GitHub ↗
            </a>
            <a href={`${REPO}/blob/main/data/results.json`} className="hover:text-grass">
              Match results data ↗
            </a>
            <span>
              seed {report.seed} · {report.pens} pens · MIT
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
