import { homedir } from "node:os";
import { join } from "node:path";

export interface SshAgentConfig {
  port: number;
  host: string;
  sshUser: string;
  authorizedKeysPath: string;
  verifierUrl: string;
  pollIntervalSeconds: number;
  dryRun: boolean;
}

export function loadConfig(): SshAgentConfig {
  const sshUser = process.env.SSH_USER ?? "satkey";

  return {
    port: parseInt(process.env.PORT ?? "3100", 10),
    host: process.env.HOST ?? "127.0.0.1",
    sshUser,
    authorizedKeysPath:
      process.env.AUTHORIZED_KEYS_PATH ??
      join("/home", sshUser, ".ssh", "authorized_keys"),
    verifierUrl: process.env.VERIFIER_URL ?? "http://localhost:3000",
    pollIntervalSeconds: parseInt(
      process.env.POLL_INTERVAL_SECONDS ?? "30",
      10
    ),
    dryRun: process.env.DRY_RUN === "true",
  };
}
