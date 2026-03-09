import { randomUUID } from "node:crypto";
import type { Session } from "@satkey/protocol";

export interface SessionStore {
  create(params: Omit<Session, "session_id">): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  listByToken(tokenInscriptionId: string): Promise<Session[]>;
  revoke(sessionId: string): Promise<void>;
  revokeByToken(tokenInscriptionId: string): Promise<number>;
  revokeByAddress(address: string): Promise<number>;
  cleanup(): Promise<number>;
}

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>();

  async create(params: Omit<Session, "session_id">): Promise<Session> {
    const session: Session = {
      ...params,
      session_id: randomUUID(),
    };
    this.sessions.set(session.session_id, session);
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    const s = this.sessions.get(sessionId);
    if (!s || s.revoked || s.expires_at < Date.now()) return null;
    return s;
  }

  async listByToken(tokenInscriptionId: string): Promise<Session[]> {
    return [...this.sessions.values()].filter(
      (s) =>
        s.token_inscription_id === tokenInscriptionId &&
        !s.revoked &&
        s.expires_at >= Date.now()
    );
  }

  async revoke(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) s.revoked = true;
  }

  async revokeByToken(tokenInscriptionId: string): Promise<number> {
    let count = 0;
    for (const s of this.sessions.values()) {
      if (s.token_inscription_id === tokenInscriptionId && !s.revoked) {
        s.revoked = true;
        count++;
      }
    }
    return count;
  }

  async revokeByAddress(address: string): Promise<number> {
    let count = 0;
    for (const s of this.sessions.values()) {
      if (s.address === address && !s.revoked) {
        s.revoked = true;
        count++;
      }
    }
    return count;
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const [id, s] of this.sessions) {
      if (s.revoked || s.expires_at < now) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }
}
