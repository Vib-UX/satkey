"use client";

import { useMemo, useState } from "react";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import type { MarketplaceFilters } from "@/lib/types";
import { ListingCard } from "@/components/ListingCard";
import { FilterPanel } from "@/components/FilterPanel";

export default function MarketplacePage() {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    stack: "all",
    region: "all",
    saleMode: "all",
    minRam: 0,
  });

  const listings = useMemo(() => {
    return MOCK_LISTINGS.filter((l) => {
      if (filters.stack && filters.stack !== "all" && l.config.stack !== filters.stack)
        return false;
      if (filters.region && filters.region !== "all" && l.config.region !== filters.region)
        return false;
      if (
        filters.saleMode &&
        filters.saleMode !== "all" &&
        l.saleMode !== filters.saleMode
      )
        return false;
      if (filters.minRam && l.config.ramGb < filters.minRam) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Marketplace
        </h1>
        <p className="mt-2 text-zinc-400">
          Ordinal-backed VPS instances. Each listing is an Access Token inscription
          you can purchase on-chain.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <FilterPanel filters={filters} onChange={setFilters} />
        </aside>

        <div>
          {/* Mobile filter toggle */}
          <details className="mb-6 lg:hidden">
            <summary className="btn-secondary cursor-pointer">
              Filters
            </summary>
            <div className="mt-3">
              <FilterPanel filters={filters} onChange={setFilters} />
            </div>
          </details>

          {listings.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <p className="text-zinc-500">No listings match your filters.</p>
              <button
                onClick={() =>
                  setFilters({ stack: "all", region: "all", saleMode: "all", minRam: 0 })
                }
                className="btn-ghost mt-3 text-btc-400"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-zinc-600">
            {listings.length} of {MOCK_LISTINGS.length} listings shown
          </p>
        </div>
      </div>
    </div>
  );
}
