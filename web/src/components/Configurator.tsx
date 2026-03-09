"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";
import {
  CPU_OPTIONS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  REGIONS,
  STACK_PRESETS,
  type VpsConfig,
  type StackPreset,
  type Region,
} from "@/lib/types";
import { estimateMonthlyPriceSats, formatSats } from "@/lib/pricing";
import { buildAccessResourceFromConfig } from "@/lib/protocol-helpers";

export function Configurator() {
  const [config, setConfig] = useState<VpsConfig>({
    cpu: 4,
    ramGb: 8,
    storageGb: 250,
    region: "us-east",
    stack: "bare",
  });
  const [modelId, setModelId] = useState("");
  const [showJson, setShowJson] = useState(false);

  const effectiveConfig = useMemo<VpsConfig>(
    () => ({
      ...config,
      modelManifestId:
        config.stack === "llm_runtime" && modelId ? modelId : undefined,
    }),
    [config, modelId]
  );

  const price = useMemo(
    () => estimateMonthlyPriceSats(effectiveConfig),
    [effectiveConfig]
  );

  const resourceJson = useMemo(() => {
    const resource = buildAccessResourceFromConfig(
      effectiveConfig,
      "02" + "00".repeat(32)
    );
    return JSON.stringify(resource, null, 2);
  }, [effectiveConfig]);

  return (
    <section id="configurator" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="section-heading">Configure your VPS</h2>
          <p className="mt-3 text-zinc-400">
            Pick your specs. We generate an Access Resource definition
            ready to inscribe.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Controls */}
          <div className="card p-6 space-y-6">
            {/* Stack Preset */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-zinc-300">
                Stack Preset
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {STACK_PRESETS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() =>
                      setConfig((c) => ({ ...c, stack: s.value as StackPreset }))
                    }
                    className={clsx(
                      "rounded-lg border p-3 text-left transition-all",
                      config.stack === s.value
                        ? "border-btc-500 bg-btc-500/5"
                        : "border-zinc-800 bg-zinc-800/40 hover:border-zinc-700"
                    )}
                  >
                    <p
                      className={clsx(
                        "text-sm font-semibold",
                        config.stack === s.value ? "text-btc-400" : "text-zinc-200"
                      )}
                    >
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{s.description}</p>
                  </button>
                ))}
              </div>
            </fieldset>

            {config.stack === "llm_runtime" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Model Manifest ID
                </label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="e.g. mixtral-8x7b-v0.1"
                  className="input-field"
                />
              </div>
            )}

            {/* CPU */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                CPU Cores
              </label>
              <div className="flex gap-2">
                {CPU_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, cpu: n }))}
                    className={clsx(
                      "flex-1 rounded-lg border py-2 text-sm font-medium transition-all",
                      config.cpu === n
                        ? "border-btc-500 bg-btc-500/10 text-btc-400"
                        : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* RAM */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                RAM (GB)
              </label>
              <div className="flex flex-wrap gap-2">
                {RAM_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, ramGb: n }))}
                    className={clsx(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      config.ramGb === n
                        ? "border-btc-500 bg-btc-500/10 text-btc-400"
                        : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Storage (GB)
              </label>
              <div className="flex flex-wrap gap-2">
                {STORAGE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, storageGb: n }))}
                    className={clsx(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      config.storageGb === n
                        ? "border-btc-500 bg-btc-500/10 text-btc-400"
                        : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n >= 1000 ? `${n / 1000} TB` : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Region
              </label>
              <select
                value={config.region}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, region: e.target.value as Region }))
                }
                className="input-field"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price + JSON sidebar */}
          <div className="space-y-4">
            <div className="card p-6 text-center">
              <p className="text-sm font-medium text-zinc-400">
                Estimated monthly cost
              </p>
              <p className="mt-2 text-4xl font-bold font-mono text-btc-400">
                {formatSats(price)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                ≈ {(price / 100_000_000).toFixed(6)} BTC / month
              </p>

              <div className="mt-6 space-y-2">
                <button className="btn-primary w-full">
                  Mint &amp; List on Marketplace
                </button>
                <button className="btn-secondary w-full">
                  Self-host with SatKey
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <button
                onClick={() => setShowJson((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Access Resource JSON
                <svg
                  className={clsx(
                    "h-4 w-4 transition-transform",
                    showJson && "rotate-180"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showJson && (
                <pre className="max-h-80 overflow-auto border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400 font-mono">
                  {resourceJson}
                </pre>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                The configurator generates a protocol-compliant{" "}
                <code className="text-btc-500/80">AccessResource</code> definition.
                Listing it mints an ordinal inscription that acts as the access
                token to your VPS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
