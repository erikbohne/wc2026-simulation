import type { Metadata } from "next";
import { ModeProvider } from "@/components/mode";
import { Nav } from "@/components/nav";
import { loadReport } from "@/lib/report";
import "./globals.css";

const REPO = "https://github.com/erikbohne/wc2026-simulation";

export const metadata: Metadata = {
  title: "WC26·SIM — World Cup 2026 win probabilities",
  description:
    "104 matches, 100,000 simulated futures. A Monte Carlo simulation of the FIFA World Cup 2026, re-run after every real match. Elo-driven, Poisson-scored, open source.",
  metadataBase: new URL("https://wc2026.erikoss.com"),
  openGraph: {
    title: "WC26·SIM — World Cup 2026 win probabilities",
    description:
      "104 matches, 100,000 simulated futures. Updated after every real match.",
    type: "website",
  },
};

function Footer() {
  const report = loadReport();
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 pt-8 pb-12">
      <div className="glass flex flex-col gap-6 rounded-3xl p-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h3 className="text-sm font-bold tracking-tight">How it works</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            Every run simulates the full 104-match tournament — group
            tiebreakers, third-place allocation and bracket per the official
            FIFA regulations. Goals are sampled from Elo-derived Poisson rates
            ({report.elo_source}, {report.elo_snapshot_date}), with ratings
            updating dynamically inside each tournament. Played matches are
            locked to their real results; only the remaining fixtures are
            sampled.
          </p>
        </div>
        <div className="font-data flex flex-col gap-2 text-xs text-ink-dim">
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            Source on GitHub ↗
          </a>
          <a
            href={`${REPO}/blob/main/data/results.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            Match results data ↗
          </a>
          <span>
            seed {report.seed} · {report.pens} pens · MIT
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <div className="backdrop-blobs" />
        <ModeProvider>
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-28">
            {children}
          </main>
        </ModeProvider>
        <Footer />
      </body>
    </html>
  );
}
