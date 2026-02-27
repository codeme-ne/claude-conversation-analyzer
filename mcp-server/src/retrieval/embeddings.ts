import type { AppConfig } from '../config.js';
import { nowIso } from '../config.js';
import { tokenizeForSearch } from '../utils/text.js';
import type { AppDatabase } from '../db/database.js';

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

class HashEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'hash-embedding-v1';
  readonly dimensions = 384;

  private hashToken(token: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private embedOne(text: string): number[] {
    const vec = new Array(this.dimensions).fill(0);
    const tokens = tokenizeForSearch(text);

    if (tokens.length === 0) return vec;

    for (const token of tokens) {
      const h1 = this.hashToken(token, 17) % this.dimensions;
      const h2 = this.hashToken(token, 131) % this.dimensions;
      const h3 = this.hashToken(token, 521) % this.dimensions;
      const weight = 1 / Math.sqrt(token.length);
      vec[h1] += weight;
      vec[h2] += weight * 0.6;
      vec[h3] += weight * 0.3;
    }

    let norm = 0;
    for (const value of vec) norm += value * value;
    norm = Math.sqrt(norm) || 1;

    for (let i = 0; i < vec.length; i += 1) {
      vec[i] /= norm;
    }

    return vec;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedOne(text));
  }
}

class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;

  constructor(
    private readonly apiKey: string,
    model = 'text-embedding-3-small',
    dimensions = 1536,
  ) {
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI embeddings request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return payload.data.map((item) => item.embedding);
  }
}

export const createEmbeddingProvider = (cfg: AppConfig): EmbeddingProvider => {
  if (cfg.embeddingProvider === 'openai' && cfg.openAiApiKey) {
    return new OpenAiEmbeddingProvider(cfg.openAiApiKey, cfg.openAiEmbeddingModel);
  }

  return new HashEmbeddingProvider();
};

export class EmbeddingService {
  constructor(
    private readonly appDb: AppDatabase,
    private readonly provider: EmbeddingProvider,
  ) {}

  getProviderInfo() {
    return {
      model: this.provider.model,
      dimensions: this.provider.dimensions,
    };
  }

  async embedQuery(query: string): Promise<number[]> {
    const [vector] = await this.provider.embed([query]);
    return vector || [];
  }

  async indexMissingEmbeddings(batchSize = 128): Promise<{ indexed: number; remaining: number }> {
    const selectMissing = this.appDb.db.prepare(
      `
        SELECT c.id AS chunk_id, c.content
        FROM chunks c
        LEFT JOIN chunk_embeddings e ON e.chunk_id = c.id
        WHERE e.chunk_id IS NULL
        LIMIT ?
      `,
    );

    const insertEmbedding = this.appDb.db.prepare(
      `
        INSERT INTO chunk_embeddings (chunk_id, model, dimensions, vector_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(chunk_id) DO UPDATE SET
          model = excluded.model,
          dimensions = excluded.dimensions,
          vector_json = excluded.vector_json,
          updated_at = excluded.updated_at
      `,
    );

    let totalIndexed = 0;

    while (true) {
      const rows = selectMissing.all(batchSize) as Array<{ chunk_id: string; content: string }>;
      if (rows.length === 0) break;

      const vectors = await this.provider.embed(rows.map((row) => row.content));
      const ts = nowIso();

      this.appDb.transaction(() => {
        rows.forEach((row, index) => {
          const vector = vectors[index] || [];
          insertEmbedding.run(
            row.chunk_id,
            this.provider.model,
            vector.length,
            JSON.stringify(vector),
            ts,
          );
        });
      });

      totalIndexed += rows.length;
    }

    const remaining = this.appDb.db
      .prepare(
        `
          SELECT COUNT(*) AS n
          FROM chunks c
          LEFT JOIN chunk_embeddings e ON e.chunk_id = c.id
          WHERE e.chunk_id IS NULL
        `,
      )
      .get() as { n: number };

    return {
      indexed: totalIndexed,
      remaining: remaining.n,
    };
  }

  async reindexAllEmbeddings(batchSize = 128): Promise<{ indexed: number }> {
    this.appDb.db.prepare('DELETE FROM chunk_embeddings').run();
    const result = await this.indexMissingEmbeddings(batchSize);
    return { indexed: result.indexed };
  }
}
