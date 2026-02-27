# Claude Conversation Analyzer

[![Claude.ai](https://img.shields.io/badge/Claude.ai-Conversation_Analyzer-191919)](https://claude.ai)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Analyze and explore your exported Claude conversations in a fast, client-side web app.

> Built for Claude users: upload `conversations.json`, inspect activity by day, search content, and export filtered results.

## Live Demo

Try it here: **https://claude-conversation-analyzer.vercel.app**

## Features

- Group conversations by day with quick summaries
- Search across titles and message content
- Filter by time ranges (last 7/30 days, this week, all)
- View conversation/message/character stats
- Export filtered conversations to Markdown
- Debug mode support for unsupported JSON shapes

## Screenshots

### Day View
![Day View](screenshots/day-view.png)

### Conversation Details
![Conversation Details](screenshots/conversation-details.png)

### Statistics
![Statistics](screenshots/statistics.png)

## Usage

1. Export your data from Claude (`Settings` -> `Account` -> `Export data`)
2. Extract `conversations.json` from the ZIP
3. Open the app and upload the JSON file
4. Filter/search and export to Markdown if needed

## Local Development

No build step is required.

```bash
python3 -m http.server 8899
```

Open `http://localhost:8899/index.html`.

## MCP Server (New)

This repository now also includes a production-ready MCP server in [`mcp-server/`](mcp-server/README.md) for agentic retrieval across your conversation archive.

Quick start:

```bash
cd mcp-server
npm install
npm run mcp:ingest -- --file ../data/conversations.json
npm run mcp:start
```

Main MCP tools:

- `search_hybrid` (high-precision hybrid retrieval)
- `answer_with_citations` (extractive answer + citations)
- `get_conversation`
- `get_message_context`
- `stats_overview`

## Privacy

- Fully client-side processing
- No server storage of your conversation data

## License

[MIT](LICENSE)
