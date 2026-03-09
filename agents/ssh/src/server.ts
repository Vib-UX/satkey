import Fastify, { type FastifyInstance } from "fastify";
import type { Session } from "@satkey/protocol";
import type { SshAgentConfig } from "./config.js";
import { addKey, removeKey } from "./keys.js";

/**
 * Tiny HTTP server that receives grant/revoke callbacks from the verifier.
 */
export function buildAgentServer(config: SshAgentConfig): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ status: "ok", user: config.sshUser }));

  app.post("/grant", async (req, reply) => {
    const session = req.body as Session;

    if (!session.ssh_pubkey) {
      reply.status(400);
      return { error: "ssh_pubkey is required for VPS access" };
    }

    await addKey(
      config.authorizedKeysPath,
      session.session_id,
      session.ssh_pubkey,
      config.dryRun
    );

    return { granted: true, session_id: session.session_id };
  });

  app.post("/revoke", async (req) => {
    const session = req.body as Session;

    await removeKey(
      config.authorizedKeysPath,
      session.session_id,
      config.dryRun
    );

    return { revoked: true, session_id: session.session_id };
  });

  return app;
}
