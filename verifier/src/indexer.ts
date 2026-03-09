/**
 * Ordinals indexer client.
 * Supports the Hiro ordinals API and compatible endpoints.
 * Swap implementations here if you run your own `ord` server.
 */
export interface InscriptionInfo {
  id: string;
  content_type: string;
  content: string;
  owner_address: string;
  sat_number: number;
  genesis_address: string;
}

export interface IndexerClient {
  getInscription(inscriptionId: string): Promise<InscriptionInfo>;
  getInscriptionContent(inscriptionId: string): Promise<string>;
  getCurrentOwner(inscriptionId: string): Promise<string>;
}

export class HiroIndexerClient implements IndexerClient {
  constructor(private baseUrl: string) {}

  async getInscription(inscriptionId: string): Promise<InscriptionInfo> {
    const res = await fetch(
      `${this.baseUrl}/inscriptions/${encodeURIComponent(inscriptionId)}`
    );
    if (!res.ok) {
      throw new Error(
        `Indexer error: ${res.status} fetching inscription ${inscriptionId}`
      );
    }
    const data = (await res.json()) as Record<string, unknown>;

    return {
      id: data.id as string,
      content_type: data.content_type as string,
      content: "",
      owner_address: data.address as string,
      sat_number: data.sat_ordinal as number,
      genesis_address: data.genesis_address as string,
    };
  }

  async getInscriptionContent(inscriptionId: string): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/inscriptions/${encodeURIComponent(inscriptionId)}/content`
    );
    if (!res.ok) {
      throw new Error(
        `Indexer error: ${res.status} fetching content for ${inscriptionId}`
      );
    }
    return res.text();
  }

  async getCurrentOwner(inscriptionId: string): Promise<string> {
    const info = await this.getInscription(inscriptionId);
    return info.owner_address;
  }
}

/**
 * In-memory mock indexer for testing / local development.
 * Pre-populate with `register()`.
 */
export class MockIndexerClient implements IndexerClient {
  private inscriptions = new Map<
    string,
    { content: string; owner: string }
  >();

  register(inscriptionId: string, content: string, owner: string): void {
    this.inscriptions.set(inscriptionId, { content, owner });
  }

  transferOwnership(inscriptionId: string, newOwner: string): void {
    const entry = this.inscriptions.get(inscriptionId);
    if (!entry) throw new Error(`Unknown inscription: ${inscriptionId}`);
    entry.owner = newOwner;
  }

  async getInscription(inscriptionId: string): Promise<InscriptionInfo> {
    const entry = this.inscriptions.get(inscriptionId);
    if (!entry) throw new Error(`Unknown inscription: ${inscriptionId}`);
    return {
      id: inscriptionId,
      content_type: "application/json",
      content: entry.content,
      owner_address: entry.owner,
      sat_number: 0,
      genesis_address: entry.owner,
    };
  }

  async getInscriptionContent(inscriptionId: string): Promise<string> {
    const entry = this.inscriptions.get(inscriptionId);
    if (!entry) throw new Error(`Unknown inscription: ${inscriptionId}`);
    return entry.content;
  }

  async getCurrentOwner(inscriptionId: string): Promise<string> {
    const entry = this.inscriptions.get(inscriptionId);
    if (!entry) throw new Error(`Unknown inscription: ${inscriptionId}`);
    return entry.owner;
  }
}
