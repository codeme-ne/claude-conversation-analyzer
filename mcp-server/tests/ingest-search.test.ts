import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../src/db/database.js';
import { IngestService } from '../src/ingest/ingestService.js';
import { EmbeddingService, createEmbeddingProvider } from '../src/retrieval/embeddings.js';
import { SearchService } from '../src/retrieval/searchService.js';
import type { AppConfig } from '../src/config.js';

describe('ingest + search', () => {
  it('ingests exports and returns relevant hybrid search hits', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-ingest-test-'));
    const dbPath = path.join(tempDir, 'test.db');
    const exportPath = path.join(tempDir, 'conversations.json');

    const sample = [
      {
        uuid: 'conv-1',
        name: 'Skincare Research',
        created_at: '2026-02-01T10:00:00.000Z',
        updated_at: '2026-02-01T10:10:00.000Z',
        chat_messages: [
          {
            uuid: 'm1',
            sender: 'human',
            created_at: '2026-02-01T10:00:00.000Z',
            content: [{ type: 'text', text: 'Welche evidenzbasierten Interventionen helfen gegen Akne?' }],
          },
          {
            uuid: 'm2',
            sender: 'assistant',
            created_at: '2026-02-01T10:01:00.000Z',
            content: [
              {
                type: 'text',
                text: 'Adapalen und Benzoylperoxid sind laut Leitlinien starke Optionen gegen Akne.',
              },
            ],
          },
        ],
      },
      {
        uuid: 'conv-2',
        name: 'Random Topic',
        created_at: '2026-02-02T10:00:00.000Z',
        updated_at: '2026-02-02T10:10:00.000Z',
        chat_messages: [
          {
            uuid: 'm3',
            sender: 'human',
            created_at: '2026-02-02T10:00:00.000Z',
            content: [{ type: 'text', text: 'Wie installiere ich Docker?' }],
          },
        ],
      },
    ];

    await fs.writeFile(exportPath, JSON.stringify(sample), 'utf8');

    const db = new AppDatabase(dbPath);
    const ingestService = new IngestService(db);
    const providerConfig: AppConfig = {
      dbPath,
      embeddingProvider: 'hash',
      openAiEmbeddingModel: 'text-embedding-3-small',
      defaultTopK: 10,
      maxTopK: 50,
      logLevel: 'info',
    };

    const embeddingService = new EmbeddingService(db, createEmbeddingProvider(providerConfig));
    const searchService = new SearchService(db, embeddingService);

    try {
      const ingestResult = await ingestService.ingestExport(exportPath, 'test');
      expect(ingestResult.skippedAsDuplicate).toBe(false);
      expect(ingestResult.conversations).toBe(2);
      expect(ingestResult.messages).toBe(3);

      await embeddingService.indexMissingEmbeddings();

      const hits = await searchService.searchHybrid('Was hilft gegen Akne langfristig?', {}, 5);

      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].conversationTitle).toContain('Skincare');
      expect(hits[0].content.toLowerCase()).toContain('akne');
    } finally {
      db.close();
    }
  });
});
