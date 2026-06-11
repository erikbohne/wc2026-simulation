import type { Metadata } from "next";
import { MatchesView } from "@/components/views/matches-view";
import { loadBaseline, loadReport } from "@/lib/report";

export const metadata: Metadata = {
  title: "Matches",
  description:
    "All 104 matches of the FIFA World Cup 2026 — results with pre-match model odds, and win/draw/win predictions for every remaining fixture.",
};

export default function MatchesPage() {
  return <MatchesView live={loadReport()} baseline={loadBaseline()} />;
}
