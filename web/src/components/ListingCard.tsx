import Link from "next/link";
import type { Listing } from "@/lib/types";
import { formatSats } from "@/lib/pricing";
import { StackBadge, StatusBadge } from "./Badges";
import { TimeRemaining } from "./TimeRemaining";

export function ListingCard({ listing }: { listing: Listing }) {
  const { config } = listing;
  const price =
    listing.saleMode === "auction" && listing.currentBidSats
      ? listing.currentBidSats
      : listing.priceSats;

  return (
    <Link href={`/marketplace/${listing.id}`} className="group block">
      <div className="card p-5 transition-all group-hover:border-zinc-700 group-hover:bg-zinc-900/80">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-100 group-hover:text-btc-400 transition-colors">
            {listing.name}
          </h3>
          <StatusBadge status={listing.status} />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          <StackBadge stack={config.stack} />
          <span className="badge-zinc">{config.region}</span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="CPU" value={`${config.cpu} vCPU`} />
          <Stat label="RAM" value={`${config.ramGb} GB`} />
          <Stat label="Storage" value={`${config.storageGb} GB`} />
        </div>

        <div className="flex items-end justify-between border-t border-zinc-800 pt-3">
          <div>
            <p className="text-xs text-zinc-500">
              {listing.saleMode === "auction" ? "Current bid" : "Price"}
            </p>
            <p className="text-lg font-bold text-btc-400 font-mono">
              {formatSats(price)}
            </p>
          </div>
          {listing.saleMode === "auction" && listing.auctionEndsAt && (
            <TimeRemaining endsAt={listing.auctionEndsAt} />
          )}
          {listing.saleMode === "fixed" && (
            <span className="text-xs font-medium text-zinc-500">
              Buy now
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 px-2 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}
