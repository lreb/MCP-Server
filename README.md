# Local Development MCP Server

A comprehensive, production-ready Model Context Protocol (MCP) server that provides AI assistants like Claude with tools for local development, task management, and document generation.

**Perfect as a base project for building your own MCP servers!**

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test it works
npm run dev
```

Then configure Claude Desktop to use it - see **[Quick Start Guide](QUICKSTART.md)** for details.

## 📚 Documentation

This project includes comprehensive documentation to help you understand, use, and extend the MCP server:

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[QUICKSTART.md](QUICKSTART.md)** | Get started in 10 minutes | Start here! First time setup |
| **[DOCUMENTATION.md](DOCUMENTATION.md)** | Complete guide to MCP and this server | Learn the architecture and concepts |
| **[TUTORIAL.md](TUTORIAL.md)** | Build custom tools step-by-step | When adding your own tools |
| **[API_REFERENCE.md](API_REFERENCE.md)** | Technical API documentation | Reference while coding |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Common issues and solutions | When something doesn't work |

## ✨ Features

### File Operations
- **read-file**: Read contents of any file
- **write-file**: Write content to files, creating directories as needed
- **list-directory**: List directory contents with visual indicators

### Task Management
- **create-task**: Create tasks with title, description, and priority
- **list-tasks**: View all tasks, filtered by status
- **update-task-status**: Update task status (todo/in-progress/done)

### Document Generation
- **generate-markdown-doc**: Create structured markdown documents
- **generate-readme**: Generate professional README templates

## 🎯 What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants like Claude interact with external tools, data sources, and APIs in a standardized way. This project implements an MCP server that provides local development capabilities.

**Learn more:** [MCP Documentation](DOCUMENTATION.md#what-is-mcp)

## 🛠️ Technology Stack

- **TypeScript** - Type-safe server implementation
- **MCP SDK** - Official Model Context Protocol SDK
- **Zod** - Runtime type validation
- **Node.js** - Server runtime (18+ required)

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Basic TypeScript/JavaScript knowledge (for customization)

### Setup

```bash
# Clone this repository
git clone <your-repo-url>
cd mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## 🔧 Configuration

Add this server to Claude Desktop by editing your configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

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

**Important**: Use the absolute path to your project's `dist/index.js` file.

Restart Claude Desktop completely for changes to take effect.

## 🧪 Testing

### Verify the Connection

Open Claude Desktop and ask:

> "What MCP servers are connected?"

You should see `local-dev` listed with all its tools.

### Test a Tool

> "Use local-dev to create a task titled 'Test Task' with description 'Testing my MCP server'"

Claude should create the task and confirm with a task ID.

## 📖 Usage Examples

### File Operations

```
Read my package.json file
→ Claude uses read-file tool

List files in C:\Projects
→ Claude uses list-directory tool

Create a new file called notes.txt with content "Hello World"
→ Claude uses write-file tool
```

### Task Management

```
Create a high priority task to implement authentication
→ Claude uses create-task tool

Show me all my tasks
→ Claude uses list-tasks tool

Mark task-1 as done
→ Claude uses update-task-status tool
```

### Document Generation

```
Generate a README for a project called "Awesome Tool"
→ Claude uses generate-readme tool

Create a project proposal document with sections for Overview and Timeline
→ Claude uses generate-markdown-doc tool
```

## 🔨 Development

### Available Scripts

```bash
npm run build   # Compile TypeScript to JavaScript
npm run dev     # Run in development mode with tsx
npm start       # Run the compiled server
npm run watch   # Watch for changes and rebuild
```

### Project Structure

```
mcp-server/
├── src/
│   └── index.ts              # Main server implementation
├── dist/                     # Compiled JavaScript (generated)
├── node_modules/             # Dependencies
├── package.json              # Project configuration
├── tsconfig.json             # TypeScript settings
├── README.md                 # This file
├── QUICKSTART.md            # Quick start guide
├── DOCUMENTATION.md         # Complete documentation
├── TUTORIAL.md              # Tool building tutorial
├── API_REFERENCE.md         # API reference
└── TROUBLESHOOTING.md       # Troubleshooting guide
```

## 🎓 Learning Path

**New to MCP?**
1. Read [QUICKSTART.md](QUICKSTART.md) - Get it working (10 min)
2. Read [DOCUMENTATION.md](DOCUMENTATION.md) - Understand how it works (30 min)
3. Try [TUTORIAL.md](TUTORIAL.md) - Build your first custom tool (20 min)

**Building Custom Tools?**
1. Review [TUTORIAL.md](TUTORIAL.md) - Step-by-step examples
2. Reference [API_REFERENCE.md](API_REFERENCE.md) - Technical details
3. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - When stuck

## 🚀 Extending the Server

This server is designed to be a foundation for your own MCP servers. See [TUTORIAL.md](TUTORIAL.md) for detailed guides on:

- Creating simple text processing tools
- Adding input validation with Zod
- Building file system tools
- Integrating external APIs
- Managing stateful operations
- Handling async operations
- Best practices and patterns

**Quick Example:**

```typescript
// Add to TOOLS array
{
  name: 'greet',
  description: 'Generate a personalized greeting',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name to greet' }
    },
    required: ['name']
  }
}

// Add handler
if (name === 'greet') {
  const { name: userName } = args as { name: string };
  return {
    content: [{
      type: 'text',
      text: `Hello, ${userName}! Welcome to MCP!`
    }]
  };
}
```

## 🐛 Troubleshooting

Having issues? Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for solutions to common problems:

- Server not connecting to Claude
- Tool execution errors
- Build/compilation issues
- Performance problems
- File operation failures

## 📝 Best Practices

1. **Always validate inputs** - Use Zod for runtime type checking
2. **Handle errors gracefully** - Wrap operations in try-catch
3. **Use async/await** - Never block the event loop
4. **Log to stderr** - Never use `console.log()` in server code
5. **Type your arguments** - Use TypeScript types for safety
6. **Document your tools** - Clear descriptions help Claude use tools correctly

## 🤝 Contributing

This is a learning project and base template for MCP servers. Feel free to:

- Fork and customize for your needs
- Share improvements and extensions
- Report issues or suggestions
- Create pull requests

## 📄 License

MIT License - feel free to use this project as a foundation for your own MCP servers.

## 🔗 Resources

- **MCP Specification**: https://modelcontextprotocol.io
- **MCP SDK**: https://github.com/anthropics/anthropic-sdk-typescript
- **Claude Documentation**: https://docs.anthropic.com
- **TypeScript**: https://www.typescriptlang.org
- **Zod**: https://zod.dev

## 🎉 What's Next?

1. ✅ Complete the [Quick Start](QUICKSTART.md)
2. ✅ Read the [Documentation](DOCUMENTATION.md) to understand MCP
3. ✅ Follow the [Tutorial](TUTORIAL.md) to build custom tools
4. ✅ Use the [API Reference](API_REFERENCE.md) while coding
5. ✅ Check [Troubleshooting](TROUBLESHOOTING.md) if you get stuck
6. ✅ Build something amazing!

## 💡 Example Use Cases

This server can be extended to:

- **Development Tools**: Code generation, refactoring, testing
- **Project Management**: Issue tracking, sprint planning, documentation
- **Data Processing**: File conversion, data analysis, report generation
- **API Integration**: Connect to GitHub, Jira, Slack, etc.
- **Automation**: Build scripts, deployment tools, monitoring
- **Content Creation**: Blog posts, documentation, marketing materials

## 🙏 Acknowledgments

Built with:
- Anthropic's Model Context Protocol
- The TypeScript and Node.js communities
- Developers exploring AI-powered development tools

---

**Happy building! 🚀**

For questions or issues, please check the documentation files or create an issue in this repository.
