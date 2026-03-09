// ── Protocol envelope ────────────────────────────────────────────────
export const PROTOCOL_ID = "access-ordinals" as const;
export const PROTOCOL_VERSION = "0.1" as const;

export type InscriptionType =
  | "access_resource"
  | "access_token"
  | "model_manifest";

// ── Resource kinds ───────────────────────────────────────────────────
export type ResourceKind = "vps" | "llm_endpoint" | "http_service";

// ── Auth models ──────────────────────────────────────────────────────
export type AuthModel = "wallet_signature";

// ── Token rights ─────────────────────────────────────────────────────
export type SshRole = "ssh_user" | "ssh_admin" | "ssh_root";
export type Permission =
  | "ssh_login"
  | "scp"
  | "sftp"
  | "port_forward"
  | "llm_query"
  | "http_access";

// ── Lifecycle ────────────────────────────────────────────────────────
export type ActivationMode = "on_first_auth" | "immediate" | "manual";

// ── Access Resource ──────────────────────────────────────────────────
export interface ResourcePolicy {
  max_sessions: number;
  session_ttl_seconds: number;
}

export interface ResourceController {
  type: "pubkey";
  pubkey: string;
}

export interface AccessResource {
  protocol: typeof PROTOCOL_ID;
  version: typeof PROTOCOL_VERSION;
  type: "access_resource";
  resource_id: string;
  name: string;
  description: string;
  resource_kind: ResourceKind;
  resource_metadata: Record<string, string>;
  auth_model: AuthModel;
  auth_params: {
    chain: "bitcoin";
    network: "mainnet" | "testnet" | "signet" | "regtest";
  };
  policy: ResourcePolicy;
  controller: ResourceController;
}

// ── Access Token ─────────────────────────────────────────────────────
export interface TokenRightsLimits {
  max_concurrent_sessions: number;
  session_ttl_seconds: number;
}

export interface TokenRights {
  role: SshRole;
  permissions: Permission[];
  limits: TokenRightsLimits;
}

export interface TokenLifecycle {
  activation: ActivationMode;
  expiry: string | null;
  revocable: boolean;
}

export interface TokenIssuer {
  type: "inscription";
  inscription_id: string;
}

export interface TokenMetadata {
  display_name: string;
  image?: string;
  external_url?: string;
}

export interface AccessToken {
  protocol: typeof PROTOCOL_ID;
  version: typeof PROTOCOL_VERSION;
  type: "access_token";
  resource_id: string;
  token_id: string;
  rights: TokenRights;
  lifecycle: TokenLifecycle;
  issuer: TokenIssuer;
  metadata: TokenMetadata;
}

// ── Model Manifest (optional) ────────────────────────────────────────
export interface ModelManifest {
  protocol: typeof PROTOCOL_ID;
  version: typeof PROTOCOL_VERSION;
  type: "model_manifest";
  model_id: string;
  name: string;
  hash: string;
  hash_algorithm: string;
  uris: string[];
  metadata: Record<string, string>;
}

// ── Union type for any inscription ───────────────────────────────────
export type ProtocolInscription =
  | AccessResource
  | AccessToken
  | ModelManifest;

// ── Challenge / Auth ─────────────────────────────────────────────────
export interface AuthChallenge {
  resource_id: string;
  token_inscription_id: string;
  timestamp: number;
  nonce: string;
  message: string;
}

export interface AuthResponse {
  challenge: AuthChallenge;
  signature: string;
  address: string;
  ssh_pubkey?: string;
}

export interface Session {
  session_id: string;
  token_inscription_id: string;
  resource_id: string;
  address: string;
  ssh_pubkey?: string;
  created_at: number;
  expires_at: number;
  revoked: boolean;
}
