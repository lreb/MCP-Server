# Documentation - Local Development MCP Server

This file provides a compact technical overview.

## What this server does

The server exposes MCP tools over stdio for Claude Desktop.

Tool groups:
- File tools: `read-file`, `write-file`, `list-directory`
- Task tools: `create-task`, `list-tasks`, `update-task-status`, `delete-task`, `search-tasks`, `tasks-completed-this-week`
- Document tools: `generate-markdown-doc`, `generate-readme`
- PDF tools: `read-pdf`, `index-documents`, `search-documents`, `list-indexes`

## Runtime model

- Entry source: `src/index.ts`
- Build output: `dist/index.js`
- Transport: `StdioServerTransport`
- Server starts in `main()` and logs to stderr

## SQLite Persistence

Tasks are stored in a SQLite database using `better-sqlite3`.

**Database location:** `~/mcp-tasks.db` (user's home directory)

**Why home directory?**
- Survives project folder moves or clones
- Accessible across multiple projects using the same server
- No risk of being accidentally deleted with `dist/` or `node_modules/`

**Schema:**

```sql
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo'
                CHECK(status IN ('todo','in-progress','done')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK(priority IN ('low','medium','high')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

**Prepared statements** are compiled once at startup for performance and SQL injection safety.

**ID continuity:** On startup, the server reads the highest existing task ID from the database and seeds the counter from there, so IDs never collide after a restart.

**PDF indexes** remain in-memory (Map) because they are large and rebuilding them from source PDFs is fast. They do not persist across restarts.

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
