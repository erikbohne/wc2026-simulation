"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/bracket", label: "Bracket" },
  { href: "/groups", label: "Groups" },
  { href: "/table", label: "Table" },
];

const REPO = "https://github.com/erikbohne/wc2026-simulation";

export function Nav() {
  const pathname = usePathname();
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
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`rounded-full px-4 py-1.5 text-[15px] transition-colors ${
                    active
                      ? "bg-ink/[0.07] font-semibold text-ink"
                      : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-80 md:block"
            >
              GitHub
            </a>
          </div>
        </nav>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-50 md:hidden">
        <div className="glass-strong mx-auto flex max-w-md items-center justify-around rounded-full px-2 py-1">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center rounded-full px-3 py-2 text-[13px] transition-colors ${
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
