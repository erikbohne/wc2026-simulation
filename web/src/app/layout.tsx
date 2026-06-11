import type { Metadata } from "next";
import { ModeProvider } from "@/components/mode";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "wcsim — World Cup 2026, simulated",
    template: "%s · wcsim",
  },
  description:
    "104 matches, 100,000 simulated futures. A Monte Carlo simulation of the FIFA World Cup 2026, re-run after every real match. Elo-driven, Poisson-scored, open source.",
  metadataBase: new URL("https://wc26.erikoss.com"),
  openGraph: {
    title: "wcsim — World Cup 2026, simulated",
    description:
      "104 matches, 100,000 simulated futures. Updated after every real match.",
    type: "website",
    siteName: "wcsim",
  },
};

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
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-24 pb-24 sm:pt-28 md:pb-12">
            {children}
          </main>
        </ModeProvider>
      </body>
    </html>
  );
}
