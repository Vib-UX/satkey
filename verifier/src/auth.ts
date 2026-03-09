import {
  createChallenge,
  isChallengeExpired,
  parseInscriptionJson,
  narrowType,
  type AccessToken,
  type AccessResource,
  type AuthChallenge,
  type Session,
} from "@satkey/protocol";

import type { IndexerClient } from "./indexer.js";
import type { SessionStore } from "./sessions.js";
import type { SignatureVerifier } from "./signature.js";

export interface AuthServiceDeps {
  indexer: IndexerClient;
  sessions: SessionStore;
  signer: SignatureVerifier;
  onSessionCreated?: (session: Session) => Promise<void>;
  onSessionRevoked?: (session: Session) => Promise<void>;
}

export class AuthService {
  private pendingChallenges = new Map<string, AuthChallenge>();

  constructor(private deps: AuthServiceDeps) {}

  // ── Step 1: resolve token inscription → AccessToken + AccessResource ──
  async resolveToken(
    tokenInscriptionId: string
  ): Promise<{ token: AccessToken; resource: AccessResource }> {
    const content = await this.deps.indexer.getInscriptionContent(
      tokenInscriptionId
    );
    const parsed = parseInscriptionJson(content);
    if (!parsed.success || !parsed.data) {
      throw new AuthError("INVALID_INSCRIPTION", parsed.errors);
    }

    const token = narrowType(parsed.data, "access_token");
    if (!token) {
      throw new AuthError("NOT_ACCESS_TOKEN");
    }

    const resourceInscriptionId = token.issuer.inscription_id;
    const resourceContent = await this.deps.indexer.getInscriptionContent(
      resourceInscriptionId
    );
    const resParsed = parseInscriptionJson(resourceContent);
    if (!resParsed.success || !resParsed.data) {
      throw new AuthError("INVALID_RESOURCE_INSCRIPTION", resParsed.errors);
    }
    const resource = narrowType(resParsed.data, "access_resource");
    if (!resource) {
      throw new AuthError("NOT_ACCESS_RESOURCE");
    }

    if (resource.resource_id !== token.resource_id) {
      throw new AuthError("RESOURCE_ID_MISMATCH");
    }

    return { token, resource };
  }

  // ── Step 2: issue a challenge ──────────────────────────────────────
  async issueChallenge(tokenInscriptionId: string): Promise<AuthChallenge> {
    const { token } = await this.resolveToken(tokenInscriptionId);
    const challenge = createChallenge(token.resource_id, tokenInscriptionId);
    this.pendingChallenges.set(challenge.nonce, challenge);
    return challenge;
  }

  // ── Step 3: verify response and grant session ──────────────────────
  async authenticate(
    nonce: string,
    signature: string,
    address: string,
    sshPubkey?: string
  ): Promise<Session> {
    const challenge = this.pendingChallenges.get(nonce);
    if (!challenge) {
      throw new AuthError("UNKNOWN_CHALLENGE");
    }
    this.pendingChallenges.delete(nonce);

    if (isChallengeExpired(challenge)) {
      throw new AuthError("CHALLENGE_EXPIRED");
    }

    // Verify on-chain ownership
    const currentOwner = await this.deps.indexer.getCurrentOwner(
      challenge.token_inscription_id
    );
    if (currentOwner !== address) {
      throw new AuthError("NOT_OWNER", [
        {
          path: "address",
          message: `Expected ${currentOwner}, got ${address}`,
        },
      ]);
    }

    // Verify signature
    const valid = await this.deps.signer.verify(
      challenge.message,
      signature,
      address
    );
    if (!valid) {
      throw new AuthError("INVALID_SIGNATURE");
    }

    const { token } = await this.resolveToken(challenge.token_inscription_id);

    // Enforce max concurrent sessions
    const existing = await this.deps.sessions.listByToken(
      challenge.token_inscription_id
    );
    if (existing.length >= token.rights.limits.max_concurrent_sessions) {
      throw new AuthError("MAX_SESSIONS_REACHED");
    }

    const now = Date.now();
    const session = await this.deps.sessions.create({
      token_inscription_id: challenge.token_inscription_id,
      resource_id: token.resource_id,
      address,
      ssh_pubkey: sshPubkey,
      created_at: now,
      expires_at: now + token.rights.limits.session_ttl_seconds * 1000,
      revoked: false,
    });

    if (this.deps.onSessionCreated) {
      await this.deps.onSessionCreated(session);
    }

    return session;
  }

  // ── Ownership change handler ───────────────────────────────────────
  async handleOwnershipChange(tokenInscriptionId: string): Promise<void> {
    const sessions =
      await this.deps.sessions.listByToken(tokenInscriptionId);
    for (const s of sessions) {
      await this.deps.sessions.revoke(s.session_id);
      if (this.deps.onSessionRevoked) {
        await this.deps.onSessionRevoked(s);
      }
    }
  }
}

export class AuthError extends Error {
  constructor(
    public code: string,
    public details?: Array<{ path: string; message: string }>
  ) {
    super(`AuthError: ${code}`);
    this.name = "AuthError";
  }
}
