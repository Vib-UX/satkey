import { loadConfig } from "./config.js";
import { buildAgentServer } from "./server.js";
import { OwnershipWatcher } from "./watcher.js";

async function main() {
  const config = loadConfig();

  console.log(`SSH agent starting for user "${config.sshUser}"`);
  console.log(`authorized_keys: ${config.authorizedKeysPath}`);
  if (config.dryRun) console.log("DRY RUN MODE — no files will be modified");

  const server = buildAgentServer(config);
  const watcher = new OwnershipWatcher(config);

  await server.listen({ port: config.port, host: config.host });
  console.log(`SSH agent listening on ${config.host}:${config.port}`);

  watcher.start();

  const shutdown = async () => {
    console.log("Shutting down...");
    watcher.stop();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
