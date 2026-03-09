import type { SshAgentConfig } from "./config.js";
import { listManagedSessions, removeKey } from "./keys.js";

/**
 * Periodically polls the verifier to check whether sessions are still valid.
 * If a session has been revoked (e.g. ownership transfer), the corresponding
 * SSH key is removed from authorized_keys.
 */
export class OwnershipWatcher {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private config: SshAgentConfig) {}

  start(): void {
    if (this.timer) return;

    console.log(
      `Ownership watcher started (interval: ${this.config.pollIntervalSeconds}s)`
    );

    this.timer = setInterval(
      () => this.poll(),
      this.config.pollIntervalSeconds * 1000
    );

    this.poll();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const sessionIds = await listManagedSessions(
        this.config.authorizedKeysPath
      );
      if (sessionIds.length === 0) return;

      for (const sessionId of sessionIds) {
        const valid = await this.checkSession(sessionId);
        if (!valid) {
          await removeKey(
            this.config.authorizedKeysPath,
            sessionId,
            this.config.dryRun
          );
        }
      }
    } catch (err) {
      console.error(`Watcher poll error: ${err}`);
    }
  }

  private async checkSession(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.config.verifierUrl}/sessions/${sessionId}`,
        { method: "GET" }
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { session?: { revoked?: boolean; expires_at?: number } };
      if (!data.session) return false;
      if (data.session.revoked) return false;
      if (data.session.expires_at && data.session.expires_at < Date.now())
        return false;
      return true;
    } catch {
      // If we can't reach the verifier, don't revoke (fail open for availability).
      // Alternatively, configure fail-closed behavior in production.
      return true;
    }
  }
}
