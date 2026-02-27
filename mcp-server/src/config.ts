import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const guessedRoot = path.resolve(__dirname, '..');
const projectRoot =
  path.basename(guessedRoot) === 'dist' ? path.resolve(guessedRoot, '..') : guessedRoot;

dotenv.config({ path: path.resolve(projectRoot, '.env') });

export interface AppConfig {
  dbPath: string;
  embeddingProvider: 'hash' | 'openai';
  openAiApiKey?: string;
  openAiEmbeddingModel: string;
  defaultTopK: number;
  maxTopK: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const config: AppConfig = {
  dbPath: process.env.MCP_DB_PATH || path.resolve(projectRoot, 'data', 'conversations.db'),
  embeddingProvider:
    process.env.MCP_EMBEDDING_PROVIDER === 'openai' || process.env.OPENAI_API_KEY
      ? 'openai'
      : 'hash',
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiEmbeddingModel: process.env.MCP_OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  defaultTopK: Number(process.env.MCP_DEFAULT_TOP_K || 10),
  maxTopK: Number(process.env.MCP_MAX_TOP_K || 50),
  logLevel: (process.env.MCP_LOG_LEVEL as AppConfig['logLevel']) || 'info',
};

export const nowIso = () => new Date().toISOString();

export const resolveFromCwd = (maybeRelative: string): string => {
  if (path.isAbsolute(maybeRelative)) {
    return maybeRelative;
  }
  return path.resolve(process.cwd(), maybeRelative);
};
