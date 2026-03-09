import Link from "next/link";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { ListingCard } from "./ListingCard";

export function MarketplacePreview() {
  const featured = MOCK_LISTINGS.filter((l) => l.status === "available").slice(0, 3);

  return (
    <section className="border-t border-zinc-800/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="section-heading">Marketplace</h2>
            <p className="mt-2 text-zinc-400">
              Ordinal-backed VPS instances available now.
            </p>
          </div>
          <Link href="/marketplace" className="btn-secondary hidden sm:inline-flex">
            View all listings
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/marketplace" className="btn-secondary">
            View all listings
          </Link>
        </div>
      </div>
    </section>
  );
}
