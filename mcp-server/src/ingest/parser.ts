import fs from 'node:fs/promises';
import type { NormalizedConversation, NormalizedMessage, ParsedExport } from '../types.js';
import { extractMessageText, normalizeRole } from '../utils/text.js';

const firstNonEmptyString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
};

const normalizeTimestamp = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value * 1000).toISOString();
  return fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const parseMessages = (
  conversationId: string,
  rawMessages: unknown[],
  fallbackTime: string,
  skippedCounter: { count: number },
): NormalizedMessage[] => {
  const messages: NormalizedMessage[] = [];

  rawMessages.forEach((raw, idx) => {
    const msg = toRecord(raw);
    const content = extractMessageText(msg);

    if (!content) {
      skippedCounter.count += 1;
      return;
    }

    const messageId =
      firstNonEmptyString(msg.id, msg.uuid, msg.message_id) || `${conversationId}::message::${idx}`;
    const sender = firstNonEmptyString(msg.sender, msg.role, toRecord(msg.author).role) || 'unknown';
    const role = normalizeRole(sender);
    const createdAt = normalizeTimestamp(
      firstNonEmptyString(msg.created_at, msg.timestamp, msg.create_time),
      fallbackTime,
    );

    messages.push({
      id: messageId,
      conversationId,
      role,
      sender,
      createdAt,
      position: messages.length,
      content,
    });
  });

  return messages;
};

const parseConversationItem = (
  rawConversation: unknown,
  index: number,
  skippedCounter: { count: number },
): NormalizedConversation | null => {
  const conv = toRecord(rawConversation);

  const now = new Date().toISOString();
  const id = firstNonEmptyString(conv.id, conv.uuid) || `conversation-${index}`;
  const title = firstNonEmptyString(conv.title, conv.name, conv.summary) || `Konversation ${index + 1}`;
  const createdAt = normalizeTimestamp(firstNonEmptyString(conv.created_at, conv.create_time), now);
  const updatedAt = normalizeTimestamp(firstNonEmptyString(conv.updated_at, conv.update_time), createdAt);

  const directMessages = Array.isArray(conv.messages)
    ? conv.messages
    : Array.isArray(conv.chat_messages)
      ? conv.chat_messages
      : Array.isArray(conv.conversation)
        ? conv.conversation
        : [];

  let rawMessages = [...directMessages];

  if (rawMessages.length === 0 && conv.mapping && typeof conv.mapping === 'object') {
    rawMessages = Object.values(conv.mapping as Record<string, unknown>)
      .map((entry) => {
        const record = toRecord(entry);
        return record.message;
      })
      .filter(Boolean);
  }

  const messages = parseMessages(id, rawMessages, createdAt, skippedCounter);

  if (messages.length === 0) return null;

  return {
    id,
    title,
    createdAt,
    updatedAt,
    messages,
  };
};

const extractRawConversations = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;

  const root = toRecord(data);

  if (Array.isArray(root.conversations)) return root.conversations;

  if (root.conversations && typeof root.conversations === 'object') {
    return Object.values(root.conversations as Record<string, unknown>);
  }

  if (Array.isArray(root.messages) || Array.isArray(root.chat_messages)) {
    return [root];
  }

  return [];
};

export const parseConversationsFile = async (filePath: string): Promise<ParsedExport> => {
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw) as unknown;

  const rawConversations = extractRawConversations(data);
  const skippedCounter = { count: 0 };

  const conversations = rawConversations
    .map((item, index) => parseConversationItem(item, index, skippedCounter))
    .filter((item): item is NormalizedConversation => !!item);

  const parsedMessageCount = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);

  return {
    conversations,
    stats: {
      rawConversationCount: rawConversations.length,
      parsedConversationCount: conversations.length,
      parsedMessageCount,
      skippedMessageCount: skippedCounter.count,
    },
  };
};
