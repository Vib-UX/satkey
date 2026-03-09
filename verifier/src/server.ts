import Fastify, { type FastifyInstance } from "fastify";
import { AuthResponseSchema } from "@satkey/protocol";
import { AuthService, AuthError } from "./auth.js";
import type { VerifierConfig } from "./config.js";

export function buildServer(
  authService: AuthService,
  config: VerifierConfig
): FastifyInstance {
  const app = Fastify({ logger: true });

  // ── Health ─────────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok" }));

  // ── Resolve a token inscription ────────────────────────────────────
  app.get<{ Params: { inscriptionId: string } }>(
    "/token/:inscriptionId",
    async (req) => {
      const { token, resource } = await authService.resolveToken(
        req.params.inscriptionId
      );
      return { token, resource };
    }
  );

  // ── Issue challenge ────────────────────────────────────────────────
  app.post<{ Body: { token_inscription_id: string } }>(
    "/auth/challenge",
    async (req) => {
      const { token_inscription_id } = req.body;
      if (!token_inscription_id) {
        return { error: "token_inscription_id required" };
      }
      const challenge = await authService.issueChallenge(token_inscription_id);
      return { challenge };
    }
  );

  // ── Authenticate ───────────────────────────────────────────────────
  app.post("/auth/verify", async (req, reply) => {
    const body = req.body as Record<string, unknown>;

    const parsed = AuthResponseSchema.safeParse({
      challenge: body.challenge,
      signature: body.signature,
      address: body.address,
      ssh_pubkey: body.ssh_pubkey,
    });

    if (!parsed.success) {
      reply.status(400);
      return {
        error: "invalid_request",
        details: parsed.error.issues,
      };
    }

    const { challenge, signature, address, ssh_pubkey } = parsed.data;

    const session = await authService.authenticate(
      challenge.nonce,
      signature,
      address,
      ssh_pubkey
    );

    return { session };
  });

  // ── Revoke session ─────────────────────────────────────────────────
  app.post<{ Params: { sessionId: string } }>(
    "/sessions/:sessionId/revoke",
    async (req) => {
      await authService.handleOwnershipChange(req.params.sessionId);
      return { revoked: true };
    }
  );

  // ── Error handler ──────────────────────────────────────────────────
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AuthError) {
      reply.status(403).send({
        error: error.code,
        details: error.details,
      });
      return;
    }
    reply.status(500).send({ error: "internal_error" });
  });

  return app;
}
