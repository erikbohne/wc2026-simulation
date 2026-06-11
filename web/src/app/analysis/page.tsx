import type { Metadata } from "next";
import { ConvergenceChart } from "@/components/convergence-chart";
import convergence from "@/data/convergence.json";

export const metadata: Metadata = {
  title: "Analysis",
  description: "Observations from the Monte Carlo runs.",
};

export default function AnalysisPage() {
  return (
    <section className="mx-auto w-full max-w-3xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
      <p className="font-data mt-1 text-[10px] tracking-[0.15em] text-ink-dim uppercase">
        observations from the runs
      </p>

      <div className="mt-10 flex flex-col gap-5 text-[15px] leading-relaxed text-ink/85">
        <p>
          At very low sample counts the numbers are still swinging hard. After
          25 tournaments Argentina sits at 28% while Spain is only at 8%.
          France has zero wins in the first 10.
        </p>

        <ConvergenceChart data={convergence} />

        <p>
          The noise falls off with the square root of the number of
          simulations. By 10,000 runs the curves have already flattened.
        </p>

        <p>
          At the full 100,000 the Monte Carlo error on a ~17% title probability
          is roughly ±0.12 percentage points — small next to the uncertainty
          coming from the model itself.
        </p>
      </div>
    </section>
  );
}
