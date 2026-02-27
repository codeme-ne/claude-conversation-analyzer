import type { NormalizedRole } from '../types.js';

const SKIPPED_CONTENT_TYPES = new Set(['thinking', 'tool_use', 'tool_result', 'token_budget', 'knowledge']);

export const normalizeRole = (value: unknown): NormalizedRole => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized === 'human' || normalized === 'user') return 'user';
  if (normalized === 'assistant' || normalized === 'claude' || normalized === 'model') return 'assistant';
  if (normalized === 'system') return 'system';
  if (normalized === 'tool') return 'tool';
  return 'unknown';
};

export const cleanDisplayText = (value: unknown): string => {
  return String(value || '')
    .replace(/\[object Object\](,\[object Object\])*/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/g, '')
    .trim();
};

const extractTextFromContentItem = (item: unknown): string => {
  if (!item || typeof item !== 'object') return '';

  const record = item as Record<string, unknown>;
  const type = typeof record.type === 'string' ? record.type : '';

  if (SKIPPED_CONTENT_TYPES.has(type)) return '';

  if (typeof record.text === 'string') return record.text;
  if (typeof record.content === 'string') return record.content;

  if (Array.isArray(record.content)) {
    return record.content
      .map(extractTextFromContentItem)
      .filter(Boolean)
      .join('\n');
  }

  if (record.content && typeof record.content === 'object') {
    const nested = record.content as Record<string, unknown>;
    if (typeof nested.text === 'string') return nested.text;
    if (typeof nested.content === 'string') return nested.content;
    if (Array.isArray(nested.content)) {
      return nested.content
        .map(extractTextFromContentItem)
        .filter(Boolean)
        .join('\n');
    }
  }

  return '';
};

export const extractMessageText = (message: unknown): string => {
  if (!message) return '';

  if (typeof message === 'string') return cleanDisplayText(message);
  if (typeof message !== 'object') return '';

  const record = message as Record<string, unknown>;

  if (Array.isArray(record.content)) {
    const contentText = record.content
      .map((item) => (typeof item === 'string' ? item : extractTextFromContentItem(item)))
      .filter(Boolean)
      .join('\n\n');

    if (contentText) return cleanDisplayText(contentText);
  }

  if (typeof record.content === 'string') return cleanDisplayText(record.content);
  if (record.content && typeof record.content === 'object') {
    const nested = record.content as Record<string, unknown>;
    if (typeof nested.text === 'string') return cleanDisplayText(nested.text);
    if (typeof nested.content === 'string') return cleanDisplayText(nested.content);
  }

  if (typeof record.text === 'string') return cleanDisplayText(record.text);

  if (record.mapping && typeof record.mapping === 'object') {
    const mapped = Object.values(record.mapping as Record<string, unknown>)
      .map((entry) => {
        if (entry && typeof entry === 'object' && 'message' in (entry as Record<string, unknown>)) {
          return extractMessageText((entry as Record<string, unknown>).message);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    if (mapped) return cleanDisplayText(mapped);
  }

  for (const prop of ['body', 'value', 'data', 'message_text', 'response']) {
    const value = record[prop];
    if (typeof value === 'string') {
      return cleanDisplayText(value);
    }
  }

  return '';
};

export const tokenizeForSearch = (input: string): string[] => {
  return cleanDisplayText(input)
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((token) => token.length > 1);
};

export const toFtsQuery = (query: string): string => {
  const tokens = tokenizeForSearch(query);
  if (tokens.length === 0) return '';

  return tokens.map((token) => `${token}*`).join(' AND ');
};

export const buildSnippet = (content: string, query: string, maxLen = 320): string => {
  const clean = cleanDisplayText(content);
  if (clean.length <= maxLen) return clean;

  const lower = clean.toLowerCase();
  const terms = tokenizeForSearch(query);

  let index = -1;
  for (const term of terms) {
    const matchIndex = lower.indexOf(term);
    if (matchIndex >= 0 && (index < 0 || matchIndex < index)) {
      index = matchIndex;
    }
  }

  if (index < 0) {
    return `${clean.slice(0, maxLen).trim()}...`;
  }

  const start = Math.max(0, index - Math.floor(maxLen * 0.3));
  const end = Math.min(clean.length, start + maxLen);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
};

export const estimateTokenCount = (text: string): number => {
  const words = cleanDisplayText(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.3));
};
