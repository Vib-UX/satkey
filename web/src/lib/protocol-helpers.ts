import type { VpsConfig, StackPreset } from "./types";

const PROTOCOL_ID = "access-ordinals" as const;
const PROTOCOL_VERSION = "0.1" as const;

type ResourceKind = "vps" | "llm_endpoint" | "http_service";

interface AccessResource {
  protocol: typeof PROTOCOL_ID;
  version: typeof PROTOCOL_VERSION;
  type: "access_resource";
  resource_id: string;
  name: string;
  description: string;
  resource_kind: ResourceKind;
  resource_metadata: Record<string, string>;
  auth_model: "wallet_signature";
  auth_params: { chain: "bitcoin"; network: string };
  policy: { max_sessions: number; session_ttl_seconds: number };
  controller: { type: "pubkey"; pubkey: string };
}

interface AccessToken {
  protocol: typeof PROTOCOL_ID;
  version: typeof PROTOCOL_VERSION;
  type: "access_token";
  resource_id: string;
  token_id: string;
  rights: {
    role: string;
    permissions: string[];
    limits: { max_concurrent_sessions: number; session_ttl_seconds: number };
  };
  lifecycle: { activation: string; expiry: string | null; revocable: boolean };
  issuer: { type: "inscription"; inscription_id: string };
  metadata: { display_name: string; image?: string; external_url?: string };
}

function stackToResourceKind(stack: StackPreset): ResourceKind {
  if (stack === "llm_runtime") return "llm_endpoint";
  return "vps";
}

function stackToMetadata(config: VpsConfig): Record<string, string> {
  const meta: Record<string, string> = {
    cpu: String(config.cpu),
    ram_gb: String(config.ramGb),
    storage_gb: String(config.storageGb),
    region: config.region,
    stack: config.stack,
  };
  if (config.stack === "llm_runtime" && config.modelManifestId) {
    meta.model_manifest_id = config.modelManifestId;
  }
  return meta;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildAccessResourceFromConfig(
  config: VpsConfig,
  controllerPubkey: string,
  overrides?: {
    resource_id?: string;
    name?: string;
    description?: string;
    network?: string;
    max_sessions?: number;
    session_ttl_seconds?: number;
  }
): AccessResource {
  const resourceId = overrides?.resource_id ?? `satkey-vps-${generateId()}`;
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    type: "access_resource",
    resource_id: resourceId,
    name: overrides?.name ?? `SatKey VPS (${config.region})`,
    description:
      overrides?.description ??
      `${config.cpu} vCPU / ${config.ramGb} GB RAM / ${config.storageGb} GB – ${config.stack}`,
    resource_kind: stackToResourceKind(config.stack),
    resource_metadata: stackToMetadata(config),
    auth_model: "wallet_signature",
    auth_params: {
      chain: "bitcoin",
      network: overrides?.network ?? "mainnet",
    },
    policy: {
      max_sessions: overrides?.max_sessions ?? 2,
      session_ttl_seconds: overrides?.session_ttl_seconds ?? 7200,
    },
    controller: {
      type: "pubkey",
      pubkey: controllerPubkey,
    },
  };
}

export function buildAccessTokenForResource(
  resource: AccessResource,
  resourceInscriptionId: string,
  options?: {
    token_id?: string;
    role?: string;
    permissions?: string[];
    display_name?: string;
    activation?: string;
    revocable?: boolean;
  }
): AccessToken {
  const tokenId = options?.token_id ?? `token-${generateId()}`;
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    type: "access_token",
    resource_id: resource.resource_id,
    token_id: tokenId,
    rights: {
      role: options?.role ?? "ssh_user",
      permissions: options?.permissions ?? ["ssh_login", "scp"],
      limits: { max_concurrent_sessions: 1, session_ttl_seconds: 3600 },
    },
    lifecycle: {
      activation: options?.activation ?? "on_first_auth",
      expiry: null,
      revocable: options?.revocable ?? true,
    },
    issuer: {
      type: "inscription",
      inscription_id: resourceInscriptionId,
    },
    metadata: {
      display_name: options?.display_name ?? `Access: ${resource.name}`,
    },
  };
}
