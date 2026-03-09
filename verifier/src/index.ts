import type { Session } from "@satkey/protocol";
import { loadConfig } from "./config.js";
import { HiroIndexerClient, MockIndexerClient } from "./indexer.js";
import { DevSignatureVerifier, BitcoinMessageVerifier } from "./signature.js";
import { MemorySessionStore } from "./sessions.js";
import { AuthService } from "./auth.js";
import { buildServer } from "./server.js";

async function main() {
  const config = loadConfig();

  const isDev = config.network !== "mainnet";

  const indexer = isDev
    ? new MockIndexerClient()
    : new HiroIndexerClient(config.indexerUrl);

  const signer = isDev
    ? new DevSignatureVerifier()
    : new BitcoinMessageVerifier();

  const sessions = new MemorySessionStore();

  const notifySshAgent = config.sshAgentUrl
    ? async (path: string, session: Session) => {
        try {
          await fetch(`${config.sshAgentUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(session),
          });
        } catch (err) {
          console.error(`Failed to notify SSH agent: ${err}`);
        }
      }
    : undefined;

  const authService = new AuthService({
    indexer,
    sessions,
    signer,
    onSessionCreated: notifySshAgent
      ? (s) => notifySshAgent("/grant", s)
      : undefined,
    onSessionRevoked: notifySshAgent
      ? (s) => notifySshAgent("/revoke", s)
      : undefined,
  });

  const server = buildServer(authService, config);

  await server.listen({ port: config.port, host: config.host });
  console.log(`Verifier listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
