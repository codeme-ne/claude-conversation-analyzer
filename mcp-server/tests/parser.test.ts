import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseConversationsFile } from '../src/ingest/parser.js';

describe('parseConversationsFile', () => {
  it('filters thinking and tool blocks and keeps readable text', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-parser-test-'));
    const exportPath = path.join(tempDir, 'conversations.json');

    const sample = [
      {
        uuid: 'conv-1',
        name: 'Test Conversation',
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:10:00.000Z',
        chat_messages: [
          {
            uuid: 'm1',
            sender: 'human',
            created_at: '2026-01-01T10:00:00.000Z',
            content: [{ type: 'text', text: 'Hallo, kannst du helfen?' }],
          },
          {
            uuid: 'm2',
            sender: 'assistant',
            created_at: '2026-01-01T10:00:05.000Z',
            content: [
              { type: 'thinking', thinking: 'internal chain of thought' },
              { type: 'tool_result', content: [{ type: 'knowledge', text: 'internal tool payload' }] },
              { type: 'text', text: 'Ja, ich kann helfen.' },
            ],
          },
        ],
      },
    ];

    await fs.writeFile(exportPath, JSON.stringify(sample), 'utf8');

    const parsed = await parseConversationsFile(exportPath);

    expect(parsed.conversations).toHaveLength(1);
    expect(parsed.conversations[0].messages).toHaveLength(2);
    expect(parsed.conversations[0].messages[0].content).toContain('Hallo');
    expect(parsed.conversations[0].messages[1].content).toContain('Ja, ich kann helfen');
    expect(parsed.conversations[0].messages[1].content).not.toContain('[object Object]');
    expect(parsed.conversations[0].messages[1].content).not.toContain('internal tool payload');
    expect(parsed.stats.skippedMessageCount).toBe(0);
  });
});
