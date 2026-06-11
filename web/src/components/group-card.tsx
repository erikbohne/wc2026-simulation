import { flag } from "@/lib/flags";
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
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="font-data text-[10px] tracking-[0.12em] text-ink-dim uppercase">
            <th className="pb-1.5 text-left font-medium">Team</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">1</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">2</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">3</th>
            <th className="w-[15%] pb-1.5 text-center font-medium">4</th>
            <th className="w-[16%] pb-1.5 text-center font-medium text-win-deep">
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
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="text-base">{flag(t.code)}</span>
                    <span className="truncate text-sm font-medium">
                      {t.name}
                    </span>
                  </div>
                </td>
                <HeatCell p={gp.first} />
                <HeatCell p={gp.second} />
                <HeatCell p={gp.third_qualified + gp.third_eliminated} />
                <HeatCell p={gp.fourth} />
                <td className="font-data py-1.5 text-center text-xs font-semibold tabular-nums text-win-deep">
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
