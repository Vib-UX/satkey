# SatKey

Bitcoin Ordinals–based access-control protocol.  
Turn inscribed sats into keys for off-chain resources — VPS/SSH, LLM endpoints, HTTP services.

## How it works

```
┌──────────┐  challenge   ┌──────────┐  owns inscription?  ┌─────────┐
│  Wallet  │ ◄──────────► │ Verifier │ ◄──────────────────► │ Indexer │
│  (user)  │  signature   │ (auth    │  current owner addr  │ (chain) │
└──────────┘              │  gateway)│                      └─────────┘
                          └────┬─────┘
                               │ grant / revoke
                          ┌────▼─────┐
                          │ SSH Agent│  writes authorized_keys
                          │ (VPS)    │  on the target machine
                          └──────────┘
```

1. An **Access Resource** inscription describes the gated resource (VPS, LLM endpoint, etc.).
2. An **Access Token** inscription binds an ordinal to rights on that resource.
3. Whoever controls the sat carrying the token is the current key-holder.
4. The **Verifier** issues a challenge, verifies the wallet signature, checks on-chain ownership, and grants a session.
5. The **SSH Agent** daemon receives grant/revoke callbacks and manages `authorized_keys`.

## Repository structure

```
protocol/       Core types, Zod schemas, validation, builders, parsers
verifier/       HTTP auth gateway (Fastify) — challenge-response + ownership checks
agents/ssh/     VPS-side daemon — manages SSH authorized_keys
examples/       End-to-end demo flows
```

## Quick start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the local demo (no chain needed)
pnpm --filter @satkey/examples demo:local

# Start the verifier (dev mode — mock indexer, stub signatures)
NETWORK=regtest pnpm --filter @satkey/verifier start

# Start the SSH agent (dry-run mode)
DRY_RUN=true pnpm --filter @satkey/ssh-agent start
```

## Gate a VPS with SatKey in 5 minutes

### 1. Create inscription payloads

Use the protocol SDK to build the JSON payloads you'll inscribe:

```typescript
import { buildAccessResource, buildAccessToken } from "@satkey/protocol";

const resource = buildAccessResource({
  resource_id: "res:bitcoin-vps:my-server-1",
  name: "My VPS",
  description: "Ubuntu 24 with GPU",
  resource_kind: "vps",
  resource_metadata: { region: "us-east-1" },
  controller_pubkey: "<your-pubkey>",
});

const token = buildAccessToken({
  resource_id: "res:bitcoin-vps:my-server-1",
  token_id: "tok:my-server-1:ssh-user-0001",
  role: "ssh_user",
  permissions: ["ssh_login", "scp"],
  resource_inscription_id: "<resource-inscription-id>",
  display_name: "VPS Access Pass",
});
```

### 2. Inscribe on Bitcoin

Use `ord` or any inscription service to inscribe the resource JSON first, then the token JSON (referencing the resource inscription ID in the `issuer` field).

### 3. Deploy verifier + SSH agent

On your VPS:

```bash
# Set environment
export INDEXER_URL=https://api.hiro.so/ordinals/v1
export SSH_AGENT_URL=http://127.0.0.1:3100
export SSH_USER=satkey

# Start services
pnpm --filter @satkey/verifier start &
pnpm --filter @satkey/ssh-agent start &
```

### 4. Authenticate

From the client side:

```bash
# 1. Request a challenge
curl -X POST http://your-vps:3000/auth/challenge \
  -H 'Content-Type: application/json' \
  -d '{"token_inscription_id": "<your-token-inscription-id>"}'

# 2. Sign the challenge message with your Bitcoin wallet

# 3. Submit signature + SSH pubkey
curl -X POST http://your-vps:3000/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "challenge": { ... },
    "signature": "<wallet-signature>",
    "address": "<your-bitcoin-address>",
    "ssh_pubkey": "ssh-ed25519 AAAA..."
  }'

# 4. SSH in
ssh satkey@your-vps
```

When the token inscription transfers to a new address, the previous owner's SSH key is automatically removed.

## Integrate a new wallet

The verifier's signature verification is pluggable. Implement the `SignatureVerifier` interface:

```typescript
interface SignatureVerifier {
  verify(message: string, signature: string, address: string): Promise<boolean>;
}
```

Built-in verifiers:
- `BitcoinMessageVerifier` — legacy Bitcoin Signed Message format
- `DevSignatureVerifier` — always returns true (dev/testing only)

## Define custom Access Resources and Tokens

The protocol schemas are defined with Zod in `@satkey/protocol`. Extend `resource_kind` or add new permission types by updating `protocol/src/types.ts` and `protocol/src/schemas.ts`.

All inscription payloads must include:
```json
{
  "protocol": "access-ordinals",
  "version": "0.1"
}
```

## Configuration

### Verifier (`verifier/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `INDEXER_URL` | Hiro API | Ordinals indexer endpoint |
| `NETWORK` | `mainnet` | Bitcoin network |
| `SESSION_STORE` | `memory` | Session backend (`memory` or `redis`) |
| `SSH_AGENT_URL` | — | SSH agent callback URL |

### SSH Agent (`agents/ssh/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | HTTP listen port |
| `SSH_USER` | `satkey` | System user to manage |
| `AUTHORIZED_KEYS_PATH` | auto | Path to authorized_keys |
| `VERIFIER_URL` | `http://localhost:3000` | Verifier endpoint for polling |
| `POLL_INTERVAL_SECONDS` | `30` | Ownership check interval |
| `DRY_RUN` | `false` | Log changes without writing files |

## License

MIT
