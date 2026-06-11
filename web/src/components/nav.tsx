"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/groups", label: "Groups" },
  { href: "/table", label: "Table" },
];

const REPO = "https://github.com/erikbohne/wc2026-simulation";

export function Nav() {
  const pathname = usePathname();
  return (
    <div className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-5">
      <nav className="glass-strong mx-auto flex h-14 max-w-4xl items-center justify-between rounded-full pr-2 pl-5">
        <Link
          href="/"
          className="font-data flex items-baseline text-[16px] font-bold tracking-tight text-ink"
        >
          wcsim
          <span className="blink ml-1 inline-block h-[1em] w-[0.45em] self-center rounded-[2px] bg-win" />
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-full px-3 py-1.5 text-[15px] transition-colors sm:px-4 ${
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
  );
}
