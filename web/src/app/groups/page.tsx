import type { Metadata } from "next";
import { GroupsView } from "@/components/views/groups-view";
import { loadBaseline, loadReport } from "@/lib/report";

export const metadata: Metadata = {
  title: "Groups — WC26·SIM",
  description:
    "Finishing-position probabilities for all 12 World Cup 2026 groups, from 100,000 simulated tournaments.",
};

export default function GroupsPage() {
  return <GroupsView live={loadReport()} baseline={loadBaseline()} />;
}
