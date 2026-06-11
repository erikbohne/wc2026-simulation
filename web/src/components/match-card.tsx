import { flag } from "@/lib/flags";
import { fixtureStage, shortDate } from "@/lib/format";
import type { Fixture } from "@/lib/report";

export function MatchCard({ f }: { f: Fixture }) {
  const played = f.status === "played";
  return (
    <div className="glass min-w-56 flex-1 rounded-3xl p-5">
      <div className="font-data flex items-center justify-between text-[10px] tracking-[0.12em] text-ink-dim uppercase">
        <span>
          M{f.match} · {fixtureStage(f)}
        </span>
        <span>
          {shortDate(f.date)}
          {f.city ? ` · ${f.city}` : ""}
        </span>
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{f.home ? flag(f.home) : "·"}</span>
          <span className="text-lg font-bold tracking-tight">
            {f.home_label}
          </span>
        </div>
        <div className="font-data text-lg font-semibold tabular-nums">
          {played && f.score ? (
            <span className={f.penalties ? "text-amber" : "text-ink"}>
              {f.score[0]}–{f.score[1]}
              {f.penalties ? " p" : ""}
            </span>
          ) : (
            <span className="text-ink-dim">
              {f.likely_score
                ? `${f.likely_score[0]}–${f.likely_score[1]}`
                : "vs"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">
            {f.away_label}
          </span>
          <span className="text-2xl">{f.away ? flag(f.away) : "·"}</span>
        </div>
      </div>
      {f.p_home != null && (
        <>
          <div className="mt-3.5 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-win"
              style={{ width: `${f.p_home * 100}%` }}
            />
            {f.p_draw != null && (
              <div
                className="h-full rounded-full bg-ink/15"
                style={{ width: `${f.p_draw * 100}%` }}
              />
            )}
            <div
              className="h-full rounded-full bg-loss/80"
              style={{ width: `${(f.p_away ?? 0) * 100}%` }}
            />
          </div>
          <div className="font-data mt-1.5 flex justify-between text-[11px] tabular-nums text-ink-dim">
            <span>{((f.p_home ?? 0) * 100).toFixed(0)}%</span>
            {f.p_draw != null && (
              <span>draw {(f.p_draw * 100).toFixed(0)}%</span>
            )}
            <span>{((f.p_away ?? 0) * 100).toFixed(0)}%</span>
          </div>
          {played && (
            <div className="font-data mt-1 text-[10px] tracking-[0.12em] text-ink-dim/70 uppercase">
              pre-match model odds
            </div>
          )}
        </>
      )}
    </div>
  );
}
