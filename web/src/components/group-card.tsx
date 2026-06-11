import Link from "next/link";
import { Flag } from "@/components/flag";
import { advanceProb, pct } from "@/lib/format";
import type { TeamRow } from "@/lib/report";

function heatStyle(p: number): React.CSSProperties {
  const color =
    p >= 0.5
      ? "52, 199, 89"
      : p >= 0.25
        ? "255, 149, 0"
        : "255, 59, 48";
  return { background: `rgba(${color}, ${0.14 + p * 0.45})` };
}

function HeatCell({ p }: { p: number }) {
  return (
    <td className="p-0.5">
      <div
        className="font-data rounded-lg px-1 py-1.5 text-center text-xs font-semibold tabular-nums text-ink"
        style={heatStyle(p)}
      >
        {(p * 100).toFixed(1)}%
      </div>
    </td>
  );
}

export function GroupCard({
  letter,
  teams,
}: {
  letter: string;
  teams: TeamRow[];
}) {
  const sorted = [...teams].sort(
    (a, b) => b.group_position.first - a.group_position.first,
  );
  return (
    <div className="glass rounded-3xl p-5">
      <h3 className="text-center text-xl font-bold tracking-tight">
        Group <span className="text-win-deep">{letter}</span>
      </h3>
      <table className="mt-3 w-full table-fixed border-collapse">
        <thead>
          <tr className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
            <th className="pb-1.5 text-left font-medium">Team</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">1</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">2</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">3</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">4</th>
            <th className="hidden w-[16%] pb-1.5 text-center font-medium text-win-deep sm:table-cell">
              → KO
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const gp = t.group_position;
            return (
              <tr
                key={t.code}
                title={`${t.name}: ${t.expected_points.toFixed(1)} xPts · 3rd & through ${pct(gp.third_qualified)} · 3rd & out ${pct(gp.third_eliminated)}`}
              >
                <td className="pr-2">
                  <Link
                    href={`/team/${t.code}`}
                    className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-accent"
                  >
                    <Flag code={t.code} className="text-xs" />
                    <span className="truncate text-sm font-medium">
                      {t.name}
                    </span>
                  </Link>
                </td>
                <HeatCell p={gp.first} />
                <HeatCell p={gp.second} />
                <HeatCell p={gp.third_qualified + gp.third_eliminated} />
                <HeatCell p={gp.fourth} />
                <td className="font-data hidden py-1.5 text-center text-xs font-semibold tabular-nums text-win-deep sm:table-cell">
                  {(advanceProb(t) * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
