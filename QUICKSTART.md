# Quick Start - Local Development MCP Server

This is the shortest path to a working server.

## 1. Clone and install

```bash
cd C:\Projects
git clone <your-repo-url> mcp-server
cd mcp-server
npm install
```

## 2. Build and run once

```bash
npm run build
npm start
```

You should see:

```text
MCP Server running on stdio
```

Press `Ctrl+C` to stop.

## 3. Connect Claude Desktop

Open config file:

- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Add:

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

Restart Claude Desktop.

## 4. Test connection

In Claude Desktop, ask:

```text
What MCP servers are connected?
```

Expected: `local-dev` appears with tools.

## 5. Development after code changes

You have two modes:

### Mode A: fast local dev (auto-restart)

```bash
npm run watch
```

- Runs from `src/index.ts`
- Auto-restarts on file changes
- Good for debugging in terminal

### Mode B: Claude Desktop testing (dist build)

```bash
npm run build
# then restart Claude Desktop
```

- Claude runs `dist/index.js`
- Rebuild required after source changes

## Common check commands

```bash
node --version
npm --version
npm run build
npm start
```

If server is not visible in Claude, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
