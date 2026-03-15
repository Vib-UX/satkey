import type { VpsConfig } from "./types";

const BASE_SATS_PER_MONTH = 500;
const PER_CPU_SATS = 100;
const PER_GB_RAM_SATS = 50;
const PER_GB_STORAGE_SATS = 1;

const STACK_MULTIPLIER: Record<string, number> = {
  bare: 1.0,
  bitcoin_lightning: 1.35,
  llm_runtime: 1.6,
};

const REGION_MODIFIER: Record<string, number> = {
  "us-east": 1.0,
  "us-west": 1.0,
  "eu-central": 1.05,
  "eu-west": 1.05,
  "ap-southeast": 1.12,
};

export function estimateMonthlyPriceSats(config: VpsConfig): number {
  const base =
    BASE_SATS_PER_MONTH +
    config.cpu * PER_CPU_SATS +
    config.ramGb * PER_GB_RAM_SATS +
    config.storageGb * PER_GB_STORAGE_SATS;

  const multiplier = STACK_MULTIPLIER[config.stack] ?? 1;
  const regionMod = REGION_MODIFIER[config.region] ?? 1;

  return Math.round(base * multiplier * regionMod);
}

export function formatSats(sats: number): string {
  if (sats >= 100_000_000) {
    return `${(sats / 100_000_000).toFixed(4)} BTC`;
  }
  return `${sats.toLocaleString("en-US")} sats`;
}

export function satsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}
