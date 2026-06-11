import type { Metadata } from "next";
import { TableView } from "@/components/views/table-view";
import { loadBaseline, loadReport } from "@/lib/report";

export const metadata: Metadata = {
  title: "Table — WC26·SIM",
  description:
    "Advancement probabilities for all 48 World Cup 2026 teams, from 100,000 simulated tournaments.",
};

export default function TablePage() {
  return <TableView live={loadReport()} baseline={loadBaseline()} />;
}
