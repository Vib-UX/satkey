import type { StackPreset, ListingStatus } from "@/lib/types";

const STACK_STYLES: Record<StackPreset, { className: string; label: string }> = {
  bare: { className: "badge-zinc", label: "Bare VPS" },
  bitcoin_lightning: { className: "badge-btc", label: "BTC + LN + ord" },
  llm_runtime: { className: "badge-blue", label: "LLM Runtime" },
};

export function StackBadge({ stack }: { stack: StackPreset }) {
  const s = STACK_STYLES[stack];
  return <span className={s.className}>{s.label}</span>;
}

const STATUS_STYLES: Record<ListingStatus, { className: string; label: string }> = {
  available: { className: "badge-green", label: "Available" },
  running: { className: "badge-blue", label: "Running" },
  claimed: { className: "badge-zinc", label: "Claimed" },
  expired: { className: "badge-zinc", label: "Expired" },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const s = STATUS_STYLES[status];
  return <span className={s.className}>{s.label}</span>;
}
