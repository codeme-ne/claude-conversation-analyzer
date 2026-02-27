# Claude Conversation MCP Server

MCP server for fast and precise search over exported Claude conversations.

## What you get

- Robust ingestion for modern Claude exports (`chat_messages`, mixed content blocks)
- Noise filtering for internal blocks (`thinking`, `tool_use`, `tool_result`, `token_budget`, `knowledge`)
- SQLite storage with FTS5 lexical index
- Embedding index (default: local hash embedding, optional: OpenAI embeddings)
- Hybrid retrieval (lexical + semantic + reciprocal rank fusion)
- Citation-oriented outputs for LLM workflows
- MCP tools for ingest, retrieval, context expansion and stats

## Architecture

```text
conversations.json
  -> parser + normalization
  -> SQLite tables (conversations/messages/chunks)
  -> FTS5 index (chunk_fts)
  -> embeddings (chunk_embeddings)
  -> MCP tools (search_hybrid, answer_with_citations, ...)
```

## Folder structure

```text
mcp-server/
  src/
    server.ts                # MCP stdio server + tool registration
    cli.ts                   # ingest/reindex/stats/eval CLI
    db/                      # migrations + database wrapper
    ingest/                  # parser + chunking + ingest service
    retrieval/               # embeddings + ranking + search service
    utils/                   # text normalization + hashing helpers
  tests/                     # parser + ingest/search tests
  eval/queries.json          # sample retrieval benchmark queries
```

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
cd mcp-server
npm install
```

## Build and test

```bash
npm run typecheck
npm test
npm run build
```

## Ingest data

```bash
npm run mcp:ingest -- --file ../data/conversations.json --source repo-data
```

## Reindex

```bash
npm run mcp:reindex
# full embedding rebuild
npm run mcp:reindex -- --force
```

## Stats and retrieval eval

```bash
npm run mcp:stats
npm run mcp:eval
```

## Run MCP server (stdio)

```bash
# dev (tsx)
npm run mcp:start

# production-like (compiled)
npm run build
node dist/src/server.js
```

## MCP tools

- `health`
- `stats_overview`
- `ingest_export(filePath, sourceLabel?)`
- `reindex(force?)`
- `search_messages(query, topK?, filters...)`
- `search_hybrid(query, topK?, filters...)`
- `get_conversation(conversationId)`
- `get_message_context(messageId, before?, after?)`
- `answer_with_citations(question, maxCitations?, filters...)`

Supported filter fields:

- `conversationId`
- `role` (`user`, `assistant`, `system`, `tool`, `unknown`)
- `dateFrom` (ISO datetime)
- `dateTo` (ISO datetime)

## Environment variables

Create `mcp-server/.env` when needed.

```bash
MCP_DB_PATH=/abs/path/to/mcp-server/data/conversations.db
MCP_EMBEDDING_PROVIDER=hash
MCP_DEFAULT_TOP_K=10
MCP_MAX_TOP_K=50
MCP_LOG_LEVEL=info

# Optional OpenAI embeddings
OPENAI_API_KEY=...
MCP_EMBEDDING_PROVIDER=openai
MCP_OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Notes:

- Default embedding mode is local `hash` (no external API needed).
- If `OPENAI_API_KEY` is present, provider defaults to `openai` unless overridden.

## Example MCP client config

Use the compiled server in your MCP client config.

```json
{
  "mcpServers": {
    "claude-conversation-search": {
      "command": "node",
      "args": [
        "/home/lukaszangerl/Dokumente/01 Projects/github-public/claude-conversation-analyzer/mcp-server/dist/src/server.js"
      ]
    }
  }
}
```

## Operational notes

- Database file is local-only (`mcp-server/data/conversations.db`) and git-ignored.
- Re-ingesting the same file hash is deduplicated automatically.
- On re-import, conversations are replaced by conversation id to keep indexes consistent.
