import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createServices } from './bootstrap.js';
import { config } from './config.js';
import type { SearchFilters } from './types.js';

const services = createServices();

const server = new McpServer({
  name: 'claude-conversation-search',
  version: '0.1.0',
});

const filtersSchema = {
  conversationId: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system', 'tool', 'unknown']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
};

const toFilters = (input: {
  conversationId?: string;
  role?: SearchFilters['role'];
  dateFrom?: string;
  dateTo?: string;
}): SearchFilters => ({
  conversationId: input.conversationId,
  role: input.role,
  dateFrom: input.dateFrom,
  dateTo: input.dateTo,
});

const asTextResult = (payload: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify(payload, null, 2),
    },
  ],
});

server.tool('health', 'Health and configuration status', {}, async () => {
  const provider = services.embeddingService.getProviderInfo();
  const stats = services.db.getOverviewStats();

  return asTextResult({
    status: 'ok',
    dbPath: config.dbPath,
    embedding: provider,
    stats,
    timestamp: new Date().toISOString(),
  });
});

server.tool(
  'ingest_export',
  'Import a Claude export JSON file into the local search index',
  {
    filePath: z.string().min(1),
    sourceLabel: z.string().optional(),
  },
  async ({ filePath, sourceLabel }) => {
    const result = await services.ingestService.ingestExport(filePath, sourceLabel || 'mcp-ingest');
    const embedResult = await services.embeddingService.indexMissingEmbeddings();

    return asTextResult({
      ingest: result,
      embeddings: embedResult,
    });
  },
);

server.tool(
  'reindex',
  'Rebuild FTS and embeddings for all stored chunks',
  {
    force: z.boolean().optional(),
  },
  async ({ force }) => {
    const ftsCount = services.db.rebuildFtsIndex();
    const embeddings = force
      ? await services.embeddingService.reindexAllEmbeddings()
      : await services.embeddingService.indexMissingEmbeddings();

    return asTextResult({
      ftsRows: ftsCount,
      embeddings,
      timestamp: new Date().toISOString(),
    });
  },
);

server.tool(
  'search_messages',
  'Fast lexical full-text search over indexed chat chunks',
  {
    query: z.string().min(1),
    topK: z.number().int().positive().max(config.maxTopK).optional(),
    ...filtersSchema,
  },
  async ({ query, topK, ...filters }) => {
    const hits = services.searchService.searchLexical(query, toFilters(filters), topK || config.defaultTopK);
    return asTextResult({
      mode: 'lexical',
      query,
      count: hits.length,
      hits,
    });
  },
);

server.tool(
  'search_hybrid',
  'Hybrid search (lexical + semantic + fusion) for high-precision retrieval',
  {
    query: z.string().min(1),
    topK: z.number().int().positive().max(config.maxTopK).optional(),
    ...filtersSchema,
  },
  async ({ query, topK, ...filters }) => {
    const hits = await services.searchService.searchHybrid(
      query,
      toFilters(filters),
      topK || config.defaultTopK,
    );

    return asTextResult({
      mode: 'hybrid',
      query,
      count: hits.length,
      hits,
    });
  },
);

server.tool(
  'get_conversation',
  'Load a full conversation with all normalized messages',
  {
    conversationId: z.string().min(1),
  },
  async ({ conversationId }) => {
    const conversation = services.searchService.getConversation(conversationId);
    if (!conversation) {
      return asTextResult({
        found: false,
        message: `Conversation ${conversationId} not found`,
      });
    }

    return asTextResult({
      found: true,
      conversation,
    });
  },
);

server.tool(
  'get_message_context',
  'Return neighboring messages around a specific message id',
  {
    messageId: z.string().min(1),
    before: z.number().int().min(0).max(20).optional(),
    after: z.number().int().min(0).max(20).optional(),
  },
  async ({ messageId, before, after }) => {
    const context = services.searchService.getMessageContext(messageId, before ?? 2, after ?? 2);
    if (!context) {
      return asTextResult({
        found: false,
        message: `Message ${messageId} not found`,
      });
    }

    return asTextResult({
      found: true,
      context,
    });
  },
);

server.tool(
  'answer_with_citations',
  'Retrieve relevant evidence and return an extractive answer with citations',
  {
    question: z.string().min(1),
    maxCitations: z.number().int().min(1).max(20).optional(),
    ...filtersSchema,
  },
  async ({ question, maxCitations, ...filters }) => {
    const result = await services.searchService.answerWithCitations(
      question,
      toFilters(filters),
      maxCitations ?? 5,
    );

    return asTextResult(result);
  },
);

server.tool('stats_overview', 'Return global index and import statistics', {}, async () => {
  return asTextResult(services.db.getOverviewStats());
});

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('[mcp] claude-conversation-search started on stdio transport');

const shutdown = () => {
  try {
    services.db.close();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
