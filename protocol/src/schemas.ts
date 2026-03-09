import { z } from "zod";
import { PROTOCOL_ID, PROTOCOL_VERSION } from "./types.js";

const protocolHeader = {
  protocol: z.literal(PROTOCOL_ID),
  version: z.literal(PROTOCOL_VERSION),
};

// ── Access Resource ──────────────────────────────────────────────────
export const ResourcePolicySchema = z.object({
  max_sessions: z.number().int().positive(),
  session_ttl_seconds: z.number().int().positive(),
});

export const ResourceControllerSchema = z.object({
  type: z.literal("pubkey"),
  pubkey: z.string().min(1),
});

export const AccessResourceSchema = z.object({
  ...protocolHeader,
  type: z.literal("access_resource"),
  resource_id: z.string().regex(/^res:/, "resource_id must start with 'res:'"),
  name: z.string().min(1),
  description: z.string(),
  resource_kind: z.enum(["vps", "llm_endpoint", "http_service"]),
  resource_metadata: z.record(z.string()),
  auth_model: z.literal("wallet_signature"),
  auth_params: z.object({
    chain: z.literal("bitcoin"),
    network: z.enum(["mainnet", "testnet", "signet", "regtest"]),
  }),
  policy: ResourcePolicySchema,
  controller: ResourceControllerSchema,
});

// ── Access Token ─────────────────────────────────────────────────────
export const TokenRightsSchema = z.object({
  role: z.enum(["ssh_user", "ssh_admin", "ssh_root"]),
  permissions: z.array(
    z.enum([
      "ssh_login",
      "scp",
      "sftp",
      "port_forward",
      "llm_query",
      "http_access",
    ])
  ),
  limits: z.object({
    max_concurrent_sessions: z.number().int().positive(),
    session_ttl_seconds: z.number().int().positive(),
  }),
});

export const TokenLifecycleSchema = z.object({
  activation: z.enum(["on_first_auth", "immediate", "manual"]),
  expiry: z.string().nullable(),
  revocable: z.boolean(),
});

export const TokenIssuerSchema = z.object({
  type: z.literal("inscription"),
  inscription_id: z.string().min(1),
});

export const TokenMetadataSchema = z.object({
  display_name: z.string().min(1),
  image: z.string().optional(),
  external_url: z.string().url().optional(),
});

export const AccessTokenSchema = z.object({
  ...protocolHeader,
  type: z.literal("access_token"),
  resource_id: z.string().regex(/^res:/, "resource_id must start with 'res:'"),
  token_id: z.string().regex(/^tok:/, "token_id must start with 'tok:'"),
  rights: TokenRightsSchema,
  lifecycle: TokenLifecycleSchema,
  issuer: TokenIssuerSchema,
  metadata: TokenMetadataSchema,
});

// ── Model Manifest ───────────────────────────────────────────────────
export const ModelManifestSchema = z.object({
  ...protocolHeader,
  type: z.literal("model_manifest"),
  model_id: z.string().min(1),
  name: z.string().min(1),
  hash: z.string().min(1),
  hash_algorithm: z.string().min(1),
  uris: z.array(z.string().url()),
  metadata: z.record(z.string()),
});

// ── Discriminated union ──────────────────────────────────────────────
export const ProtocolInscriptionSchema = z.discriminatedUnion("type", [
  AccessResourceSchema,
  AccessTokenSchema,
  ModelManifestSchema,
]);

// ── Challenge / Auth ─────────────────────────────────────────────────
export const AuthChallengeSchema = z.object({
  resource_id: z.string(),
  token_inscription_id: z.string(),
  timestamp: z.number(),
  nonce: z.string(),
  message: z.string(),
});

export const AuthResponseSchema = z.object({
  challenge: AuthChallengeSchema,
  signature: z.string(),
  address: z.string(),
  ssh_pubkey: z.string().optional(),
});
