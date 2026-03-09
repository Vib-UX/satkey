/**
 * Local end-to-end demo of the SatKey protocol flow.
 *
 * This script does NOT hit the real chain. It simulates:
 *  1. Creating an Access Resource inscription payload
 *  2. Creating an Access Token inscription payload
 *  3. Issuing a challenge
 *  4. "Signing" the challenge (stubbed)
 *  5. Verifying ownership and granting a session
 *  6. Simulating an ownership transfer → session revocation
 *
 * Run:  pnpm --filter @satkey/examples demo:local
 */

import {
  buildAccessResource,
  buildAccessToken,
  validateAccessResource,
  validateAccessToken,
  createChallenge,
  isChallengeExpired,
  parseInscriptionJson,
  narrowType,
} from "@satkey/protocol";

function heading(text: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${text}`);
  console.log("═".repeat(60));
}

// ── 1. Build and validate an Access Resource ─────────────────────────
heading("1. Build Access Resource");

const resource = buildAccessResource({
  resource_id: "res:bitcoin-vps:demo-1",
  name: "Demo VPS #1",
  description: "Ubuntu VPS for demo purposes",
  resource_kind: "vps",
  resource_metadata: { region: "us-east-1", provider: "demo.cloud" },
  network: "regtest",
  max_sessions: 2,
  session_ttl_seconds: 1800,
  controller_pubkey: "02abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
});

const resourceResult = validateAccessResource(resource);
console.log("Valid:", resourceResult.success);
console.log("Resource ID:", resource.resource_id);
console.log("Kind:", resource.resource_kind);
console.log(JSON.stringify(resource, null, 2));

// ── 2. Build and validate an Access Token ────────────────────────────
heading("2. Build Access Token");

const RESOURCE_INSCRIPTION_ID =
  "6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0";

const token = buildAccessToken({
  resource_id: "res:bitcoin-vps:demo-1",
  token_id: "tok:demo-1:ssh-user-0001",
  role: "ssh_user",
  permissions: ["ssh_login", "scp"],
  max_concurrent_sessions: 1,
  session_ttl_seconds: 1800,
  resource_inscription_id: RESOURCE_INSCRIPTION_ID,
  display_name: "Demo SSH Access Pass",
  external_url: "https://satkey.example/demo-1",
});

const tokenResult = validateAccessToken(token);
console.log("Valid:", tokenResult.success);
console.log("Token ID:", token.token_id);
console.log("Role:", token.rights.role);
console.log(JSON.stringify(token, null, 2));

// ── 3. Parse inscription JSON (round-trip) ───────────────────────────
heading("3. Parse inscription JSON");

const serialized = JSON.stringify(token);
const parseResult = parseInscriptionJson(serialized);
console.log("Parsed successfully:", parseResult.success);

if (parseResult.data) {
  const narrowed = narrowType(parseResult.data, "access_token");
  console.log("Narrowed to access_token:", narrowed !== null);
  console.log("Token ID from parsed:", narrowed?.token_id);
}

// ── 4. Issue a challenge ─────────────────────────────────────────────
heading("4. Issue challenge");

const TOKEN_INSCRIPTION_ID =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2i0";

const challenge = createChallenge(
  "res:bitcoin-vps:demo-1",
  TOKEN_INSCRIPTION_ID
);

console.log("Challenge nonce:", challenge.nonce);
console.log("Timestamp:", new Date(challenge.timestamp).toISOString());
console.log("Expired:", isChallengeExpired(challenge));
console.log("Message:\n", challenge.message);

// ── 5. Simulate signature verification (stubbed) ────────────────────
heading("5. Simulate authentication");

const MOCK_OWNER = "bc1qexampleowner123456789";
const MOCK_SIGNATURE = "HMEUCIQD...mock-signature";

console.log(`Owner address: ${MOCK_OWNER}`);
console.log(`Signature: ${MOCK_SIGNATURE.slice(0, 20)}...`);
console.log("(In production, the verifier service handles this via HTTP)");
console.log("Session would be created with TTL:", token.rights.limits.session_ttl_seconds, "seconds");

// ── 6. Simulate ownership transfer → revocation ─────────────────────
heading("6. Simulate ownership transfer");

const NEW_OWNER = "bc1qnewowner987654321";
console.log(`Token inscription transferred to: ${NEW_OWNER}`);
console.log("Previous owner's session would be revoked.");
console.log("SSH key removed from authorized_keys.");
console.log("New owner must re-authenticate to get access.");

heading("Demo complete");
console.log("See README.md for full integration guide.\n");
