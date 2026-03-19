# Documentation - Local Development MCP Server

This file provides a compact technical overview.

## What this server does

The server exposes MCP tools over stdio for Claude Desktop.

Tool groups:
- File tools: `read-file`, `write-file`, `list-directory`
- Task tools: `create-task`, `list-tasks`, `update-task-status`
- Document tools: `generate-markdown-doc`, `generate-readme`
- PDF tools: `read-pdf`, `index-documents`, `search-documents`, `list-indexes`

## Runtime model

- Entry source: `src/index.ts`
- Build output: `dist/index.js`
- Transport: `StdioServerTransport`
- Server starts in `main()` and logs to stderr

## Scripts and behavior

From [package.json](package.json):

- `npm run build`: compile TypeScript to `dist/`
- `npm run dev`: run once from source (`tsx src/index.ts`)
- `npm start`: run compiled `dist/index.js`
- `npm run watch`: run source with auto-restart (`tsx watch src/index.ts`)

## Which mode to use

- Local coding: use `npm run watch`
- Claude Desktop integration: use `npm run build` then restart Claude Desktop

Reason: Claude config usually points to `dist/index.js`, not `src/index.ts`.

## Minimal Claude configuration

```json
{
  "mcpServers": {
    "local-dev": {
      "command": "node",
      "args": ["C:\\Projects\\mcp-server\\dist\\index.js"]
    }
  }
}
```

## Verify everything works

1. Run `npm run build`.
2. Check `dist/index.js` exists.
3. Restart Claude Desktop.
4. Ask: `What MCP servers are connected?`
5. Run one simple tool call (for example, `list-directory`).

## Add a new tool (short checklist)

1. Add tool schema to `TOOLS` in `src/index.ts`.
2. Add handler branch in `CallToolRequestSchema`.
3. Build with `npm run build`.
4. Restart Claude Desktop.
5. Test from Claude.

## See also

- [README.md](README.md)
- [QUICKSTART.md](QUICKSTART.md)
- [TUTORIAL.md](TUTORIAL.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [API_REFERENCE.md](API_REFERENCE.md)
