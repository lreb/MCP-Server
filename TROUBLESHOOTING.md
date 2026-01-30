# Troubleshooting Guide - Local-Dev MCP Server

Common issues and their solutions when working with the MCP server.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Connection Issues](#connection-issues)
3. [Tool Execution Issues](#tool-execution-issues)
4. [Build Issues](#build-issues)
5. [Performance Issues](#performance-issues)
6. [Debugging Tips](#debugging-tips)

---

## Installation Issues

### Issue: `npm install` fails

**Symptoms:**
```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path package.json
```

**Solution:**
Make sure you're in the correct directory:
```bash
cd C:\Projects\mcp-server
dir package.json  # Should exist
npm install
```

---

### Issue: Node.js version incompatibility

**Symptoms:**
```
error typescript@5.7.3: The engine "node" is incompatible
```

**Solution:**
Update to Node.js 18 or higher:
```bash
node --version  # Check current version
# Download from https://nodejs.org if needed
```

---

### Issue: Permission errors on Windows

**Symptoms:**
```
Error: EACCES: permission denied
```

**Solution:**
Run terminal as Administrator, or change project location:
```bash
# Move to user directory
cd %USERPROFILE%\Projects
# Clone/move project here
```

---

## Connection Issues

### Issue: Claude doesn't see the server

**Symptoms:**
- Ask Claude "What MCP servers are connected?"
- `local-dev` not listed

**Solution 1: Check configuration file**

Windows:
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

Verify format:
```json
{
  "mcpServers": {
    "local-dev": {
      "command": "node",
      "args": [
        "C:\\Projects\\mcp-server\\dist\\index.js"
      ]
    }
  }
}
```

**Solution 2: Verify path**
```bash
# Check file exists
dir C:\Projects\mcp-server\dist\index.js
```

**Solution 3: Restart Claude**
- Completely quit Claude (check system tray)
- Restart application
- Wait 10 seconds before testing

---

### Issue: "Server failed to start"

**Symptoms:**
- Server appears in Claude but shows error
- Tools not available

**Solution 1: Check server runs standalone**
```bash
cd C:\Projects\mcp-server
npm run build
node dist/index.js
```

Should output:
```
MCP Server running on stdio
```

If error appears, check the error message.

**Solution 2: Check for syntax errors**
```bash
npm run build
# Look for TypeScript compilation errors
```

**Solution 3: Verify dependencies**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### Issue: Server connects but immediately disconnects

**Symptoms:**
- Server appears briefly then vanishes
- Intermittent connection

**Solution 1: Check for console.log usage**

Don't use `console.log()` in server code (breaks stdio):
```typescript
// ✗ Bad
console.log('Debug message');

// ✓ Good
console.error('Debug message');
```

**Solution 2: Check for unhandled promises**
```typescript
// ✗ Bad
async function riskyOperation() {
  throw new Error('Oops');
}
riskyOperation(); // Unhandled rejection

// ✓ Good
async function riskyOperation() {
  throw new Error('Oops');
}
riskyOperation().catch(err => {
  console.error('Error:', err);
});
```

**Solution 3: Add error handling to main**
```typescript
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
```

---

## Tool Execution Issues

### Issue: "Tool not found"

**Symptoms:**
Claude says tool doesn't exist

**Solution:**
Check tool name matches exactly:
```typescript
// In TOOLS array
{ name: 'read-file', ... }

// In handler
if (name === 'read-file') { ... }
```

Rebuild after changes:
```bash
npm run build
# Restart Claude
```

---

### Issue: "Invalid arguments"

**Symptoms:**
```
Error: Validation error
```

**Solution 1: Check parameter types**

Make sure arguments match schema:
```typescript
// Schema says string
inputSchema: {
  properties: {
    count: { type: 'string' }
  }
}

// But you're passing number
{ count: 42 }  // Wrong!
{ count: "42" }  // Correct
```

**Solution 2: Check required fields**
```typescript
inputSchema: {
  properties: {
    name: { type: 'string' },
    email: { type: 'string' }
  },
  required: ['name', 'email']  // Both required!
}
```

**Solution 3: Add Zod validation**
```typescript
const schema = z.object({
  name: z.string(),
  email: z.string().email()
});

const validated = schema.parse(args);
// Will throw clear error if invalid
```

---

### Issue: File operations fail

**Symptoms:**
```
Error: ENOENT: no such file or directory
```

**Solution 1: Use absolute paths**
```typescript
// ✗ Bad (relative to where?)
path: 'myfile.txt'

// ✓ Good
path: 'C:\\Projects\\myfile.txt'
```

**Solution 2: Check path separators**

Windows accepts both:
```typescript
'C:\\Projects\\file.txt'  // ✓ Backslashes
'C:/Projects/file.txt'    // ✓ Forward slashes
```

**Solution 3: Verify permissions**
```typescript
import { access, constants } from 'fs/promises';

try {
  await access(path, constants.R_OK);
  // File is readable
} catch {
  return {
    content: [{
      type: 'text',
      text: `Cannot read file: ${path}`
    }],
    isError: true
  };
}
```

---

### Issue: Task operations don't persist

**Symptoms:**
- Create task, it works
- Restart server, task gone

**Expected behavior:**
Tasks are stored in-memory by default and don't persist across restarts.

**Solution (to add persistence):**

```typescript
import { promises as fs } from 'fs';

const TASKS_FILE = './tasks.json';

// Load on startup
async function loadTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    const saved = JSON.parse(data);
    Object.entries(saved).forEach(([id, task]) => {
      tasks.set(id, task as Task);
    });
    console.error(`Loaded ${tasks.size} tasks`);
  } catch {
    console.error('No tasks file found, starting fresh');
  }
}

// Save after changes
async function saveTasks() {
  const data = Object.fromEntries(tasks);
  await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2));
}

// In main()
await loadTasks();

// After each task modification
await saveTasks();
```

---

## Build Issues

### Issue: TypeScript compilation errors

**Symptoms:**
```
error TS2304: Cannot find name 'xyz'
```

**Solution 1: Check imports**
```typescript
// ✗ Missing import
const data = await fs.readFile(path);

// ✓ With import
import { promises as fs } from 'fs';
const data = await fs.readFile(path);
```

**Solution 2: Check type definitions**
```bash
npm install --save-dev @types/node
```

**Solution 3: Check tsconfig.json**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ES2020",
    "lib": ["ES2020"],
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

### Issue: "Cannot find module" at runtime

**Symptoms:**
```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Solution 1: Reinstall dependencies**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Solution 2: Check package.json type**
```json
{
  "type": "module",  // Required for ESM
  "main": "dist/index.js"
}
```

**Solution 3: Rebuild**
```bash
npm run build
```

---

## Performance Issues

### Issue: Server responds slowly

**Symptoms:**
- Long delays before tool executes
- Tools timeout

**Solution 1: Check for synchronous operations**
```typescript
// ✗ Bad - blocks event loop
const data = fs.readFileSync(path);

// ✓ Good - async
const data = await fs.readFile(path);
```

**Solution 2: Add timeout handling**
```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}

// Usage
const result = await withTimeout(
  slowOperation(),
  5000  // 5 second timeout
);
```

**Solution 3: Optimize file operations**
```typescript
// For large files, use streams
import { createReadStream } from 'fs';

const stream = createReadStream(largePath);
stream.on('data', chunk => {
  // Process chunk by chunk
});
```

---

### Issue: High memory usage

**Symptoms:**
- Server crashes with "out of memory"
- Slow performance over time

**Solution 1: Clear caches periodically**
```typescript
const cache = new Map();

setInterval(() => {
  cache.clear();
  console.error('Cache cleared');
}, 3600000);  // Every hour
```

**Solution 2: Limit concurrent operations**
```typescript
class RequestQueue {
  private queue: Promise<any>[] = [];
  private maxConcurrent = 5;
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    while (this.queue.length >= this.maxConcurrent) {
      await Promise.race(this.queue);
    }
    
    const promise = fn();
    this.queue.push(promise);
    
    promise.finally(() => {
      const index = this.queue.indexOf(promise);
      if (index > -1) this.queue.splice(index, 1);
    });
    
    return promise;
  }
}

const queue = new RequestQueue();
await queue.add(() => expensiveOperation());
```

---

## Debugging Tips

### 1. Enable verbose logging

Add at the top of handlers:
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  console.error('=== Tool Call ===');
  console.error('Name:', name);
  console.error('Args:', JSON.stringify(args, null, 2));
  console.error('================');
  
  // Your tool logic...
});
```

### 2. Log to file

Create a log file instead of stderr:
```typescript
import { appendFileSync } from 'fs';

function log(message: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(
    'server.log',
    `[${timestamp}] ${message}\n`
  );
}

log('Server started');
log(`Tool called: ${name}`);
```

### 3. Use development mode

Run with watch mode during development:
```bash
npm run watch
# Edit code, server auto-restarts
```

### 4. Test tools independently

Create test script:
```typescript
// test-tool.ts
import { readFile } from './src/index.js';

async function test() {
  const result = await readFile({ path: './test.txt' });
  console.log(result);
}

test();
```

Run:
```bash
npx tsx test-tool.ts
```

### 5. Check Claude logs

Claude Desktop logs can show connection issues:

**Windows:**
```
%APPDATA%\Claude\logs\
```

**macOS:**
```
~/Library/Logs/Claude/
```

Look for:
- Connection errors
- Tool execution errors
- Transport failures

### 6. Validate JSON Schema

Use online validator:
1. Copy your tool's inputSchema
2. Go to https://www.jsonschemavalidator.net/
3. Paste schema
4. Test with sample data

### 7. Use TypeScript strict mode

Enable in tsconfig.json:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

This catches many bugs at compile time.

---

## Getting Help

### Before asking for help:

1. ✅ Check this troubleshooting guide
2. ✅ Read relevant documentation files
3. ✅ Check server builds: `npm run build`
4. ✅ Test server runs: `node dist/index.js`
5. ✅ Review configuration file
6. ✅ Check Claude Desktop logs

### When asking for help, provide:

- Exact error message
- Steps to reproduce
- Your configuration file (with sensitive info removed)
- Node.js version: `node --version`
- npm version: `npm --version`
- Operating system
- Server logs if available

### Resources:

- **MCP Documentation**: https://modelcontextprotocol.io
- **GitHub Issues**: [Your repo issues page]
- **MCP Discord**: https://discord.gg/mcp
- **Stack Overflow**: Tag questions with `mcp` and `typescript`

---

## Preventive Measures

### 1. Regular maintenance

```bash
# Weekly
npm outdated
npm update

# Monthly
npm audit
npm audit fix
```

### 2. Version control

```bash
git init
git add .
git commit -m "Working version"
# Before making changes, commit!
```

### 3. Testing

Create tests for critical tools:
```typescript
// tests/critical.test.ts
describe('read-file', () => {
  it('reads existing file', async () => {
    // Test logic
  });
});
```

### 4. Documentation

Document your custom tools:
```typescript
/**
 * Converts markdown to HTML
 * @param markdown - Input markdown text
 * @param sanitize - Whether to sanitize HTML (default: true)
 * @returns HTML string
 */
```

---

## Common Pitfalls

### 1. Async without await

```typescript
// ✗ Will cause issues
async function handler() {
  fs.readFile(path);  // Missing await!
  return { content: [...] };
}
```

### 2. Mutating shared state

```typescript
// ✗ Can cause race conditions
const config = { count: 0 };
// Multiple handlers modify config

// ✓ Use new objects
const newConfig = { ...config, count: config.count + 1 };
```

### 3. Not handling all error cases

```typescript
// ✗ Missing error handling
const data = await riskyOperation();

// ✓ Comprehensive error handling
try {
  const data = await riskyOperation();
} catch (error) {
  if (error.code === 'ENOENT') {
    // Handle missing file
  } else if (error.code === 'EACCES') {
    // Handle permission error
  } else {
    // Handle other errors
  }
}
```

---

**If all else fails**: Delete everything and start fresh!

```bash
cd C:\Projects
rm -rf mcp-server
# Re-download/clone
npm install
npm run build
# Reconfigure Claude
```

Good luck! 🚀
