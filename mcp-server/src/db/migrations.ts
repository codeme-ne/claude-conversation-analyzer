export interface Migration {
  id: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    id: '001_init_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS imports (
        id TEXT PRIMARY KEY,
        source_label TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        completed_at TEXT,
        raw_conversations INTEGER NOT NULL DEFAULT 0,
        parsed_conversations INTEGER NOT NULL DEFAULT 0,
        parsed_messages INTEGER NOT NULL DEFAULT 0,
        parsed_chunks INTEGER NOT NULL DEFAULT 0,
        skipped_messages INTEGER NOT NULL DEFAULT 0,
        error_text TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_imports_file_hash ON imports(file_hash);
      CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        source_import_id TEXT NOT NULL,
        FOREIGN KEY(source_import_id) REFERENCES imports(id)
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        sender TEXT NOT NULL,
        created_at TEXT NOT NULL,
        position INTEGER NOT NULL,
        content TEXT NOT NULL,
        source_import_id TEXT NOT NULL,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id),
        FOREIGN KEY(source_import_id) REFERENCES imports(id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_conversation_position ON messages(conversation_id, position);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        source_import_id TEXT NOT NULL,
        metadata_json TEXT,
        UNIQUE(message_id, chunk_index),
        FOREIGN KEY(conversation_id) REFERENCES conversations(id),
        FOREIGN KEY(message_id) REFERENCES messages(id),
        FOREIGN KEY(source_import_id) REFERENCES imports(id)
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_conversation_id ON chunks(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_message_id ON chunks(message_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_created_at ON chunks(created_at);
      CREATE INDEX IF NOT EXISTS idx_chunks_role ON chunks(role);

      CREATE TABLE IF NOT EXISTS chunk_embeddings (
        chunk_id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        vector_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(chunk_id) REFERENCES chunks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_model ON chunk_embeddings(model);

      CREATE TABLE IF NOT EXISTS search_logs (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        mode TEXT NOT NULL,
        top_k INTEGER NOT NULL,
        filters_json TEXT,
        latency_ms INTEGER NOT NULL,
        result_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);

      CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(
        chunk_id UNINDEXED,
        conversation_id UNINDEXED,
        message_id UNINDEXED,
        role UNINDEXED,
        created_at UNINDEXED,
        content,
        tokenize='unicode61 remove_diacritics 2'
      );
    `,
  },
];
