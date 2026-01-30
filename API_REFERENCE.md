# MCP Server API Reference

Complete technical reference for the `local-dev` MCP server.

## Table of Contents

1. [Server Configuration](#server-configuration)
2. [Tool Definitions](#tool-definitions)
3. [Request/Response Formats](#requestresponse-formats)
4. [Type Definitions](#type-definitions)
5. [Error Codes](#error-codes)
6. [Environment Variables](#environment-variables)

---

## Server Configuration

### Server Instance

```typescript
const server = new Server(
  serverInfo: ServerInfo,
  serverOptions: ServerOptions
)
```

#### ServerInfo

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Server identifier (e.g., "local-dev-mcp-server") |
| `version` | string | Semantic version (e.g., "1.0.0") |

#### ServerOptions

| Property | Type | Description |
|----------|------|-------------|
| `capabilities` | Capabilities | Declares server capabilities |

#### Capabilities

```typescript
{
  tools?: {}           // Supports tool execution
  resources?: {}       // Supports resource access
  prompts?: {}         // Supports prompt templates
}
```

**Example:**

```typescript
const server = new Server({
  name: 'my-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});
```

---

## Tool Definitions

### Tool Schema

Every tool must follow this structure:

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}
```

### JSONSchema Properties

#### Basic Types

```typescript
{
  type: 'object',
  properties: {
    stringProp: {
      type: 'string',
      description: 'A string parameter',
      minLength?: number,
      maxLength?: number,
      pattern?: string,        // Regex pattern
      format?: string,         // 'email', 'uri', 'date-time', etc.
    },
    numberProp: {
      type: 'number',
      description: 'A number parameter',
      minimum?: number,
      maximum?: number,
      multipleOf?: number,
    },
    integerProp: {
      type: 'integer',
      description: 'An integer parameter',
      minimum?: number,
      maximum?: number,
    },
    booleanProp: {
      type: 'boolean',
      description: 'A boolean parameter',
      default?: boolean,
    },
    arrayProp: {
      type: 'array',
      description: 'An array parameter',
      items: JSONSchema,       // Schema for array items
      minItems?: number,
      maxItems?: number,
      uniqueItems?: boolean,
    },
    objectProp: {
      type: 'object',
      description: 'An object parameter',
      properties: {...},
      required?: string[],
      additionalProperties?: boolean,
    }
  },
  required: string[],          // Required property names
  additionalProperties?: boolean
}
```

#### Enums

```typescript
{
  type: 'string',
  enum: ['option1', 'option2', 'option3'],
  description: 'Choose one option',
  default?: 'option1'
}
```

#### Nested Objects

```typescript
{
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0 }
      },
      required: ['name', 'email']
    }
  }
}
```

---

## Request/Response Formats

### ListToolsRequest

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "tool-name",
        "description": "Tool description",
        "inputSchema": {
          "type": "object",
          "properties": {...},
          "required": [...]
        }
      }
    ]
  }
}
```

---

### CallToolRequest

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "tool-name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

**Success Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Tool execution result"
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error message"
      }
    ],
    "isError": true
  }
}
```

---

### Content Types

#### Text Content

```typescript
{
  type: 'text',
  text: string
}
```

#### Image Content

```typescript
{
  type: 'image',
  data: string,        // Base64-encoded image
  mimeType: string     // e.g., 'image/png'
}
```

#### Resource Content

```typescript
{
  type: 'resource',
  resource: {
    uri: string,
    mimeType?: string,
    text?: string,
    blob?: string      // Base64-encoded binary
  }
}
```

---

## Type Definitions

### Core Types

```typescript
// Request handler types
type ListToolsHandler = () => Promise<{ tools: Tool[] }>;

type CallToolHandler = (request: {
  params: {
    name: string;
    arguments: Record<string, any>;
  }
}) => Promise<ToolResult>;

// Response types
interface ToolResult {
  content: Content[];
  isError?: boolean;
}

type Content = TextContent | ImageContent | ResourceContent;

interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

interface ResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}
```

### Task Types (Example)

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;     // ISO 8601 timestamp
  updatedAt: string;     // ISO 8601 timestamp
}
```

### File Operation Types

```typescript
interface FileStats {
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: string;
}

interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}
```

---

## Error Codes

### Tool Execution Errors

| Code | Type | Description |
|------|------|-------------|
| `TOOL_NOT_FOUND` | Error | Requested tool doesn't exist |
| `INVALID_PARAMS` | Error | Tool parameters don't match schema |
| `EXECUTION_ERROR` | Error | Error during tool execution |
| `TIMEOUT` | Error | Tool execution exceeded time limit |

### File System Errors

| Code | Type | Description |
|------|------|-------------|
| `ENOENT` | Error | File or directory not found |
| `EACCES` | Error | Permission denied |
| `EISDIR` | Error | Expected file but got directory |
| `ENOTDIR` | Error | Expected directory but got file |
| `EEXIST` | Error | File already exists |

### Validation Errors

| Code | Type | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | ZodError | Input validation failed |
| `SCHEMA_ERROR` | Error | Invalid JSON schema |
| `TYPE_ERROR` | TypeError | Type mismatch |

---

## Environment Variables

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MCP_SERVER_NAME` | string | "local-dev-mcp-server" | Server identifier |
| `MCP_SERVER_VERSION` | string | "1.0.0" | Server version |
| `LOG_LEVEL` | string | "info" | Logging level (debug, info, warn, error) |

### Feature Flags

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_FILE_OPS` | boolean | true | Enable file operation tools |
| `ENABLE_TASKS` | boolean | true | Enable task management tools |
| `ENABLE_DOCS` | boolean | true | Enable document generation tools |

### Performance Tuning

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MAX_FILE_SIZE` | number | 10485760 | Maximum file size in bytes (10MB) |
| `REQUEST_TIMEOUT` | number | 30000 | Request timeout in milliseconds |
| `MAX_CONCURRENT_REQUESTS` | number | 10 | Maximum concurrent tool executions |

### Storage Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATA_DIR` | string | "./data" | Directory for persistent data |
| `TEMP_DIR` | string | "./tmp" | Directory for temporary files |
| `TASK_FILE` | string | "./tasks.json" | Task storage file path |

---

## Handler Reference

### setRequestHandler

Register a handler for a specific request type.

```typescript
server.setRequestHandler(
  schema: RequestSchema,
  handler: HandlerFunction
): void
```

**Parameters:**

- `schema`: Request schema (e.g., `ListToolsRequestSchema`, `CallToolRequestSchema`)
- `handler`: Async function to handle the request

**Example:**

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // Handle tool call
  return { content: [...] };
});
```

---

## Transport Reference

### StdioServerTransport

Handles standard input/output communication.

```typescript
const transport = new StdioServerTransport();
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `start()` | Promise<void> | Start listening for messages |
| `close()` | Promise<void> | Stop transport and clean up |

**Usage:**

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Server running on stdio');
```

**Note:** Use `console.error()` for logging because `console.log()` interferes with stdio transport.

---

## Validation Helpers

### Using Zod

```typescript
import { z } from 'zod';

// Define schema
const MySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['user', 'admin', 'guest']),
});

// Infer TypeScript type
type MyType = z.infer<typeof MySchema>;

// Validate data
try {
  const validated = MySchema.parse(data);
  // Use validated data (fully typed)
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation error
    const messages = error.errors.map(e => e.message);
  }
}

// Safe parse (doesn't throw)
const result = MySchema.safeParse(data);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

### Common Zod Validators

```typescript
// Strings
z.string()
  .min(5)
  .max(100)
  .email()
  .url()
  .uuid()
  .regex(/^[A-Z]+$/)
  .startsWith('prefix')
  .endsWith('suffix')
  .toLowerCase()
  .trim()

// Numbers
z.number()
  .int()
  .positive()
  .negative()
  .min(0)
  .max(100)
  .multipleOf(5)

// Arrays
z.array(z.string())
  .min(1)
  .max(10)
  .nonempty()

// Objects
z.object({
  name: z.string(),
  nested: z.object({
    value: z.number()
  })
})

// Unions
z.union([z.string(), z.number()])

// Enums
z.enum(['option1', 'option2'])

// Optionals
z.string().optional()
z.string().nullable()
z.string().nullish() // null or undefined

// Defaults
z.string().default('default value')

// Transformations
z.string().transform(s => s.toUpperCase())
```

---

## Best Practices

### 1. Type Safety

Always use TypeScript types for tool arguments:

```typescript
// ✓ Good
const { path, content } = args as { path: string; content: string };

// ✗ Bad
const path = args.path;
const content = args.content;
```

### 2. Error Handling

Always wrap tool logic in try-catch:

```typescript
// ✓ Good
try {
  const result = await riskyOperation();
  return { content: [{ type: 'text', text: result }] };
} catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}
```

### 3. Async Operations

Always use async/await for I/O operations:

```typescript
// ✓ Good
const content = await fs.readFile(path, 'utf-8');

// ✗ Bad
fs.readFileSync(path, 'utf-8');  // Blocks event loop
```

### 4. Validation

Validate all inputs, even if schema is defined:

```typescript
// ✓ Good
const schema = z.object({ email: z.string().email() });
const { email } = schema.parse(args);

// ✗ Bad (trusts client-side validation)
const { email } = args as { email: string };
```

### 5. Logging

Use stderr for logs (stdout is for transport):

```typescript
// ✓ Good
console.error('Processing request:', name);

// ✗ Bad
console.log('Processing request:', name);  // Breaks stdio transport
```

---

## Complete Example

Here's a fully-typed, validated, error-handled tool:

```typescript
import { z } from 'zod';
import { promises as fs } from 'fs';

// Schema
const CopyFileSchema = z.object({
  source: z.string().min(1, 'Source path required'),
  destination: z.string().min(1, 'Destination path required'),
  overwrite: z.boolean().default(false)
});

type CopyFileInput = z.infer<typeof CopyFileSchema>;

// Tool definition
{
  name: 'copy-file',
  description: 'Copy a file from source to destination',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Source file path'
      },
      destination: {
        type: 'string',
        description: 'Destination file path'
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite if destination exists',
        default: false
      }
    },
    required: ['source', 'destination']
  }
}

// Implementation
if (name === 'copy-file') {
  try {
    // Validate input
    const input: CopyFileInput = CopyFileSchema.parse(args);
    const { source, destination, overwrite } = input;
    
    console.error(`Copying ${source} to ${destination}`);
    
    // Check source exists
    try {
      await fs.access(source);
    } catch {
      return {
        content: [{
          type: 'text',
          text: `Source file not found: ${source}`
        }],
        isError: true
      };
    }
    
    // Check destination
    if (!overwrite) {
      try {
        await fs.access(destination);
        return {
          content: [{
            type: 'text',
            text: `Destination already exists: ${destination}. Use overwrite: true to replace.`
          }],
          isError: true
        };
      } catch {
        // File doesn't exist, OK to proceed
      }
    }
    
    // Copy file
    await fs.copyFile(source, destination);
    
    // Get file info
    const stats = await fs.stat(destination);
    
    return {
      content: [{
        type: 'text',
        text: `File copied successfully!\n\n` +
              `Source: ${source}\n` +
              `Destination: ${destination}\n` +
              `Size: ${stats.size} bytes`
      }]
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [{
          type: 'text',
          text: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `Error copying file: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
```

---

## Version History

### v1.0.0 (Current)
- Initial release
- File operations tools
- Task management tools
- Document generation tools
- TypeScript implementation
- Zod validation support

---

## Additional Resources

- **MCP Specification**: https://modelcontextprotocol.io/specification
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Zod Documentation**: https://zod.dev
- **Node.js API Reference**: https://nodejs.org/api/

---

**End of API Reference**
