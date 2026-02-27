export type NormalizedRole = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';

export interface NormalizedMessage {
  id: string;
  conversationId: string;
  role: NormalizedRole;
  sender: string;
  createdAt: string;
  position: number;
  content: string;
}

export interface NormalizedConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: NormalizedMessage[];
}

export interface ParsedExport {
  conversations: NormalizedConversation[];
  stats: {
    rawConversationCount: number;
    parsedConversationCount: number;
    parsedMessageCount: number;
    skippedMessageCount: number;
  };
}

export interface SearchFilters {
  conversationId?: string;
  role?: NormalizedRole;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchHit {
  chunkId: string;
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  role: NormalizedRole;
  createdAt: string;
  snippet: string;
  content: string;
  score: number;
  rank: number;
  source: 'lexical' | 'semantic' | 'hybrid';
}

export interface IngestResult {
  importId: string;
  sourceLabel: string;
  filePath: string;
  fileHash: string;
  skippedAsDuplicate: boolean;
  conversations: number;
  messages: number;
  chunks: number;
  durationMs: number;
}

export interface Citation {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  chunkId: string;
  role: NormalizedRole;
  createdAt: string;
  snippet: string;
  score: number;
}
