import { config } from './config.js';
import { AppDatabase } from './db/database.js';
import { IngestService } from './ingest/ingestService.js';
import { createEmbeddingProvider, EmbeddingService } from './retrieval/embeddings.js';
import { SearchService } from './retrieval/searchService.js';

export interface AppServices {
  db: AppDatabase;
  ingestService: IngestService;
  embeddingService: EmbeddingService;
  searchService: SearchService;
}

export const createServices = (): AppServices => {
  const db = new AppDatabase(config.dbPath);
  const embeddingProvider = createEmbeddingProvider(config);
  const embeddingService = new EmbeddingService(db, embeddingProvider);
  const ingestService = new IngestService(db);
  const searchService = new SearchService(db, embeddingService);

  return {
    db,
    ingestService,
    embeddingService,
    searchService,
  };
};
