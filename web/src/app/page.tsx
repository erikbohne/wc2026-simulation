import { HomeView } from "@/components/views/home-view";
import { loadBaseline, loadHistory, loadReport } from "@/lib/report";

export default function Home() {
  return (
    <HomeView
      live={loadReport()}
      baseline={loadBaseline()}
      history={loadHistory()}
    />
  );
}
