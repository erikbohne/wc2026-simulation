import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamView } from "@/components/views/team-view";
import { loadBaseline, loadReport } from "@/lib/report";

export function generateStaticParams() {
  return loadReport().teams.map((t) => ({ code: t.code }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const team = loadReport().teams.find((t) => t.code === code);
  if (!team) return {};
  return {
    title: team.name,
    description: `${team.name}'s projected journey through the FIFA World Cup 2026: title odds ${(team.win * 100).toFixed(1)}%, from 100,000 simulated tournaments.`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const live = loadReport();
  if (!live.teams.some((t) => t.code === code)) notFound();
  return <TeamView code={code} live={live} baseline={loadBaseline()} />;
}
