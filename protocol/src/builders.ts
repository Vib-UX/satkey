import { PROTOCOL_ID, PROTOCOL_VERSION } from "./types.js";
import type {
  AccessResource,
  AccessToken,
  ModelManifest,
  ResourceKind,
  SshRole,
  Permission,
  ActivationMode,
} from "./types.js";

// ── Access Resource builder ──────────────────────────────────────────
export interface BuildResourceOpts {
  resource_id: string;
  name: string;
  description: string;
  resource_kind: ResourceKind;
  resource_metadata?: Record<string, string>;
  network?: AccessResource["auth_params"]["network"];
  max_sessions?: number;
  session_ttl_seconds?: number;
  controller_pubkey: string;
}

export function buildAccessResource(
  opts: BuildResourceOpts
): AccessResource {
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    type: "access_resource",
    resource_id: opts.resource_id,
    name: opts.name,
    description: opts.description,
    resource_kind: opts.resource_kind,
    resource_metadata: opts.resource_metadata ?? {},
    auth_model: "wallet_signature",
    auth_params: {
      chain: "bitcoin",
      network: opts.network ?? "mainnet",
    },
    policy: {
      max_sessions: opts.max_sessions ?? 1,
      session_ttl_seconds: opts.session_ttl_seconds ?? 3600,
    },
    controller: {
      type: "pubkey",
      pubkey: opts.controller_pubkey,
    },
  };
}

// ── Access Token builder ─────────────────────────────────────────────
export interface BuildTokenOpts {
  resource_id: string;
  token_id: string;
  role: SshRole;
  permissions: Permission[];
  max_concurrent_sessions?: number;
  session_ttl_seconds?: number;
  activation?: ActivationMode;
  expiry?: string | null;
  revocable?: boolean;
  resource_inscription_id: string;
  display_name: string;
  image?: string;
  external_url?: string;
}

export function buildAccessToken(opts: BuildTokenOpts): AccessToken {
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    type: "access_token",
    resource_id: opts.resource_id,
    token_id: opts.token_id,
    rights: {
      role: opts.role,
      permissions: opts.permissions,
      limits: {
        max_concurrent_sessions: opts.max_concurrent_sessions ?? 1,
        session_ttl_seconds: opts.session_ttl_seconds ?? 3600,
      },
    },
    lifecycle: {
      activation: opts.activation ?? "on_first_auth",
      expiry: opts.expiry ?? null,
      revocable: opts.revocable ?? true,
    },
    issuer: {
      type: "inscription",
      inscription_id: opts.resource_inscription_id,
    },
    metadata: {
      display_name: opts.display_name,
      ...(opts.image && { image: opts.image }),
      ...(opts.external_url && { external_url: opts.external_url }),
    },
  };
}

// ── Model Manifest builder ───────────────────────────────────────────
export interface BuildManifestOpts {
  model_id: string;
  name: string;
  hash: string;
  hash_algorithm?: string;
  uris: string[];
  metadata?: Record<string, string>;
}

export function buildModelManifest(
  opts: BuildManifestOpts
): ModelManifest {
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    type: "model_manifest",
    model_id: opts.model_id,
    name: opts.name,
    hash: opts.hash,
    hash_algorithm: opts.hash_algorithm ?? "sha256",
    uris: opts.uris,
    metadata: opts.metadata ?? {},
  };
}
