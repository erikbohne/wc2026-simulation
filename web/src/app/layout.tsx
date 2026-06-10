import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
