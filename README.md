# Local Development MCP Server

A local MCP server for Claude Desktop with persistent task management, file operations, document generation, and PDF indexing.

## What's New in v2.0.0

- **SQLite persistence for tasks** — tasks now survive server restarts and recompiles
- **Zero native dependencies** — uses `sql.js` (SQLite as WebAssembly), installs on Windows/macOS/Linux without build tools
- **Two new task tools** — `delete-task` and `search-tasks`
- **Weekly review tool** — `tasks-completed-this-week` for standups

## Prerequisites

- Node.js 18+
- npm
- Claude Desktop

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd mcp-server
npm install
```

No build tools required — `sql.js` is pure WebAssembly.

### 2. Build and run

```bash
npm run build
npm start
```

Expected output:

```text
Task database created at: C:\Users\<you>\mcp-tasks.db
MCP Server v2.0.0 running on stdio
Task database: C:\Users\<you>\mcp-tasks.db
```

### 3. Connect Claude Desktop

Edit your Claude config:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

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

Restart Claude Desktop after saving.

## Development Workflow

### Local development (auto-restart)

```bash
npm run watch
```

### Claude Desktop workflow

```bash
npm run build
# restart Claude Desktop
```

## Task Database

Tasks are stored in a SQLite database at:

- Windows: `C:\Users\<you>\mcp-tasks.db`
- macOS/Linux: `~/mcp-tasks.db`

The database is created automatically on first run. The server loads it into memory on startup and saves it to disk after every write. You can open it with any SQLite viewer (e.g. [DB Browser for SQLite](https://sqlitebrowser.org/)).

## How to use the task tools

Try these prompts in Claude Desktop after connecting:

| What you want | What to say to Claude |
|---|---|
| Add a task | "Create a task: review the API docs, high priority" |
| See all tasks | "List all my tasks" |
| Filter by status | "Show me all in-progress tasks" |
| Move a task forward | "Mark task-1 as done" |
| Find a task | "Search tasks for 'authentication'" |
| Weekly review | "What tasks did I complete this week?" |
| Clean up | "Delete task-3" |

## Available Tools

### File Operations
| Tool | Description |
|---|---|
| `read-file` | Read any file from disk |
| `write-file` | Write/create a file |
| `list-directory` | List folder contents |

### Task Management (SQLite — persistent)
| Tool | Description |
|---|---|
| `create-task` | Create a task (saved to DB immediately) |
| `list-tasks` | List tasks, filterable by status |
| `update-task-status` | Move task to todo / in-progress / done |
| `delete-task` | Permanently delete a task |
| `search-tasks` | Search tasks by keyword |
| `tasks-completed-this-week` | Show tasks done in the last 7 days |

### Document Generation
| Tool | Description |
|---|---|
| `generate-markdown-doc` | Generate a structured `.md` file |
| `generate-readme` | Scaffold a `README.md` template |

### PDF / Document Indexing
| Tool | Description |
|---|---|
| `read-pdf` | Extract text from a PDF |
| `index-documents` | Bulk-index PDFs in a folder |
| `search-documents` | Keyword search across indexed PDFs |
| `list-indexes` | Show all active indexes |

## Available Scripts

```bash
npm run build   # Compile TypeScript to dist/
npm run dev     # Run from source once (tsx)
npm start       # Run compiled server (dist/index.js)
npm run watch   # Run from source with auto-restart
```

## Documentation

- [QUICKSTART.md](QUICKSTART.md) — setup and first run
- [TUTORIAL.md](TUTORIAL.md) — add your own tool
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — common fixes
- [API_REFERENCE.md](API_REFERENCE.md) — technical reference
- [DOCUMENTATION.md](DOCUMENTATION.md) — architecture overview
