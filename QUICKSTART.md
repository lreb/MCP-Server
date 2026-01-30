# Quick Start Guide - Local-Dev MCP Server

This guide will get you up and running with your first MCP server in 10 minutes.

## What You'll Learn

- ✅ Install and run the MCP server
- ✅ Connect it to Claude Desktop
- ✅ Test the available tools
- ✅ Create your first custom tool

---

## Step 1: Installation (2 minutes)

### Clone the Project

```bash
cd C:\Projects
# If you already have the folder, skip to next step
```

### Install Dependencies

```bash
cd mcp-server
npm install
```

You should see:
```
added 25 packages, and audited 26 packages in 5s
```

---

## Step 2: Build the Server (1 minute)

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

---

## Step 3: Test in Development Mode (1 minute)

```bash
npm run dev
```

You should see:
```
MCP Server running on stdio
```

Press `Ctrl+C` to stop. This confirms the server works!

---

## Step 4: Configure Claude Desktop (3 minutes)

### Find Your Configuration File

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Edit the Configuration

Open the file in a text editor and add:

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

**⚠️ Important:**
- Use YOUR actual path to the project
- On Windows, use `\\` or `/` in paths
- Make sure `dist/index.js` exists (from the build step)

### Restart Claude Desktop

Completely quit and restart Claude Desktop for changes to take effect.

---

## Step 5: Test the Connection (2 minutes)

Open Claude Desktop and ask:

> "What MCP servers are connected?"

You should see:
```
I have the following MCP server connected:

local-dev - with these tools:
- read-file
- write-file
- list-directory
- create-task
- list-tasks
- update-task-status
- generate-markdown-doc
- generate-readme
```

### Try a Simple Tool

> "Use local-dev to create a task titled 'Test Task' with description 'My first MCP task'"

Claude should respond with confirmation and a task ID!

---

## Step 6: Explore the Tools (2 minutes)

### File Operations

> "List the files in C:\Projects\mcp-server"

> "Read the package.json file in my mcp-server project"

### Task Management

> "List all my tasks"

> "Update task-1 status to done"

### Document Generation

> "Generate a README for a project called 'My Awesome App' that is a web application for task management"

---

## What's Next?

### Learn the Architecture

Read `DOCUMENTATION.md` to understand:
- How MCP works
- Server architecture
- Tool implementation details

### Add Your First Tool

Let's add a simple greeting tool!

#### 1. Open `src/index.ts`

#### 2. Add tool definition to the `TOOLS` array:

```typescript
{
  name: 'greet',
  description: 'Generate a personalized greeting',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the person to greet'
      },
      language: {
        type: 'string',
        enum: ['english', 'spanish', 'french'],
        description: 'Language for greeting',
        default: 'english'
      }
    },
    required: ['name']
  }
}
```

#### 3. Add handler in `CallToolRequestSchema`:

```typescript
if (name === 'greet') {
  const { name, language = 'english' } = args as { 
    name: string; 
    language?: string 
  };
  
  const greetings: Record<string, string> = {
    english: `Hello, ${name}! Welcome to MCP!`,
    spanish: `¡Hola, ${name}! ¡Bienvenido a MCP!`,
    french: `Bonjour, ${name}! Bienvenue à MCP!`
  };
  
  return {
    content: [{
      type: 'text',
      text: greetings[language] || greetings.english
    }]
  };
}
```

#### 4. Rebuild and restart:

```bash
npm run build
# Restart Claude Desktop
```

#### 5. Test it:

> "Use the greet tool to say hello to Alice in Spanish"

You should see: "¡Hola, Alice! ¡Bienvenido a MCP!"

---

## Common Issues

### "Server not found in Claude"

**Fix:**
1. Check the path in `claude_desktop_config.json` is correct
2. Verify `dist/index.js` exists
3. Restart Claude Desktop completely (quit from system tray)

### "npm: command not found"

**Fix:**
Install Node.js from https://nodejs.org (LTS version)

### "Cannot find module"

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Permission denied" on Windows

**Fix:**
Run terminal as Administrator, or change project location to your user folder

---

## Development Workflow

### While developing:

```bash
# Terminal 1: Watch for changes and rebuild
npm run watch

# Terminal 2: Test your changes
# (Restart Claude Desktop to reload the server)
```

### Before committing:

```bash
# Make sure everything builds
npm run build

# Test all tools work
# Use Claude to test each tool
```

---

## Resources

- **Full Documentation**: `DOCUMENTATION.md`
- **MCP Spec**: https://modelcontextprotocol.io
- **MCP SDK**: https://github.com/anthropics/anthropic-sdk-typescript
- **TypeScript Docs**: https://www.typescriptlang.org/docs

---

## Need Help?

1. Check `DOCUMENTATION.md` for detailed explanations
2. Read the MCP documentation
3. Look at the code comments in `src/index.ts`
4. Ask Claude for help! (It can read this documentation)

---

**Congratulations! 🎉**

You now have a working MCP server and understand the basics. Next, dive into `DOCUMENTATION.md` to learn advanced topics like:

- External API integration
- Database connections
- Security best practices
- Production deployment

Happy coding! 🚀
