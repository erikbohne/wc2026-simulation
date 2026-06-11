import type { Metadata } from "next";
import { ModeProvider } from "@/components/mode";
import { Nav } from "@/components/nav";
import "./globals.css";

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
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-28 pb-12">
            {children}
          </main>
        </ModeProvider>
      </body>
    </html>
  );
}
