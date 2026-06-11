"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode";

const TOURNAMENT = [
  { href: "/matches", label: "Matches" },
  { href: "/bracket", label: "Bracket" },
  { href: "/groups", label: "Groups" },
  { href: "/table", label: "Table" },
];

const MOBILE_TABS = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/bracket", label: "Bracket" },
  { href: "/groups", label: "Groups" },
  { href: "/table", label: "Table" },
  { href: "/analysis", label: "Analysis" },
];

const REPO = "https://github.com/erikbohne/wc2026-simulation";

const pill = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-[14px] transition-colors lg:px-4 lg:text-[15px] ${
    active ? "bg-ink/[0.07] font-semibold text-ink" : "text-ink-dim hover:text-ink"
  }`;

export function Nav() {
  const pathname = usePathname();
  const inTournament =
    TOURNAMENT.some((t) => pathname === t.href) ||
    pathname.startsWith("/team/");
  return (
    <>
      <div className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-5">
        <nav className="glass-strong relative mx-auto flex h-14 max-w-4xl items-center justify-between rounded-full pr-3 pl-5 md:pr-2">
          <Link
            href="/"
            className="font-data flex items-baseline text-[16px] font-bold tracking-tight text-ink"
          >
            wcsim
            <span className="blink ml-1 inline-block h-[1em] w-[0.45em] self-center rounded-[2px] bg-win" />
          </Link>
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            <Link href="/" className={pill(pathname === "/")}>
              Home
            </Link>
            <div className="group relative">
              <span
                className={`flex cursor-default items-center gap-1 ${pill(inTournament)}`}
              >
                Tournament
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  className="mt-px opacity-50 transition-transform group-hover:rotate-180"
                >
                  <path
                    d="M2 3.5 5 6.5 8 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="invisible absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
                <div className="glass-strong flex w-40 flex-col rounded-2xl p-1.5">
                  {TOURNAMENT.map((t) => {
                    const active = pathname === t.href;
                    return (
                      <Link
                        key={t.href}
                        href={t.href}
                        className={`rounded-xl px-3 py-2 text-[14px] transition-colors ${
                          active
                            ? "bg-ink/[0.07] font-semibold text-ink"
                            : "text-ink-dim hover:bg-ink/[0.04] hover:text-ink"
                        }`}
                      >
                        {t.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <Link href="/analysis" className={pill(pathname === "/analysis")}>
              Analysis
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-80 lg:block"
            >
              GitHub
            </a>
          </div>
        </nav>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-50 md:hidden">
        <div className="glass-strong mx-auto flex max-w-md items-center justify-around rounded-full px-1.5 py-1">
          {MOBILE_TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center rounded-full px-1.5 py-2 text-[12px] transition-colors ${
                  active ? "font-semibold text-ink" : "text-ink-dim"
                }`}
              >
                {t.label}
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    active ? "bg-win" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
