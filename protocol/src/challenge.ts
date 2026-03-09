import { randomBytes } from "node:crypto";
import type { AuthChallenge } from "./types.js";

const NONCE_BYTES = 16;

export function createChallenge(
  resourceId: string,
  tokenInscriptionId: string
): AuthChallenge {
  const timestamp = Date.now();
  const nonce = randomBytes(NONCE_BYTES).toString("hex");

  const message = [
    "access-ordinals challenge",
    `resource:${resourceId}`,
    `token:${tokenInscriptionId}`,
    `ts:${timestamp}`,
    `nonce:${nonce}`,
  ].join("\n");

  return {
    resource_id: resourceId,
    token_inscription_id: tokenInscriptionId,
    timestamp,
    nonce,
    message,
  };
}

const MAX_CHALLENGE_AGE_MS = 5 * 60 * 1000;

export function isChallengeExpired(
  challenge: AuthChallenge,
  now: number = Date.now()
): boolean {
  return now - challenge.timestamp > MAX_CHALLENGE_AGE_MS;
}
