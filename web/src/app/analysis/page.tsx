import type { Metadata } from "next";
import { ConvergenceChart } from "@/components/convergence-chart";
import convergence from "@/data/convergence.json";

export const metadata: Metadata = {
  title: "Analysis",
  description:
    "Notes on how the wcsim Monte Carlo model works — and what its numbers actually mean.",
};

export default function AnalysisPage() {
  return (
    <section className="mx-auto w-full max-w-3xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
      <p className="font-data mt-1 text-[10px] tracking-[0.15em] text-ink-dim uppercase">
        notes on the model behind the numbers
      </p>

      <article className="mt-10 flex flex-col gap-5">
        <h2 className="text-xl font-bold tracking-tight">
          Why 100,000 tournaments?
        </h2>
        <p className="text-[15px] leading-relaxed text-ink/85">
          Every probability on this site comes from brute force. The simulator
          plays the full World Cup — all 104 matches, group tiebreakers, the
          third-place allocation table, extra time, penalties — and then does
          it again, and again, 100,000 times. Spain&apos;s title chance is
          nothing more than the share of those futures in which Spain lifts
          the trophy. No formula ever computes &ldquo;P(champion)&rdquo;
          directly; it falls out of counting.
        </p>
        <p className="text-[15px] leading-relaxed text-ink/85">
          That raises an obvious question: is 100,000 enough? The chart below
          shows the same simulation stopped at different depths, from 10
          tournaments to the full run, on a logarithmic axis. The first few
          dozen futures tell outright lies: after 25 tournaments Argentina
          reads 28% and Spain just 8%, and France hasn&apos;t won a single
          one of the first ten. The noise dies off roughly with the square
          root of the sample count.
        </p>

        <ConvergenceChart data={convergence} />

        <p className="text-[15px] leading-relaxed text-ink/85">
          By 10,000 runs the lines are visually flat, and at 100,000 the
          statistical wobble on Spain&apos;s ~17.5% estimate is about ±0.12
          percentage points — far smaller than the uncertainty in the model
          itself. More simulations would only polish digits the model
          can&apos;t honestly claim. That&apos;s why the pipeline re-runs
          100,000 tournaments after every real match, with a fixed seed, in
          under a second.
        </p>
      </article>
    </section>
  );
}
