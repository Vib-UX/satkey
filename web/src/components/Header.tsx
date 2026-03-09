"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-btc-500">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-zinc-950"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <rect x="3" y="11" width="18" height="11" rx="2" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            Sat<span className="text-btc-400">Key</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "btn-ghost",
                pathname === href && "text-zinc-100 bg-zinc-800/60"
              )}
            >
              {label}
            </Link>
          ))}
          <div className="ml-3 h-6 w-px bg-zinc-800" />
          <a
            href="https://github.com/nicksatkey/satkey"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
