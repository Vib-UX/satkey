"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { formatSats } from "@/lib/pricing";
import { StackBadge, StatusBadge } from "@/components/Badges";
import { TimeRemaining } from "@/components/TimeRemaining";
import { BidModal } from "@/components/BidModal";
import Link from "next/link";

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const [modalOpen, setModalOpen] = useState(false);

  const listing = useMemo(
    () => MOCK_LISTINGS.find((l) => l.id === params.id),
    [params.id]
  );

  if (!listing) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-300">Listing not found</h1>
        <Link href="/marketplace" className="btn-secondary mt-6 inline-flex">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const { config } = listing;
  const price =
    listing.saleMode === "auction" && listing.currentBidSats
      ? listing.currentBidSats
      : listing.priceSats;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-zinc-500">
          <Link href="/marketplace" className="hover:text-zinc-300 transition-colors">
            Marketplace
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{listing.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main detail */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {listing.name}
                </h1>
                <StatusBadge status={listing.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StackBadge stack={config.stack} />
                <span className="badge-zinc">{config.region}</span>
                <span className="badge-zinc">
                  {listing.saleMode === "auction" ? "Auction" : "Fixed price"}
                </span>
              </div>
            </div>

            {/* Specs grid */}
            <div className="card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Specifications
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SpecItem label="CPU" value={`${config.cpu} vCPU`} />
                <SpecItem label="RAM" value={`${config.ramGb} GB`} />
                <SpecItem label="Storage" value={`${config.storageGb} GB`} />
                <SpecItem label="Region" value={config.region} />
              </div>
              {config.stack === "llm_runtime" && config.modelManifestId && (
                <div className="mt-4 rounded-lg bg-zinc-800/50 px-3 py-2">
                  <p className="text-xs text-zinc-500">Model manifest</p>
                  <p className="text-sm font-mono text-zinc-300">
                    {config.modelManifestId}
                  </p>
                </div>
              )}
            </div>

            {/* Inscription info */}
            <div className="card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                On-chain data
              </h2>
              <dl className="space-y-3">
                <InfoRow label="Resource ID" value={listing.resourceId} mono />
                <InfoRow
                  label="Access Token Inscription"
                  value={listing.accessTokenInscriptionId}
                  mono
                  truncate
                />
                <InfoRow
                  label="Listed"
                  value={new Date(listing.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                />
              </dl>
            </div>

            {/* How it works */}
            <div className="card p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                After purchase
              </h2>
              <ol className="space-y-2 text-sm text-zinc-400">
                <li className="flex gap-2">
                  <span className="shrink-0 text-btc-400 font-bold">1.</span>
                  The Access Token ordinal transfers to your address.
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-btc-400 font-bold">2.</span>
                  Sign a challenge with the wallet that holds the token.
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-btc-400 font-bold">3.</span>
                  The verifier confirms ownership and grants SSH/API access.
                </li>
              </ol>
            </div>
          </div>

          {/* Sidebar: price + action */}
          <div className="space-y-4">
            <div className="card p-6 sticky top-24">
              <p className="text-sm font-medium text-zinc-400">
                {listing.saleMode === "auction" ? "Current bid" : "Price"}
              </p>
              <p className="mt-1 text-4xl font-bold font-mono text-btc-400">
                {formatSats(price)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                ≈ {(price / 100_000_000).toFixed(6)} BTC
              </p>

              {listing.saleMode === "auction" && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    {listing.bidCount ?? 0} bids
                  </span>
                  {listing.auctionEndsAt && (
                    <TimeRemaining endsAt={listing.auctionEndsAt} />
                  )}
                </div>
              )}

              <button
                onClick={() => setModalOpen(true)}
                disabled={listing.status !== "available"}
                className="btn-primary w-full mt-5 text-base py-3"
              >
                {listing.saleMode === "auction" ? "Place Bid" : "Buy Now"}
              </button>

              {listing.status !== "available" && (
                <p className="mt-2 text-center text-xs text-zinc-500">
                  This listing is currently {listing.status}.
                </p>
              )}

              <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs leading-relaxed text-amber-400/80">
                  Non-custodial &amp; experimental. You are sending BTC on-chain
                  to acquire the ordinal inscription that controls this VPS.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BidModal
        listing={listing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="shrink-0 text-xs text-zinc-500 sm:w-44">{label}</dt>
      <dd
        className={`text-sm text-zinc-300 break-all ${mono ? "font-mono" : ""} ${
          truncate ? "sm:truncate" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
