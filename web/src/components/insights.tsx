import { shortDate } from "@/lib/format";
import type { Insight } from "@/lib/report";

export function InsightsRail({ insights }: { insights: Insight[] }) {
  const sorted = [...insights].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <aside className="fixed top-28 right-8 hidden w-72 2xl:block">
      <div className="font-data mb-3 flex items-center gap-2 text-[10px] tracking-[0.15em] text-ink-dim uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-win" />
        Insights
      </div>
      <div className="flex flex-col gap-3">
        {sorted.slice(0, 5).map((n) => (
          <div key={n.date} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                W
              </span>
              <span className="text-[13px] font-semibold">wc26·sim</span>
              <span className="font-data text-[10px] text-ink-dim">
                {shortDate(n.date)}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/85">
              {n.text}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
