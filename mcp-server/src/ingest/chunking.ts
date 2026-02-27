import { cleanDisplayText, estimateTokenCount } from '../utils/text.js';

export interface ChunkedText {
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

export interface ChunkingOptions {
  maxChars: number;
  overlapChars: number;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChars: 1200,
  overlapChars: 180,
};

export const chunkText = (text: string, options: Partial<ChunkingOptions> = {}): ChunkedText[] => {
  const { maxChars, overlapChars } = { ...DEFAULT_OPTIONS, ...options };

  const clean = cleanDisplayText(text);
  if (!clean) return [];
  if (clean.length <= maxChars) {
    return [{ chunkIndex: 0, content: clean, tokenCount: estimateTokenCount(clean) }];
  }

  const chunks: ChunkedText[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < clean.length) {
    let end = Math.min(clean.length, start + maxChars);

    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const breakAt = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '), slice.lastIndexOf(' '));
      if (breakAt > Math.floor(maxChars * 0.6)) {
        end = start + breakAt + 1;
      }
    }

    const content = clean.slice(start, end).trim();
    if (content) {
      chunks.push({
        chunkIndex,
        content,
        tokenCount: estimateTokenCount(content),
      });
      chunkIndex += 1;
    }

    if (end >= clean.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
};
