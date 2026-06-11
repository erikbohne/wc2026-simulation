import Link from "next/link";
import { Flag } from "@/components/flag";
import { pct } from "@/lib/format";
import type { TeamRow } from "@/lib/report";

export function PodiumCard({ team, rank }: { team: TeamRow; rank: number }) {
  const first = rank === 1;
  return (
    <Link
      href={`/team/${team.code}`}
      className="rise glass relative block rounded-3xl p-6 transition-transform hover:scale-[1.015]"
      style={{ animationDelay: `${0.25 + rank * 0.08}s` }}
    >
      <div
        className={`font-data absolute top-5 right-6 text-4xl font-bold ${
          first ? "text-gold/40" : "text-ink/10"
        }`}
      >
        {rank}
      </div>
      <div>
        <Flag code={team.code} className="text-4xl" />
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{team.name}</div>
      <div className="font-data mt-0.5 text-xs text-ink-dim">
        Group {team.group} · {team.code}
      </div>
      <div
        className={`font-data mt-5 text-5xl font-semibold tracking-tight tabular-nums ${
          first ? "text-gold" : "text-win-deep"
        }`}
      >
        {pct(team.win)}
      </div>
      <div className="font-data text-[10px] tracking-[0.15em] text-ink-dim uppercase">
        wins the title
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
        <div
          className={`h-full rounded-full ${first ? "bg-gold" : "bg-win"}`}
          style={{ width: `${Math.min(team.win * 200, 100)}%` }}
        />
      </div>
      <div className="font-data mt-3 flex gap-4 text-xs text-ink-dim">
        <span>Final {pct(team.final)}</span>
        <span>SF {pct(team.sf)}</span>
      </div>
    </Link>
  );
}
