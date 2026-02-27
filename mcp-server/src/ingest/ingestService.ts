import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { AppDatabase } from '../db/database.js';
import { nowIso } from '../config.js';
import { chunkText } from './chunking.js';
import { parseConversationsFile } from './parser.js';
import { sha256File } from '../utils/hash.js';
import type { IngestResult } from '../types.js';

export class IngestService {
  constructor(private readonly appDb: AppDatabase) {}

  async ingestExport(filePath: string, sourceLabel = 'manual-upload'): Promise<IngestResult> {
    const startedAt = Date.now();
    const resolvedPath = path.resolve(filePath);
    const fileHash = await sha256File(resolvedPath);

    const existing = this.appDb.db
      .prepare(
        `
          SELECT id, parsed_conversations, parsed_messages, parsed_chunks, imported_at
          FROM imports
          WHERE file_hash = ? AND status = 'completed'
          ORDER BY imported_at DESC
          LIMIT 1
        `,
      )
      .get(fileHash) as
      | {
          id: string;
          parsed_conversations: number;
          parsed_messages: number;
          parsed_chunks: number;
          imported_at: string;
        }
      | undefined;

    if (existing) {
      return {
        importId: existing.id,
        sourceLabel,
        filePath: resolvedPath,
        fileHash,
        skippedAsDuplicate: true,
        conversations: existing.parsed_conversations,
        messages: existing.parsed_messages,
        chunks: existing.parsed_chunks,
        durationMs: Date.now() - startedAt,
      };
    }

    const importId = randomUUID();
    const importedAt = nowIso();

    this.appDb.db
      .prepare(
        `
          INSERT INTO imports (
            id, source_label, file_path, file_hash, status, imported_at,
            raw_conversations, parsed_conversations, parsed_messages, parsed_chunks, skipped_messages
          ) VALUES (?, ?, ?, ?, 'processing', ?, 0, 0, 0, 0, 0)
        `,
      )
      .run(importId, sourceLabel, resolvedPath, fileHash, importedAt);

    try {
      const parsed = await parseConversationsFile(resolvedPath);
      let chunkCount = 0;

      this.appDb.transaction(() => {
        const upsertConversation = this.appDb.db.prepare(
          `
            INSERT INTO conversations (id, title, created_at, updated_at, source_import_id)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at,
              source_import_id = excluded.source_import_id
          `,
        );

        const deleteChunkIdsByConversation = this.appDb.db.prepare(
          `SELECT id FROM chunks WHERE conversation_id = ?`,
        );
        const deleteChunkFts = this.appDb.db.prepare(`DELETE FROM chunk_fts WHERE chunk_id = ?`);
        const deleteChunkEmbeddings = this.appDb.db.prepare(
          `DELETE FROM chunk_embeddings WHERE chunk_id = ?`,
        );
        const deleteChunksByConversation = this.appDb.db.prepare(
          `DELETE FROM chunks WHERE conversation_id = ?`,
        );
        const deleteMessagesByConversation = this.appDb.db.prepare(
          `DELETE FROM messages WHERE conversation_id = ?`,
        );

        const insertMessage = this.appDb.db.prepare(
          `
            INSERT INTO messages (
              id, conversation_id, role, sender, created_at, position, content, source_import_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
        );

        const insertChunk = this.appDb.db.prepare(
          `
            INSERT INTO chunks (
              id, conversation_id, message_id, chunk_index, role, created_at,
              content, token_count, source_import_id, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        );

        const insertChunkFts = this.appDb.db.prepare(
          `
            INSERT INTO chunk_fts (
              chunk_id, conversation_id, message_id, role, created_at, content
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
        );

        for (const conversation of parsed.conversations) {
          upsertConversation.run(
            conversation.id,
            conversation.title,
            conversation.createdAt,
            conversation.updatedAt,
            importId,
          );

          const oldChunkRows = deleteChunkIdsByConversation.all(conversation.id) as Array<{ id: string }>;
          for (const row of oldChunkRows) {
            deleteChunkFts.run(row.id);
            deleteChunkEmbeddings.run(row.id);
          }
          deleteChunksByConversation.run(conversation.id);
          deleteMessagesByConversation.run(conversation.id);

          for (const message of conversation.messages) {
            insertMessage.run(
              message.id,
              conversation.id,
              message.role,
              message.sender,
              message.createdAt,
              message.position,
              message.content,
              importId,
            );

            const chunks = chunkText(message.content);
            for (const chunk of chunks) {
              const chunkId = `${message.id}::${chunk.chunkIndex}`;
              const metadataJson = JSON.stringify({
                conversationTitle: conversation.title,
                sourceLabel,
              });

              insertChunk.run(
                chunkId,
                conversation.id,
                message.id,
                chunk.chunkIndex,
                message.role,
                message.createdAt,
                chunk.content,
                chunk.tokenCount,
                importId,
                metadataJson,
              );

              insertChunkFts.run(
                chunkId,
                conversation.id,
                message.id,
                message.role,
                message.createdAt,
                chunk.content,
              );

              chunkCount += 1;
            }
          }
        }

        this.appDb.db
          .prepare(
            `
              UPDATE imports
              SET
                status = 'completed',
                completed_at = ?,
                raw_conversations = ?,
                parsed_conversations = ?,
                parsed_messages = ?,
                parsed_chunks = ?,
                skipped_messages = ?,
                error_text = NULL
              WHERE id = ?
            `,
          )
          .run(
            nowIso(),
            parsed.stats.rawConversationCount,
            parsed.stats.parsedConversationCount,
            parsed.stats.parsedMessageCount,
            chunkCount,
            parsed.stats.skippedMessageCount,
            importId,
          );
      });

      const importedStats = this.appDb.db
        .prepare(
          `\n            SELECT parsed_conversations, parsed_messages, parsed_chunks\n            FROM imports\n            WHERE id = ?\n          `,
        )
        .get(importId) as
        | {
            parsed_conversations: number;
            parsed_messages: number;
            parsed_chunks: number;
          }
        | undefined;

      return {
        importId,
        sourceLabel,
        filePath: resolvedPath,
        fileHash,
        skippedAsDuplicate: false,
        conversations: importedStats?.parsed_conversations ?? parsed.stats.parsedConversationCount,
        messages: importedStats?.parsed_messages ?? parsed.stats.parsedMessageCount,
        chunks: importedStats?.parsed_chunks ?? chunkCount,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const errorText = error instanceof Error ? error.stack || error.message : String(error);
      this.appDb.db
        .prepare(
          `
            UPDATE imports
            SET status = 'failed', completed_at = ?, error_text = ?
            WHERE id = ?
          `,
        )
        .run(nowIso(), errorText, importId);
      throw error;
    }
  }
}
