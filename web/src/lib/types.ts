export type StackPreset = "bare" | "bitcoin_lightning" | "llm_runtime";

export type Region =
  | "us-east"
  | "us-west"
  | "eu-central"
  | "eu-west"
  | "ap-southeast";

export interface VpsConfig {
  cpu: number;
  ramGb: number;
  storageGb: number;
  region: Region;
  stack: StackPreset;
  modelManifestId?: string;
}

export type SaleMode = "fixed" | "auction";
export type ListingStatus = "available" | "running" | "claimed" | "expired";

export interface Listing {
  id: string;
  resourceId: string;
  accessTokenInscriptionId: string;
  name: string;
  config: VpsConfig;
  saleMode: SaleMode;
  priceSats: number;
  currentBidSats?: number;
  bidCount?: number;
  auctionEndsAt?: string;
  status: ListingStatus;
  createdAt: string;
}

export interface MarketplaceFilters {
  stack?: StackPreset | "all";
  region?: Region | "all";
  minRam?: number;
  maxRam?: number;
  minStorage?: number;
  maxStorage?: number;
  minPrice?: number;
  maxPrice?: number;
  saleMode?: SaleMode | "all";
}

export type CheckoutStep =
  | "review"
  | "awaiting_payment"
  | "confirming"
  | "transferring"
  | "ready";

export const REGIONS: { value: Region; label: string }[] = [
  { value: "us-east", label: "US East (Virginia)" },
  { value: "us-west", label: "US West (Oregon)" },
  { value: "eu-central", label: "EU Central (Frankfurt)" },
  { value: "eu-west", label: "EU West (Ireland)" },
  { value: "ap-southeast", label: "Asia Pacific (Singapore)" },
];

export const STACK_PRESETS: { value: StackPreset; label: string; description: string }[] = [
  { value: "bare", label: "Bare VPS", description: "Clean Ubuntu 24.04 server, your way" },
  {
    value: "bitcoin_lightning",
    label: "Bitcoin + Lightning + ord",
    description: "Full node, Lightning, and ordinals indexer pre-configured",
  },
  {
    value: "llm_runtime",
    label: "LLM Runtime",
    description: "GPU-ready host with token-gated model inference via SatKey",
  },
];

export const CPU_OPTIONS = [2, 4, 8, 16, 32];
export const RAM_OPTIONS = [2, 4, 8, 16, 32, 64];
export const STORAGE_OPTIONS = [50, 100, 250, 500, 1000, 2000];
