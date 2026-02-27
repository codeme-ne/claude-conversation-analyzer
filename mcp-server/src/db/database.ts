import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrations } from './migrations.js';
import { nowIso } from '../config.js';

export class AppDatabase {
  public readonly db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.applyMigrations();
  }

  private applyMigrations() {
    const begin = this.db.prepare('BEGIN');
    const commit = this.db.prepare('COMMIT');
    const rollback = this.db.prepare('ROLLBACK');

    begin.run();
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        );
      `);

      const migrationRows = this.db
        .prepare('SELECT id FROM schema_migrations')
        .all() as Array<{ id: string }>;
      const seen = new Set<string>(migrationRows.map((row) => row.id));

      for (const migration of migrations) {
        if (seen.has(migration.id)) continue;
        this.db.exec(migration.sql);
        this.db
          .prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')
          .run(migration.id, nowIso());
      }

      commit.run();
    } catch (error) {
      rollback.run();
      throw error;
    }
  }

  transaction<T>(work: () => T): T {
    const wrapped = this.db.transaction(work);
    return wrapped();
  }

  close() {
    this.db.close();
  }

  rebuildFtsIndex(): number {
    const rows = this.db
      .prepare(
        `
          SELECT id, conversation_id, message_id, role, created_at, content
          FROM chunks
        `,
      )
      .all() as Array<{
      id: string;
      conversation_id: string;
      message_id: string;
      role: string;
      created_at: string;
      content: string;
    }>;

    this.transaction(() => {
      this.db.prepare('DELETE FROM chunk_fts').run();
      const insert = this.db.prepare(
        `
          INSERT INTO chunk_fts (chunk_id, conversation_id, message_id, role, created_at, content)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      );

      for (const row of rows) {
        insert.run(
          row.id,
          row.conversation_id,
          row.message_id,
          row.role,
          row.created_at,
          row.content,
        );
      }
    });

    return rows.length;
  }

  getOverviewStats() {
    const conversationCount = this.db.prepare('SELECT COUNT(*) AS n FROM conversations').get() as {
      n: number;
    };
    const messageCount = this.db.prepare('SELECT COUNT(*) AS n FROM messages').get() as { n: number };
    const chunkCount = this.db.prepare('SELECT COUNT(*) AS n FROM chunks').get() as { n: number };
    const embeddingCount = this.db.prepare('SELECT COUNT(*) AS n FROM chunk_embeddings').get() as {
      n: number;
    };
    const latestImport = this.db
      .prepare(
        `
          SELECT id, source_label, file_path, status, imported_at, completed_at,
                 parsed_conversations, parsed_messages, parsed_chunks
          FROM imports
          ORDER BY imported_at DESC
          LIMIT 1
        `,
      )
      .get();

    return {
      conversations: conversationCount.n,
      messages: messageCount.n,
      chunks: chunkCount.n,
      embeddings: embeddingCount.n,
      latestImport,
    };
  }
}
