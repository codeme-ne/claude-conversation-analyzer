import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { AppDatabase } from '../db/database.js';
import type { Citation, SearchFilters, SearchHit } from '../types.js';
import { nowIso } from '../config.js';
import { buildSnippet, cleanDisplayText, toFtsQuery } from '../utils/text.js';
import { cosineSimilarity, reciprocalRankFusion } from './ranking.js';
import type { EmbeddingService } from './embeddings.js';

const clampTopK = (topK: number, min = 1, max = 100): number => {
  if (!Number.isFinite(topK)) return min;
  return Math.max(min, Math.min(max, Math.floor(topK)));
};

const buildFilterSql = (filters: SearchFilters, params: Array<string>): string => {
  const clauses: string[] = [];

  if (filters.conversationId) {
    clauses.push('c.conversation_id = ?');
    params.push(filters.conversationId);
  }

  if (filters.role) {
    clauses.push('c.role = ?');
    params.push(filters.role);
  }

  if (filters.dateFrom) {
    clauses.push('c.created_at >= ?');
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    clauses.push('c.created_at <= ?');
    params.push(filters.dateTo);
  }

  if (clauses.length === 0) return '';
  return ` AND ${clauses.join(' AND ')}`;
};

interface ChunkRow {
  chunk_id: string;
  conversation_id: string;
  conversation_title: string;
  message_id: string;
  role: string;
  created_at: string;
  content: string;
}

const toHit = (
  row: ChunkRow,
  query: string,
  score: number,
  rank: number,
  source: SearchHit['source'],
): SearchHit => {
  return {
    chunkId: row.chunk_id,
    conversationId: row.conversation_id,
    conversationTitle: row.conversation_title,
    messageId: row.message_id,
    role: (row.role || 'unknown') as SearchHit['role'],
    createdAt: row.created_at,
    snippet: buildSnippet(row.content, query),
    content: row.content,
    score,
    rank,
    source,
  };
};

export class SearchService {
  constructor(
    private readonly appDb: AppDatabase,
    private readonly embeddingService: EmbeddingService,
  ) {}

  private logSearch(
    mode: 'lexical' | 'semantic' | 'hybrid',
    query: string,
    topK: number,
    filters: SearchFilters,
    latencyMs: number,
    resultCount: number,
  ) {
    this.appDb.db
      .prepare(
        `
          INSERT INTO search_logs (id, query, mode, top_k, filters_json, latency_ms, result_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        randomUUID(),
        query,
        mode,
        topK,
        JSON.stringify(filters),
        Math.round(latencyMs),
        resultCount,
        nowIso(),
      );
  }

  searchLexical(query: string, filters: SearchFilters = {}, topK = 10): SearchHit[] {
    const started = performance.now();
    const finalTopK = clampTopK(topK, 1, 100);
    const ftsQuery = toFtsQuery(query);

    if (!ftsQuery) return [];

    const params: string[] = [ftsQuery];
    const filterSql = buildFilterSql(filters, params);

    const sql = `
      SELECT
        chunk_fts.chunk_id AS chunk_id,
        c.conversation_id AS conversation_id,
        conv.title AS conversation_title,
        c.message_id AS message_id,
        c.role AS role,
        c.created_at AS created_at,
        c.content AS content,
        bm25(chunk_fts) AS bm25_score
      FROM chunk_fts
      JOIN chunks c ON c.id = chunk_fts.chunk_id
      JOIN conversations conv ON conv.id = c.conversation_id
      WHERE chunk_fts MATCH ?
      ${filterSql}
      ORDER BY bm25_score
      LIMIT ?
    `;

    const rows = this.appDb.db.prepare(sql).all(...params, finalTopK) as Array<
      ChunkRow & { bm25_score: number }
    >;

    const hits = rows.map((row, index) => {
      const score = 1 / (1 + index);
      return toHit(row, query, score, index + 1, 'lexical');
    });

    this.logSearch('lexical', query, finalTopK, filters, performance.now() - started, hits.length);

    return hits;
  }

  async searchSemantic(query: string, filters: SearchFilters = {}, topK = 10): Promise<SearchHit[]> {
    const started = performance.now();
    const finalTopK = clampTopK(topK, 1, 100);

    const embeddingCount = this.appDb.db
      .prepare('SELECT COUNT(*) AS n FROM chunk_embeddings')
      .get() as { n: number };
    if (embeddingCount.n === 0) {
      await this.embeddingService.indexMissingEmbeddings();
    }

    const queryVector = await this.embeddingService.embedQuery(query);
    if (queryVector.length === 0) return [];

    const params: string[] = [];
    const filterSql = buildFilterSql(filters, params).replaceAll('c.', 'chunks.');

    const candidateLimit = Math.max(finalTopK * 60, 300);

    const candidates = this.appDb.db
      .prepare(
        `
          SELECT
            ce.chunk_id AS chunk_id,
            ce.vector_json AS vector_json,
            chunks.conversation_id AS conversation_id,
            conv.title AS conversation_title,
            chunks.message_id AS message_id,
            chunks.role AS role,
            chunks.created_at AS created_at,
            chunks.content AS content
          FROM chunk_embeddings ce
          JOIN chunks ON chunks.id = ce.chunk_id
          JOIN conversations conv ON conv.id = chunks.conversation_id
          WHERE 1 = 1
          ${filterSql}
          LIMIT ?
        `,
      )
      .all(...params, candidateLimit) as Array<ChunkRow & { vector_json: string }>;

    const scored = candidates
      .map((row) => {
        let vector: number[] = [];
        try {
          vector = JSON.parse(row.vector_json) as number[];
        } catch {
          vector = [];
        }

        const semanticScore = cosineSimilarity(queryVector, vector);
        return {
          row,
          semanticScore,
        };
      })
      .filter((entry) => entry.semanticScore > 0)
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .slice(0, finalTopK);

    const hits = scored.map((entry, index) =>
      toHit(entry.row, query, entry.semanticScore, index + 1, 'semantic'),
    );

    this.logSearch('semantic', query, finalTopK, filters, performance.now() - started, hits.length);

    return hits;
  }

  async searchHybrid(query: string, filters: SearchFilters = {}, topK = 10): Promise<SearchHit[]> {
    const started = performance.now();
    const finalTopK = clampTopK(topK, 1, 100);

    const lexical = this.searchLexical(query, filters, finalTopK * 4);
    const semantic = await this.searchSemantic(query, filters, finalTopK * 4);

    const lexicalRanks = lexical.map((hit, index) => ({ id: hit.chunkId, score: 1 / (index + 1) }));
    const semanticRanks = semantic.map((hit, index) => ({ id: hit.chunkId, score: 1 / (index + 1) }));

    const fused = reciprocalRankFusion([lexicalRanks, semanticRanks], 60);

    const byChunkId = new Map<string, SearchHit>();
    lexical.forEach((hit) => byChunkId.set(hit.chunkId, hit));
    semantic.forEach((hit) => {
      const existing = byChunkId.get(hit.chunkId);
      if (!existing || hit.score > existing.score) {
        byChunkId.set(hit.chunkId, hit);
      }
    });

    const normalizedQuery = cleanDisplayText(query).toLowerCase();

    const mergedHits: SearchHit[] = [];
    for (const entry of fused) {
      const base = byChunkId.get(entry.id);
      if (!base) continue;

      let score = entry.score;
      if (normalizedQuery && base.content.toLowerCase().includes(normalizedQuery)) {
        score += 0.03;
      }

      mergedHits.push({
        ...base,
        score,
        source: 'hybrid',
        rank: mergedHits.length + 1,
      });
    }

    const hits = mergedHits
      .sort((a, b) => b.score - a.score)
      .slice(0, finalTopK)
      .map((hit, index) => ({ ...hit, rank: index + 1, source: 'hybrid' as const }));

    this.logSearch('hybrid', query, finalTopK, filters, performance.now() - started, hits.length);

    return hits;
  }

  getConversation(conversationId: string) {
    const conversation = this.appDb.db
      .prepare(
        `
          SELECT id, title, created_at, updated_at
          FROM conversations
          WHERE id = ?
        `,
      )
      .get(conversationId);

    if (!conversation) return null;

    const messages = this.appDb.db
      .prepare(
        `
          SELECT id, role, sender, created_at, position, content
          FROM messages
          WHERE conversation_id = ?
          ORDER BY position ASC
        `,
      )
      .all(conversationId);

    return {
      ...conversation,
      messages,
    };
  }

  getMessageContext(messageId: string, before = 2, after = 2) {
    const base = this.appDb.db
      .prepare(
        `
          SELECT id, conversation_id, role, sender, created_at, position, content
          FROM messages
          WHERE id = ?
        `,
      )
      .get(messageId) as
      | {
          id: string;
          conversation_id: string;
          role: string;
          sender: string;
          created_at: string;
          position: number;
          content: string;
        }
      | undefined;

    if (!base) return null;

    const startPos = Math.max(0, base.position - Math.max(0, before));
    const endPos = base.position + Math.max(0, after);

    const contextMessages = this.appDb.db
      .prepare(
        `
          SELECT id, role, sender, created_at, position, content
          FROM messages
          WHERE conversation_id = ?
            AND position BETWEEN ? AND ?
          ORDER BY position ASC
        `,
      )
      .all(base.conversation_id, startPos, endPos);

    const conversation = this.appDb.db
      .prepare('SELECT id, title FROM conversations WHERE id = ?')
      .get(base.conversation_id);

    return {
      conversation,
      focusMessageId: base.id,
      messages: contextMessages,
    };
  }

  async answerWithCitations(
    question: string,
    filters: SearchFilters = {},
    maxCitations = 5,
  ): Promise<{ answer: string; citations: Citation[] }> {
    const hits = await this.searchHybrid(question, filters, Math.max(maxCitations * 2, 8));

    if (hits.length === 0) {
      return {
        answer: 'Keine passenden Belege gefunden. Versuche eine präzisere Frage oder lockerere Filter.',
        citations: [],
      };
    }

    const citations = hits.slice(0, maxCitations).map((hit) => ({
      conversationId: hit.conversationId,
      conversationTitle: hit.conversationTitle,
      messageId: hit.messageId,
      chunkId: hit.chunkId,
      role: hit.role,
      createdAt: hit.createdAt,
      snippet: hit.snippet,
      score: hit.score,
    }));

    const topThemes = citations
      .slice(0, 3)
      .map((citation, index) => {
        const prefix = `${index + 1}. [${citation.conversationTitle}] (${citation.createdAt})`;
        return `${prefix}\n${citation.snippet}`;
      })
      .join('\n\n');

    const answer = [
      'Ich habe die relevantesten Stellen aus deinem Chat-Archiv gefunden.',
      '',
      topThemes,
      '',
      'Nutze die Zitate für Follow-up-Fragen oder bitte um detaillierte Zusammenfassung zu einem einzelnen Treffer.',
    ].join('\n');

    return {
      answer,
      citations,
    };
  }
}
