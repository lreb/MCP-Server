# Local Development MCP Server

A Model Context Protocol (MCP) server that provides tools for local development, task management, and document generation.

## Features

- **File Operations**: Read, write, and list files and directories
- **Task Management**: Create, list, and update tasks/issues
- **Document Generation**: Generate markdown documents and README templates

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Available Tools

### File Operations

- `read-file`: Read contents of a file
- `write-file`: Write content to a file
- `list-directory`: List directory contents

### Task Management

- `create-task`: Create a new task
- `list-tasks`: List all tasks (filterable by status)
- `update-task-status`: Update task status

### Document Generation

- `generate-markdown-doc`: Generate structured markdown documents
- `generate-readme`: Generate README.md templates

## Configuration

To use this MCP server with VS Code or other MCP clients, add it to your MCP configuration:

```json
{
  "mcpServers": {
    "local-dev": {
      "command": "node",
      "args": ["path/to/dist/index.js"]
    }
  }
}
```

## Development

This server uses:
- TypeScript for type safety
- Zod for schema validation
- MCP SDK for protocol implementation

## License

MIT
