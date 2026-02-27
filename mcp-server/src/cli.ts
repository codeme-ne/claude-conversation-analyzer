import fs from 'node:fs/promises';
import path from 'node:path';
import { createServices } from './bootstrap.js';
import { resolveFromCwd } from './config.js';
import type { SearchFilters } from './types.js';

interface EvalQuery {
  query: string;
  expectedAnyOf: string[];
  filters?: SearchFilters;
}

const parseFlags = (args: string[]) => {
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const next = args[i + 1];

    if (!next || next.startsWith('--')) {
      flags.set(key, true);
      continue;
    }

    flags.set(key, next);
    i += 1;
  }

  return flags;
};

const parseBooleanFlag = (value: string | boolean | undefined): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
  return false;
};

const printUsage = () => {
  console.log(`
Usage:
  tsx src/cli.ts ingest --file <path> [--source <label>]
  tsx src/cli.ts reindex [--force]
  tsx src/cli.ts stats
  tsx src/cli.ts eval [--queries <path>]
  `);
};

const runEval = async (queriesFile: string | undefined) => {
  const services = createServices();

  try {
    const filePath = resolveFromCwd(queriesFile || 'eval/queries.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const queries = JSON.parse(raw) as EvalQuery[];

    let hits = 0;
    let reciprocalRankSum = 0;

    const details = [] as Array<{
      query: string;
      hit: boolean;
      firstRelevantRank: number | null;
    }>;

    for (const testCase of queries) {
      const results = await services.searchService.searchHybrid(
        testCase.query,
        testCase.filters || {},
        10,
      );

      const normalizedExpected = testCase.expectedAnyOf.map((text) => text.toLowerCase());

      let firstRelevantRank: number | null = null;
      for (const result of results) {
        const haystack = `${result.content}\n${result.snippet}\n${result.conversationTitle}`.toLowerCase();
        const relevant = normalizedExpected.some((needle) => haystack.includes(needle));
        if (relevant) {
          firstRelevantRank = result.rank;
          break;
        }
      }

      const hit = firstRelevantRank !== null;
      if (firstRelevantRank !== null) {
        hits += 1;
        reciprocalRankSum += 1 / firstRelevantRank;
      }

      details.push({
        query: testCase.query,
        hit,
        firstRelevantRank,
      });
    }

    const total = queries.length || 1;
    const metrics = {
      queryCount: queries.length,
      hitRateAt10: hits / total,
      mrrAt10: reciprocalRankSum / total,
    };

    console.log(JSON.stringify({ metrics, details }, null, 2));
  } finally {
    services.db.close();
  }
};

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exit(1);
  }

  const flags = parseFlags(rest);

  if (command === 'eval') {
    await runEval(flags.get('queries') as string | undefined);
    return;
  }

  const services = createServices();

  try {
    if (command === 'ingest') {
      const fileFlag = flags.get('file');
      if (typeof fileFlag !== 'string') {
        throw new Error('Missing --file for ingest command');
      }

      const source = typeof flags.get('source') === 'string' ? String(flags.get('source')) : 'cli';
      const result = await services.ingestService.ingestExport(resolveFromCwd(fileFlag), source);
      const embeddings = await services.embeddingService.indexMissingEmbeddings();

      console.log(JSON.stringify({ ingest: result, embeddings }, null, 2));
      return;
    }

    if (command === 'reindex') {
      const force = parseBooleanFlag(flags.get('force'));
      const ftsRows = services.db.rebuildFtsIndex();
      const embeddings = force
        ? await services.embeddingService.reindexAllEmbeddings()
        : await services.embeddingService.indexMissingEmbeddings();

      console.log(JSON.stringify({ ftsRows, embeddings }, null, 2));
      return;
    }

    if (command === 'stats') {
      console.log(JSON.stringify(services.db.getOverviewStats(), null, 2));
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    services.db.close();
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
