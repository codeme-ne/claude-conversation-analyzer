import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface CheckResult {
  name: string;
  ok: boolean;
  details?: unknown;
}

const assertCheck = (results: CheckResult[], name: string, condition: boolean, details?: unknown) => {
  results.push({ name, ok: condition, details });
};

const parseTextPayload = (toolResult: any): any => {
  const first = toolResult?.content?.[0];
  const text = first?.text;
  if (typeof text !== 'string') {
    return null;
  }
  return JSON.parse(text);
};

const run = async () => {
  const projectRoot = path.resolve(process.cwd());
  const dataFile = path.resolve(projectRoot, '..', 'data', 'conversations.json');
  const impossibleQuery = 'qzzxvbnm_token_9f3e2a1c7d4b6k8m0p';

  const client = new Client({ name: 'mcp-smoke', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(projectRoot, 'dist', 'src', 'server.js')],
    cwd: projectRoot,
  });

  const checks: CheckResult[] = [];

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    assertCheck(
      checks,
      'tool registration',
      tools.tools.some((tool) => tool.name === 'search_hybrid') &&
        tools.tools.some((tool) => tool.name === 'ingest_export'),
      { toolCount: tools.tools.length },
    );

    const health = parseTextPayload(await client.callTool({ name: 'health', arguments: {} }));
    assertCheck(
      checks,
      'health status ok',
      health?.status === 'ok' && typeof health?.stats?.conversations === 'number',
      { status: health?.status, conversations: health?.stats?.conversations },
    );

    const normalSearch = parseTextPayload(
      await client.callTool({
        name: 'search_hybrid',
        arguments: { query: 'Akne Studien evidenzbasierte Interventionen', topK: 5 },
      }),
    );
    const firstSnippet = normalSearch?.hits?.[0]?.snippet || '';
    assertCheck(
      checks,
      'normal hybrid search',
      Number(normalSearch?.count) > 0 && !String(firstSnippet).includes('[object Object]'),
      { count: normalSearch?.count, topTitle: normalSearch?.hits?.[0]?.conversationTitle },
    );

    const weirdSearch = parseTextPayload(
      await client.callTool({
        name: 'search_hybrid',
        arguments: { query: '%%% äöü ß ### [x] (y) :: <<>>', topK: 5 },
      }),
    );
    assertCheck(checks, 'special-character query handled', typeof weirdSearch?.count === 'number', {
      count: weirdSearch?.count,
    });

    const noResult = parseTextPayload(
      await client.callTool({
        name: 'search_hybrid',
        arguments: { query: impossibleQuery, topK: 3 },
      }),
    );
    assertCheck(checks, 'no-result query', Number(noResult?.count) === 0, { count: noResult?.count });

    const invalidContext = parseTextPayload(
      await client.callTool({
        name: 'get_message_context',
        arguments: { messageId: 'non-existent-message-id', before: 2, after: 2 },
      }),
    );
    assertCheck(checks, 'invalid message context handled', invalidContext?.found === false, invalidContext);

    const duplicateIngest = parseTextPayload(
      await client.callTool({
        name: 'ingest_export',
        arguments: { filePath: dataFile, sourceLabel: 'smoke-duplicate-check' },
      }),
    );
    assertCheck(
      checks,
      'duplicate ingest detection',
      duplicateIngest?.ingest?.skippedAsDuplicate === true,
      duplicateIngest?.ingest,
    );

    let invalidPathHandled = false;
    let invalidPathDetails: unknown;
    try {
      const invalidPathResult = await client.callTool({
        name: 'ingest_export',
        arguments: { filePath: path.resolve(projectRoot, '..', 'data', 'missing-file.json') },
      });
      invalidPathHandled = invalidPathResult?.isError === true;
      invalidPathDetails = invalidPathResult;
    } catch (error) {
      invalidPathHandled = true;
      invalidPathDetails = error instanceof Error ? error.message : String(error);
    }
    assertCheck(checks, 'invalid ingest path handled as error', invalidPathHandled, invalidPathDetails);

    const noCitationAnswer = parseTextPayload(
      await client.callTool({
        name: 'answer_with_citations',
        arguments: {
          question: impossibleQuery,
          maxCitations: 3,
        },
      }),
    );
    assertCheck(
      checks,
      'answer_with_citations no-hit behavior',
      Array.isArray(noCitationAnswer?.citations) && noCitationAnswer.citations.length === 0,
      noCitationAnswer,
    );

    const failed = checks.filter((check) => !check.ok);
    const summary = {
      ok: failed.length === 0,
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      checks,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
