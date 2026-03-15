"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useWallet } from "@/hooks/useWallet";
import { formatSats } from "@/lib/pricing";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
];

export function Header() {
  const pathname = usePathname();
  const wallet = useWallet();

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

        <div className="flex items-center gap-1">
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
          </nav>

          <div className="ml-3 h-6 w-px bg-zinc-800" />

          {/* Wallet */}
          {wallet.connected ? (
            <div className="ml-2 flex items-center gap-2">
              {wallet.balance && (
                <span className="hidden sm:inline text-xs font-mono text-btc-400">
                  {formatSats(wallet.balance.total)}
                </span>
              )}
              <button
                onClick={() => wallet.disconnect()}
                className="group flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs transition-all hover:border-zinc-600"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline font-mono text-zinc-300 group-hover:hidden">
                  {wallet.paymentAddress?.address.slice(0, 6)}…{wallet.paymentAddress?.address.slice(-4)}
                </span>
                <span className="hidden sm:group-hover:inline text-zinc-400">
                  Disconnect
                </span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => wallet.connect()}
              disabled={wallet.connecting}
              className="ml-2 btn-primary text-xs px-4 py-1.5"
            >
              {wallet.connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded wallet info bar */}
      {wallet.connected && wallet.ordinalsAddress && (
        <div className="border-t border-zinc-800/50 bg-zinc-950/60">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Ordinals:</span>
              <span className="font-mono text-zinc-300 select-all">
                {wallet.ordinalsAddress.address}
              </span>
            </div>
            {wallet.paymentAddress && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Payment:</span>
                <span className="font-mono text-zinc-300 select-all">
                  {wallet.paymentAddress.address}
                </span>
              </div>
            )}
            {wallet.balance && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Balance:</span>
                <span className="font-mono text-btc-400">
                  {formatSats(wallet.balance.confirmed)} confirmed
                </span>
                {wallet.balance.unconfirmed > 0 && (
                  <span className="font-mono text-zinc-500">
                    + {formatSats(wallet.balance.unconfirmed)} unconfirmed
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
