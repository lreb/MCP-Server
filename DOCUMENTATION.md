# Local-Dev MCP Server - Complete Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [What is MCP?](#what-is-mcp)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Tool Reference](#tool-reference)
7. [Implementation Details](#implementation-details)
8. [Extending the Server](#extending-the-server)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The `local-dev` MCP server is a production-ready implementation of the Model Context Protocol that provides AI assistants like Claude with tools for local development tasks. It serves as an excellent base project for anyone looking to build their own MCP server.

### Key Features

- ✅ **File Operations**: Read, write, and list files/directories
- ✅ **Task Management**: In-memory task tracking system
- ✅ **Document Generation**: Markdown and README templates
- ✅ **TypeScript**: Full type safety and modern JavaScript features
- ✅ **Production Ready**: Error handling, validation, and proper MCP compliance

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open protocol that standardizes how AI applications interact with external data sources and tools. Think of it as a universal adapter that lets AI assistants like Claude connect to various services, databases, and APIs.

### Why MCP Matters

- **Standardization**: One protocol for all AI-tool integrations
- **Security**: Controlled, auditable tool access
- **Extensibility**: Easy to add new capabilities
- **Interoperability**: Works with any MCP-compatible AI client

### How It Works

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Claude    │ ◄─MCP─► │ MCP Server  │ ◄─────► │   Tools     │
│  (Client)   │         │ (Your Code) │         │  (Actions)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

1. **Client** (Claude) sends tool requests via MCP
2. **Server** (this project) receives and processes requests
3. **Tools** execute the actual operations
4. **Results** flow back to the client

---

## Architecture Overview

### Core Components

```typescript
┌──────────────────────────────────────────────────┐
│                 MCP Server                       │
├──────────────────────────────────────────────────┤
│  1. Server Instance (@modelcontextprotocol/sdk)  │
│     - Handles protocol communication             │
│     - Manages tool registration                  │
│                                                  │
│  2. Request Handlers                             │
│     - ListToolsRequestSchema → Returns tools     │
│     - CallToolRequestSchema  → Executes tools    │
│                                                  │
│  3. Transport Layer (stdio)                      │
│     - Standard input/output communication        │
│     - Process-level messaging                    │
│                                                  │
│  4. Tool Implementations                         │
│     - File operations (fs promises)              │
│     - Task management (in-memory Map)            │
│     - Document generation (string templates)     │
└──────────────────────────────────────────────────┘
```

### Data Flow

```
User Request in Claude
        ↓
MCP Protocol Message (JSON-RPC)
        ↓
Stdio Transport
        ↓
Server Request Handler
        ↓
Tool Execution
        ↓
Result Generation
        ↓
MCP Response Message
        ↓
Displayed in Claude
```

---

## Project Structure

```
mcp-server/
├── src/
│   └── index.ts              # Main server implementation
├── dist/                     # Compiled JavaScript output
├── node_modules/             # Dependencies
├── .vscode/                  # VS Code settings
├── .github/                  # GitHub workflows/config
├── package.json              # Project manifest
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Quick start guide
└── DOCUMENTATION.md          # This file
```

### Key Files Explained

**`src/index.ts`**
- Server initialization and configuration
- Tool definitions and schemas
- Request handlers
- Tool implementations

**`package.json`**
- Dependencies: MCP SDK, Zod for validation
- Scripts: build, dev, start, watch
- Project metadata

**`tsconfig.json`**
- TypeScript compiler settings
- Module resolution: ESM
- Output target: Modern JavaScript

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- Basic TypeScript/JavaScript knowledge

### Installation Steps

1. **Clone or download this project**
   ```bash
   git clone <your-repo-url>
   cd mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Test in development mode**
   ```bash
   npm run dev
   ```

### Configuration for Claude Desktop

To connect this server to Claude Desktop, edit your Claude configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add your server:

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

**Important**: 
- Use absolute paths
- On Windows, use double backslashes or forward slashes
- Restart Claude Desktop after configuration changes

### Verification

After restarting Claude Desktop, ask Claude:
> "What MCP servers are connected?"

You should see `local-dev` listed with all its tools.

---

## Tool Reference

### File Operations

#### `read-file`
Reads the contents of a file from the filesystem.

**Parameters:**
- `path` (string, required): Absolute or relative file path

**Example:**
```typescript
{
  "path": "C:\\Projects\\myfile.txt"
}
```

**Returns:** File contents as text

---

#### `write-file`
Writes content to a file, creating parent directories if needed.

**Parameters:**
- `path` (string, required): File path to write
- `content` (string, required): Content to write

**Example:**
```typescript
{
  "path": "./output/report.md",
  "content": "# My Report\n\nContent here..."
}
```

**Returns:** Success confirmation

---

#### `list-directory`
Lists all files and subdirectories in a directory.

**Parameters:**
- `path` (string, required): Directory path

**Example:**
```typescript
{
  "path": "C:\\Projects"
}
```

**Returns:** Formatted list with 📁 for folders, 📄 for files

---

### Task Management

#### `create-task`
Creates a new task with title, description, and priority.

**Parameters:**
- `title` (string, required): Task title
- `description` (string, required): Detailed description
- `priority` (enum, optional): "low" | "medium" | "high" (default: "medium")

**Example:**
```typescript
{
  "title": "Implement authentication",
  "description": "Add JWT-based auth to API",
  "priority": "high"
}
```

**Returns:** Task ID and details

---

#### `list-tasks`
Lists all tasks, optionally filtered by status.

**Parameters:**
- `status` (enum, optional): "todo" | "in-progress" | "done" | "all"

**Example:**
```typescript
{
  "status": "in-progress"
}
```

**Returns:** Formatted task list

---

#### `update-task-status`
Updates the status of an existing task.

**Parameters:**
- `taskId` (string, required): Task identifier (e.g., "task-1")
- `status` (enum, required): "todo" | "in-progress" | "done"

**Example:**
```typescript
{
  "taskId": "task-1",
  "status": "done"
}
```

**Returns:** Confirmation message

---

### Document Generation

#### `generate-markdown-doc`
Generates a structured markdown document.

**Parameters:**
- `title` (string, required): Document title
- `sections` (array, required): Array of `{heading, content}` objects

**Example:**
```typescript
{
  "title": "Project Proposal",
  "sections": [
    {
      "heading": "Overview",
      "content": "This project aims to..."
    },
    {
      "heading": "Timeline",
      "content": "Phase 1: Research\nPhase 2: Development"
    }
  ]
}
```

**Returns:** Formatted markdown text

---

#### `generate-readme`
Generates a README.md template for projects.

**Parameters:**
- `projectName` (string, required): Project name
- `description` (string, required): Project description
- `features` (array, optional): List of feature strings

**Example:**
```typescript
{
  "projectName": "Awesome Tool",
  "description": "A tool that does amazing things",
  "features": [
    "Fast performance",
    "Easy to use",
    "Cross-platform"
  ]
}
```

**Returns:** Complete README template

---

## Implementation Details

### Server Initialization

```typescript
const server = new Server({
  name: 'local-dev-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},  // Declares tool support
  },
});
```

**Key Points:**
- `Server` class from MCP SDK
- Capabilities object declares what the server can do
- Name and version for identification

---

### Tool Definition Structure

Each tool follows this schema:

```typescript
{
  name: 'tool-name',           // Unique identifier
  description: 'What it does', // Human-readable description
  inputSchema: {               // JSON Schema for parameters
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']       // Required parameters
  }
}
```

---

### Request Handlers

#### ListToolsRequestSchema
Returns all available tools when Claude asks "what can you do?"

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS  // Array of tool definitions
}));
```

#### CallToolRequestSchema
Executes a specific tool with provided arguments

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Route to appropriate tool implementation
  if (name === 'read-file') {
    // Implementation here
  }
  
  // Return MCP-compliant response
  return {
    content: [
      { type: 'text', text: 'Result...' }
    ]
  };
});
```

---

### Error Handling

All tools use try-catch and return proper error responses:

```typescript
try {
  // Tool logic
  return { content: [...] };
} catch (error) {
  return {
    content: [{
      type: 'text',
      text: `Error: ${error.message}`
    }],
    isError: true  // Signals error to client
  };
}
```

---

### Transport Layer

Uses `StdioServerTransport` for process-level communication:

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Why Stdio?**
- Simple, universal process communication
- Works on all operating systems
- No network configuration needed
- Secure (local process only)

---

## Extending the Server

### Adding a New Tool

Follow these steps to add your own tool:

#### 1. Define the Tool Schema

Add to the `TOOLS` array:

```typescript
{
  name: 'my-new-tool',
  description: 'Does something useful',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input parameter'
      }
    },
    required: ['input']
  }
}
```

#### 2. Implement the Tool Handler

Add to the `CallToolRequestSchema` handler:

```typescript
if (name === 'my-new-tool') {
  const { input } = args as { input: string };
  
  // Your implementation logic
  const result = processInput(input);
  
  return {
    content: [{
      type: 'text',
      text: result
    }]
  };
}
```

#### 3. Add Type Safety (Optional but Recommended)

Define a Zod schema for validation:

```typescript
import { z } from 'zod';

const MyToolSchema = z.object({
  input: z.string().min(1)
});

// In handler
const validated = MyToolSchema.parse(args);
```

#### 4. Test Your Tool

Rebuild and test:

```bash
npm run build
npm start
```

Then in Claude: "Use my-new-tool with input 'test'"

---

### Example: Adding a Weather Tool

Here's a complete example of adding a weather lookup tool:

```typescript
// 1. Add to TOOLS array
{
  name: 'get-weather',
  description: 'Get current weather for a city',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name'
      }
    },
    required: ['city']
  }
}

// 2. Add handler in CallToolRequestSchema
if (name === 'get-weather') {
  const { city } = args as { city: string };
  
  // Call weather API (simplified example)
  const response = await fetch(
    `https://api.weather.com/current?city=${city}`
  );
  const data = await response.json();
  
  return {
    content: [{
      type: 'text',
      text: `Weather in ${city}: ${data.temperature}°C, ${data.condition}`
    }]
  };
}
```

---

### Best Practices for Tool Development

1. **Clear Descriptions**: Make tool purposes obvious
2. **Validate Inputs**: Use Zod or JSON Schema validation
3. **Handle Errors**: Always wrap in try-catch
4. **Return Structured Data**: Use consistent response formats
5. **Document Parameters**: Explain what each parameter does
6. **Test Thoroughly**: Test with various inputs and edge cases
7. **Keep It Focused**: One tool = one clear purpose

---

## Deployment

### Local Development Deployment

Already covered in [Getting Started](#getting-started) - uses `npm run dev` or `npm start`.

### Production Deployment Options

#### Option 1: System Service (Windows)

Create a Windows service using `node-windows`:

```bash
npm install -g node-windows
npm run build

# Create service script
node create-service.js
```

**create-service.js:**
```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'MCP Local Dev Server',
  description: 'MCP server for local development',
  script: 'C:\\Projects\\mcp-server\\dist\\index.js'
});

svc.on('install', () => svc.start());
svc.install();
```

#### Option 2: PM2 Process Manager

```bash
npm install -g pm2
npm run build

# Start with PM2
pm2 start dist/index.js --name mcp-local-dev

# Save process list
pm2 save

# Auto-start on system boot
pm2 startup
```

#### Option 3: Docker Container

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

CMD ["node", "dist/index.js"]
```

**Build and run:**
```bash
docker build -t mcp-server .
docker run -d --name mcp-server mcp-server
```

---

### Environment Configuration

For production, use environment variables:

```typescript
// In index.ts
const CONFIG = {
  name: process.env.MCP_SERVER_NAME || 'local-dev-mcp-server',
  version: process.env.MCP_SERVER_VERSION || '1.0.0',
  logLevel: process.env.LOG_LEVEL || 'info'
};
```

**Example .env file:**
```env
MCP_SERVER_NAME=my-company-dev-server
MCP_SERVER_VERSION=2.0.0
LOG_LEVEL=debug
```

---

## Troubleshooting

### Common Issues

#### Issue: "Server not found" in Claude

**Solution:**
1. Check configuration path is absolute
2. Verify server is built: `npm run build`
3. Restart Claude Desktop completely
4. Check Claude logs for connection errors

#### Issue: "Tool execution failed"

**Solution:**
1. Check server logs for errors
2. Verify tool parameters match schema
3. Ensure file paths are accessible
4. Check permissions on directories

#### Issue: TypeScript compilation errors

**Solution:**
```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

#### Issue: Task storage doesn't persist

**Expected behavior:** Tasks are stored in-memory and reset on restart.

**Solution for persistence:**
- Modify server to use a file-based or database storage
- Example: Save to `tasks.json` on each change

---

### Debugging Tips

1. **Enable verbose logging**
   ```typescript
   console.error('Tool called:', name, args);
   ```

2. **Test tools independently**
   ```bash
   # Run in dev mode to see console output
   npm run dev
   ```

3. **Check MCP protocol messages**
   - Add logging in request handlers
   - Inspect `request.params` structure

4. **Validate tool schemas**
   ```typescript
   import Ajv from 'ajv';
   const ajv = new Ajv();
   const valid = ajv.validate(schema, data);
   ```

---

### Getting Help

- **MCP Documentation**: https://modelcontextprotocol.io
- **MCP SDK GitHub**: https://github.com/anthropics/anthropic-sdk-typescript
- **Claude Support**: https://support.anthropic.com
- **Community Discord**: [MCP Community](https://discord.gg/mcp)

---

## Advanced Topics

### Integrating External APIs

Example: Adding a GitHub integration

```typescript
{
  name: 'create-github-issue',
  description: 'Create a GitHub issue',
  inputSchema: {
    type: 'object',
    properties: {
      repo: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string' }
    },
    required: ['repo', 'title', 'body']
  }
}

// Handler
if (name === 'create-github-issue') {
  const { repo, title, body } = args;
  
  const response = await fetch(
    `https://api.github.com/repos/${repo}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    }
  );
  
  const issue = await response.json();
  return {
    content: [{
      type: 'text',
      text: `Created issue #${issue.number}: ${issue.html_url}`
    }]
  };
}
```

---

### Security Considerations

1. **Path Traversal Protection**
   ```typescript
   import path from 'path';
   
   // Validate paths are within allowed directory
   const allowedDir = '/home/user/projects';
   const resolvedPath = path.resolve(userPath);
   
   if (!resolvedPath.startsWith(allowedDir)) {
     throw new Error('Access denied');
   }
   ```

2. **Input Sanitization**
   ```typescript
   import { z } from 'zod';
   
   const SafePathSchema = z.string()
     .regex(/^[a-zA-Z0-9\/\\_.-]+$/)
     .max(255);
   ```

3. **Rate Limiting**
   ```typescript
   const rateLimiter = new Map<string, number>();
   
   function checkRateLimit(toolName: string): boolean {
     const count = rateLimiter.get(toolName) || 0;
     if (count > 100) return false;
     rateLimiter.set(toolName, count + 1);
     return true;
   }
   ```

---

## Conclusion

This MCP server provides a solid foundation for building AI-powered development tools. The modular architecture makes it easy to extend with new capabilities while maintaining reliability and security.

### Next Steps

1. ✅ Get the server running locally
2. ✅ Test all existing tools
3. ✅ Add your first custom tool
4. ✅ Share with your team
5. ✅ Build something amazing!

### Contributing

Feel free to fork this project and adapt it for your needs. Consider sharing improvements back to help others learn MCP development.

---

**Happy building! 🚀**
