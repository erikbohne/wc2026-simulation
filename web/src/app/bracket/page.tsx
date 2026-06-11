import type { Metadata } from "next";
import { BracketView } from "@/components/views/bracket-view";
import { loadBaseline, loadReport } from "@/lib/report";

export const metadata: Metadata = {
  title: "Bracket",
  description:
    "The probabilistic knockout bracket of the FIFA World Cup 2026 — each slot shows the most likely team, from 100,000 simulated tournaments.",
};

export default function BracketPage() {
  return <BracketView live={loadReport()} baseline={loadBaseline()} />;
}
