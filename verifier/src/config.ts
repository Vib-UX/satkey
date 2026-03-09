export interface VerifierConfig {
  port: number;
  host: string;
  indexerUrl: string;
  network: "mainnet" | "testnet" | "signet" | "regtest";
  sessionStore: "memory" | "redis";
  redisUrl?: string;
  sshAgentUrl?: string;
}

export function loadConfig(): VerifierConfig {
  return {
    port: parseInt(process.env.PORT ?? "3000", 10),
    host: process.env.HOST ?? "0.0.0.0",
    indexerUrl:
      process.env.INDEXER_URL ?? "https://api.hiro.so/ordinals/v1",
    network: (process.env.NETWORK as VerifierConfig["network"]) ?? "mainnet",
    sessionStore:
      (process.env.SESSION_STORE as "memory" | "redis") ?? "memory",
    redisUrl: process.env.REDIS_URL,
    sshAgentUrl: process.env.SSH_AGENT_URL,
  };
}
