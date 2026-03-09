"use client";

import { clsx } from "clsx";
import type { MarketplaceFilters, StackPreset, Region, SaleMode } from "@/lib/types";
import { REGIONS, STACK_PRESETS } from "@/lib/types";

interface FilterPanelProps {
  filters: MarketplaceFilters;
  onChange: (f: MarketplaceFilters) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const set = (patch: Partial<MarketplaceFilters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="card p-5 space-y-5">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
        Filters
      </h3>

      {/* Stack */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Stack</label>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: "all" as const, label: "All" }, ...STACK_PRESETS].map((s) => (
            <button
              key={s.value}
              onClick={() => set({ stack: s.value as StackPreset | "all" })}
              className={clsx(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
                (filters.stack ?? "all") === s.value
                  ? "border-btc-500 bg-btc-500/10 text-btc-400"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Region */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Region</label>
        <select
          value={filters.region ?? "all"}
          onChange={(e) => set({ region: e.target.value as Region | "all" })}
          className="input-field text-xs"
        >
          <option value="all">All regions</option>
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sale mode */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">
          Sale Mode
        </label>
        <div className="flex gap-1.5">
          {(["all", "fixed", "auction"] as const).map((m) => (
            <button
              key={m}
              onClick={() => set({ saleMode: m as SaleMode | "all" })}
              className={clsx(
                "flex-1 rounded-md border py-1 text-xs font-medium transition-all",
                (filters.saleMode ?? "all") === m
                  ? "border-btc-500 bg-btc-500/10 text-btc-400"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
              )}
            >
              {m === "all" ? "All" : m === "fixed" ? "Buy Now" : "Auction"}
            </button>
          ))}
        </div>
      </div>

      {/* RAM range */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">
          Min RAM (GB)
        </label>
        <input
          type="range"
          min={0}
          max={64}
          step={2}
          value={filters.minRam ?? 0}
          onChange={(e) => set({ minRam: Number(e.target.value) })}
          className="w-full accent-btc-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>0 GB</span>
          <span className="text-zinc-400 font-medium">
            {filters.minRam ?? 0} GB+
          </span>
          <span>64 GB</span>
        </div>
      </div>

      {/* Clear */}
      <button
        onClick={() =>
          onChange({
            stack: "all",
            region: "all",
            saleMode: "all",
            minRam: 0,
          })
        }
        className="btn-ghost w-full text-xs"
      >
        Clear filters
      </button>
    </div>
  );
}
