# Client Setup: Claude + Codex

This document configures and verifies the local MCP server for both clients.

## 1) Build server binary

```bash
cd mcp-server
npm install
npm run build
```

Server entrypoint:

```text
/home/lukaszangerl/Dokumente/01 Projects/github-public/claude-conversation-analyzer/mcp-server/dist/src/server.js
```

## 2) Claude Code (local client)

Add as user-scoped MCP server:

```bash
claude mcp add -s user claude-conversation-search -- \
  node /home/lukaszangerl/Dokumente/01\ Projects/github-public/claude-conversation-analyzer/mcp-server/dist/src/server.js
```

Verify:

```bash
claude mcp get claude-conversation-search
```

### Claude.ai note

- Local **stdio** MCP servers work with Claude Code CLI.
- For **Claude.ai / Messages API MCP connector**, Anthropic requires publicly reachable HTTP/SSE MCP endpoints; local stdio is not directly connectable.
  - https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector
  - https://docs.anthropic.com/en/docs/claude-code/mcp

## 3) Codex CLI

Add as global MCP server:

```bash
codex mcp add claude-conversation-search -- \
  node /home/lukaszangerl/Dokumente/01\ Projects/github-public/claude-conversation-analyzer/mcp-server/dist/src/server.js
```

Verify:

```bash
codex mcp get claude-conversation-search
codex mcp list
```

## 4) Functional validation

### Full smoke suite (normal + edge cases)

```bash
cd mcp-server
npm run mcp:smoke
```

Covered checks:

- tool registration and health
- normal hybrid retrieval
- special-character query handling
- strict no-hit query behavior
- invalid message context
- duplicate ingest detection
- invalid ingest path error handling
- no-hit behavior for `answer_with_citations`

### Real client invocation tests

Claude Code strict isolated MCP config:

```bash
cat >/tmp/claude-mcp-test.json <<'JSON'
{
  "mcpServers": {
    "claude-conversation-search": {
      "command": "node",
      "args": [
        "/home/lukaszangerl/Dokumente/01 Projects/github-public/claude-conversation-analyzer/mcp-server/dist/src/server.js"
      ]
    }
  }
}
JSON

echo 'Rufe mcp__claude-conversation-search__stats_overview auf und gib nur JSON zurück.' |
  claude -p --strict-mcp-config --mcp-config /tmp/claude-mcp-test.json \
    --permission-mode bypassPermissions \
    --allowedTools "mcp__claude-conversation-search__stats_overview"
```

Codex tool-call run:

```bash
codex exec --json "Use the MCP server claude-conversation-search and call stats_overview. Return only JSON with conversations, messages, chunks."
```

You should see `mcp_tool_call` events and numeric output from the tool.
