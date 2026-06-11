import Link from "next/link";
import { Flag } from "@/components/flag";
import { pct } from "@/lib/format";
import type { TeamRow } from "@/lib/report";

function RankDelta({ simRank, eloRank }: { simRank: number; eloRank: number }) {
  const delta = eloRank - simRank;
  if (delta === 0) {
    return <span className="font-data text-xs text-ink-dim/40">·</span>;
  }
  return (
    <span
      className={`font-data text-xs tabular-nums ${
        delta > 0 ? "text-win-deep" : "text-loss"
      }`}
      title={`Elo rank ${eloRank} → sim rank ${simRank}`}
    >
      {delta > 0 ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

function ProbCell({ p, hideOnMobile }: { p: number; hideOnMobile?: boolean }) {
  return (
    <td
      className={`font-data px-3 py-2.5 text-right text-sm tabular-nums text-ink-dim ${
        hideOnMobile ? "hidden md:table-cell" : ""
      }`}
    >
      {pct(p)}
    </td>
  );
}

export function Leaderboard({ teams }: { teams: TeamRow[] }) {
  return (
    <div className="glass overflow-x-auto rounded-3xl">
      <table className="w-full border-collapse">
        <thead>
          <tr className="font-data border-b border-hair text-[10px] tracking-[0.12em] text-ink-dim uppercase">
            <th className="px-3 py-3.5 text-left font-medium">#</th>
            <th
              className="px-1 py-3.5 text-left font-medium"
              title="Sim rank vs Elo rank: ▲ = sim ranks the team higher than raw Elo"
            >
              vs Elo
            </th>
            <th className="px-3 py-3.5 text-left font-medium">Team</th>
            <th className="hidden px-3 py-3.5 text-left font-medium sm:table-cell">
              Grp
            </th>
            <th className="px-3 py-3.5 text-right font-medium">Title</th>
            <th className="px-3 py-3.5 text-right font-medium">Final</th>
            <th className="hidden px-3 py-3.5 text-right font-medium md:table-cell">
              SF
            </th>
            <th className="hidden px-3 py-3.5 text-right font-medium md:table-cell">
              QF
            </th>
            <th className="hidden px-3 py-3.5 text-right font-medium md:table-cell">
              R16
            </th>
            <th className="px-3 py-3.5 text-right font-medium">R32</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr
              key={t.code}
              className="border-b border-hair transition-colors last:border-0 hover:bg-white/50"
            >
              <td className="font-data px-3 py-2.5 text-sm text-ink-dim">
                {i + 1}
              </td>
              <td className="px-1 py-2.5">
                <RankDelta simRank={i + 1} eloRank={t.elo_rank} />
              </td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/team/${t.code}`}
                  className="flex items-center gap-2.5 transition-colors hover:text-accent"
                >
                  <Flag code={t.code} className="text-sm" />
                  <span className="font-medium">{t.name}</span>
                  <span className="font-data text-[10px] text-ink-dim/60">
                    {t.code}
                  </span>
                </Link>
              </td>
              <td className="font-data hidden px-3 py-2.5 text-sm text-ink-dim sm:table-cell">
                {t.group}
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="font-data text-sm font-semibold tabular-nums text-win-deep">
                  {pct(t.win)}
                </div>
                <div className="mt-1 ml-auto h-1 w-20 overflow-hidden rounded-full bg-ink/8">
                  <div
                    className="h-full rounded-full bg-win"
                    style={{ width: `${Math.min(t.win * 300, 100)}%` }}
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
  );
}
