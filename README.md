# Local Development MCP Server

A simple MCP server for local development with Claude Desktop.

It includes tools for:
- File operations
- Task management
- Document generation
- PDF reading and indexing

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

### 2. Build and run

```bash
npm run build
npm start
```

Expected output:

```text
MCP Server running on stdio
```

### 3. Connect Claude Desktop

Edit your Claude config:

- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Use this entry (update path if needed):

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

This uses `tsx watch src/index.ts` and restarts automatically when `src/index.ts` changes.

### Claude Desktop workflow

Claude runs `dist/index.js`, so after code changes:

```bash
npm run build
# restart Claude Desktop
```

## How to verify the server is running

1. In terminal: look for `MCP Server running on stdio`.
2. In Claude Desktop: ask `What MCP servers are connected?`.
3. You should see `local-dev` and the tool list.

## Documentation

- [QUICKSTART.md](QUICKSTART.md): setup and first run
- [TUTORIAL.md](TUTORIAL.md): add your own tool
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): common fixes
- [API_REFERENCE.md](API_REFERENCE.md): technical reference

## Available Scripts

```bash
npm run build   # Compile TypeScript to dist/
npm run dev     # Run from source once (tsx)
npm start       # Run compiled server (dist/index.js)
npm run watch   # Run from source with auto-restart
```
