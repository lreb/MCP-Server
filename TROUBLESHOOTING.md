# Troubleshooting - Local Development MCP Server

Use this file when setup or connection fails.

## 1. Server not visible in Claude

Check:

1. `dist/index.js` exists:

```bash
npm run build
```

2. Claude config path points to the correct file:

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

3. Restart Claude Desktop completely.

## 2. Changes not reflected in Claude

Claude runs `dist/index.js`, not `src/index.ts`.

After code changes:

```bash
npm run build
# restart Claude Desktop
```

## 3. Watch mode confusion

- `npm run watch` starts source mode with auto-restart.
- You must start it manually once.
- It does not update Claude Desktop unless Claude is also configured to run source mode.

## 4. Build errors

```bash
npm run build
```

Fix TypeScript errors shown in output, then build again.

## 5. Dependency issues

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run build
```

## 6. Verify server is running

1. Terminal shows `MCP Server running on stdio` when started.
2. In Claude: ask `What MCP servers are connected?`
3. Run one tool call like `list-directory`.

## 7. Logging rule

Do not use `console.log` inside MCP server runtime path.
Use `console.error` for logs so stdio protocol is not corrupted.
