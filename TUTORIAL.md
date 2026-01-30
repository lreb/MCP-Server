# Building Custom MCP Tools - Tutorial

This tutorial walks you through creating various types of MCP tools, from simple to advanced.

## Table of Contents

1. [Simple Text Tool](#1-simple-text-tool)
2. [Tool with Validation](#2-tool-with-validation)
3. [File System Tool](#3-file-system-tool)
4. [External API Integration](#4-external-api-integration)
5. [Stateful Tool](#5-stateful-tool)
6. [Async Operations](#6-async-operations)
7. [Error Handling Patterns](#7-error-handling-patterns)
8. [Best Practices](#8-best-practices)

---

## 1. Simple Text Tool

Let's create a tool that converts text to different cases.

### Step 1: Define the Tool

Add to `TOOLS` array:

```typescript
{
  name: 'convert-case',
  description: 'Convert text to different cases (uppercase, lowercase, title case)',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to convert'
      },
      case: {
        type: 'string',
        enum: ['upper', 'lower', 'title'],
        description: 'Target case format'
      }
    },
    required: ['text', 'case']
  }
}
```

### Step 2: Implement the Handler

Add to `CallToolRequestSchema` handler:

```typescript
if (name === 'convert-case') {
  const { text, case: targetCase } = args as { 
    text: string; 
    case: 'upper' | 'lower' | 'title' 
  };
  
  let result: string;
  
  switch (targetCase) {
    case 'upper':
      result = text.toUpperCase();
      break;
    case 'lower':
      result = text.toLowerCase();
      break;
    case 'title':
      result = text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      break;
    default:
      result = text;
  }
  
  return {
    content: [{
      type: 'text',
      text: result
    }]
  };
}
```

### Step 3: Test

```bash
npm run build
# Restart Claude

# In Claude:
# "Convert 'hello world' to title case using convert-case"
# Expected: "Hello World"
```

---

## 2. Tool with Validation

Add input validation using Zod for safer, more robust tools.

### Step 1: Define Zod Schema

At the top of your file:

```typescript
import { z } from 'zod';

const EmailValidatorSchema = z.object({
  email: z.string().email('Invalid email format')
});

type EmailValidatorInput = z.infer<typeof EmailValidatorSchema>;
```

### Step 2: Define Tool

```typescript
{
  name: 'validate-email',
  description: 'Validate if a string is a properly formatted email',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'Email address to validate'
      }
    },
    required: ['email']
  }
}
```

### Step 3: Implement with Validation

```typescript
if (name === 'validate-email') {
  try {
    // Validate input using Zod
    const { email } = EmailValidatorSchema.parse(args);
    
    return {
      content: [{
        type: 'text',
        text: `✓ "${email}" is a valid email address`
      }]
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [{
          type: 'text',
          text: `✗ Invalid: ${error.errors[0].message}`
        }],
        isError: true
      };
    }
    throw error;
  }
}
```

### Why Zod?

- Runtime type checking
- Clear error messages
- Automatic type inference
- Composable validators

---

## 3. File System Tool

Create a tool that searches for files by pattern.

### Step 1: Import Required Modules

```typescript
import { promises as fs } from 'fs';
import { join } from 'path';
```

### Step 2: Define Tool

```typescript
{
  name: 'search-files',
  description: 'Search for files matching a pattern in a directory',
  inputSchema: {
    type: 'object',
    properties: {
      directory: {
        type: 'string',
        description: 'Directory to search in'
      },
      pattern: {
        type: 'string',
        description: 'File name pattern (supports wildcards like *.js)'
      },
      recursive: {
        type: 'boolean',
        description: 'Search subdirectories recursively',
        default: false
      }
    },
    required: ['directory', 'pattern']
  }
}
```

### Step 3: Implement Search Logic

```typescript
if (name === 'search-files') {
  const { directory, pattern, recursive = false } = args as {
    directory: string;
    pattern: string;
    recursive?: boolean;
  };
  
  const results: string[] = [];
  
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  
  async function searchDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory() && recursive) {
        await searchDir(fullPath);
      } else if (entry.isFile() && regex.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }
  
  await searchDir(directory);
  
  if (results.length === 0) {
    return {
      content: [{
        type: 'text',
        text: `No files matching "${pattern}" found in ${directory}`
      }]
    };
  }
  
  return {
    content: [{
      type: 'text',
      text: `Found ${results.length} file(s):\n\n${results.join('\n')}`
    }]
  };
}
```

### Security Tip

Always validate paths to prevent directory traversal:

```typescript
import { resolve, relative } from 'path';

const basePath = resolve(directory);
const safePath = resolve(join(basePath, relativePath));

if (!safePath.startsWith(basePath)) {
  throw new Error('Invalid path: directory traversal detected');
}
```

---

## 4. External API Integration

Create a tool that fetches data from an external API.

### Example: Currency Converter

### Step 1: Install fetch (if needed)

```bash
npm install node-fetch@2
```

### Step 2: Define Tool

```typescript
{
  name: 'convert-currency',
  description: 'Convert between currencies using live exchange rates',
  inputSchema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'Amount to convert'
      },
      from: {
        type: 'string',
        description: 'Source currency code (e.g., USD)'
      },
      to: {
        type: 'string',
        description: 'Target currency code (e.g., EUR)'
      }
    },
    required: ['amount', 'from', 'to']
  }
}
```

### Step 3: Implement API Call

```typescript
if (name === 'convert-currency') {
  const { amount, from, to } = args as {
    amount: number;
    from: string;
    to: string;
  };
  
  try {
    // Using a free exchange rate API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const rate = data.rates[to];
    
    if (!rate) {
      throw new Error(`Currency ${to} not found`);
    }
    
    const converted = amount * rate;
    
    return {
      content: [{
        type: 'text',
        text: `${amount} ${from} = ${converted.toFixed(2)} ${to}\n` +
              `Exchange rate: 1 ${from} = ${rate.toFixed(4)} ${to}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error converting currency: ${error.message}`
      }],
      isError: true
    };
  }
}
```

### Best Practices for API Tools

1. **Handle rate limiting**
2. **Cache responses when appropriate**
3. **Provide meaningful error messages**
4. **Validate API responses**
5. **Use environment variables for API keys**

### Example with Caching

```typescript
const cache = new Map<string, { data: any; expires: number }>();

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any, ttlMs: number = 3600000) {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs
  });
}

// In your API call
const cacheKey = `${from}-${to}`;
const cached = getCached(cacheKey);
if (cached) {
  // Use cached data
} else {
  // Fetch from API and cache
  const data = await fetchFromAPI();
  setCache(cacheKey, data);
}
```

---

## 5. Stateful Tool

Create a tool that maintains state across calls (like our task manager).

### Example: Simple Counter

### Step 1: Define State Storage

```typescript
// At the top level of your file
const counters = new Map<string, number>();
```

### Step 2: Define Tools

```typescript
{
  name: 'counter-increment',
  description: 'Increment a named counter',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Counter name'
      },
      amount: {
        type: 'number',
        description: 'Amount to increment by',
        default: 1
      }
    },
    required: ['name']
  }
},
{
  name: 'counter-get',
  description: 'Get the current value of a counter',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Counter name'
      }
    },
    required: ['name']
  }
},
{
  name: 'counter-reset',
  description: 'Reset a counter to zero',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Counter name'
      }
    },
    required: ['name']
  }
}
```

### Step 3: Implement State Operations

```typescript
if (name === 'counter-increment') {
  const { name: counterName, amount = 1 } = args as {
    name: string;
    amount?: number;
  };
  
  const current = counters.get(counterName) || 0;
  const newValue = current + amount;
  counters.set(counterName, newValue);
  
  return {
    content: [{
      type: 'text',
      text: `Counter "${counterName}": ${current} → ${newValue}`
    }]
  };
}

if (name === 'counter-get') {
  const { name: counterName } = args as { name: string };
  const value = counters.get(counterName) || 0;
  
  return {
    content: [{
      type: 'text',
      text: `Counter "${counterName}": ${value}`
    }]
  };
}

if (name === 'counter-reset') {
  const { name: counterName } = args as { name: string };
  counters.delete(counterName);
  
  return {
    content: [{
      type: 'text',
      text: `Counter "${counterName}" reset to 0`
    }]
  };
}
```

### Making State Persistent

To save state to disk:

```typescript
import { promises as fs } from 'fs';

const STATE_FILE = './counter-state.json';

// Load state on startup
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    const saved = JSON.parse(data);
    Object.entries(saved).forEach(([key, value]) => {
      counters.set(key, value as number);
    });
  } catch {
    // File doesn't exist yet
  }
}

// Save state after changes
async function saveState() {
  const data = Object.fromEntries(counters);
  await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2));
}

// Call loadState() in main()
// Call saveState() after each state change
```

---

## 6. Async Operations

Handle long-running operations properly.

### Example: File Hash Calculator

```typescript
import { createHash } from 'crypto';
import { createReadStream } from 'fs';

{
  name: 'hash-file',
  description: 'Calculate cryptographic hash of a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to file'
      },
      algorithm: {
        type: 'string',
        enum: ['md5', 'sha1', 'sha256', 'sha512'],
        description: 'Hash algorithm',
        default: 'sha256'
      }
    },
    required: ['path']
  }
}

if (name === 'hash-file') {
  const { path, algorithm = 'sha256' } = args as {
    path: string;
    algorithm?: string;
  };
  
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = createReadStream(path);
    
    stream.on('data', chunk => hash.update(chunk));
    
    stream.on('end', () => {
      const digest = hash.digest('hex');
      resolve({
        content: [{
          type: 'text',
          text: `${algorithm.toUpperCase()} hash of ${path}:\n${digest}`
        }]
      });
    });
    
    stream.on('error', error => {
      reject({
        content: [{
          type: 'text',
          text: `Error hashing file: ${error.message}`
        }],
        isError: true
      });
    });
  });
}
```

### Progress Reporting (Advanced)

For very long operations, you might want to report progress:

```typescript
// This is a conceptual example - MCP doesn't natively support progress
// But you could log to stderr which Claude can see

async function processLargeFile(path: string) {
  const stats = await fs.stat(path);
  const totalSize = stats.size;
  let processed = 0;
  
  // Process in chunks
  const chunkSize = 1024 * 1024; // 1MB chunks
  
  for (let offset = 0; offset < totalSize; offset += chunkSize) {
    await processChunk(path, offset, chunkSize);
    processed += chunkSize;
    
    const percent = Math.min(100, (processed / totalSize) * 100);
    console.error(`Progress: ${percent.toFixed(1)}%`);
  }
}
```

---

## 7. Error Handling Patterns

### Pattern 1: Try-Catch with Specific Errors

```typescript
if (name === 'my-tool') {
  try {
    // Your logic here
    return { content: [{ type: 'text', text: 'Success' }] };
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
    
    if (error.code === 'ENOENT') {
      return {
        content: [{
          type: 'text',
          text: 'File not found'
        }],
        isError: true
      };
    }
    
    // Generic error
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
}
```

### Pattern 2: Custom Error Types

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class APIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'APIError';
  }
}

// Usage
if (!isValid(input)) {
  throw new ValidationError('Input must be positive');
}

// In catch block
if (error instanceof ValidationError) {
  return { content: [{ type: 'text', text: `Invalid: ${error.message}` }], isError: true };
}
if (error instanceof APIError) {
  return { content: [{ type: 'text', text: `API Error (${error.statusCode}): ${error.message}` }], isError: true };
}
```

### Pattern 3: Result Type

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

async function safeOperation(): Promise<Result<string>> {
  try {
    const data = await riskyOperation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Usage in tool
const result = await safeOperation();
if (!result.success) {
  return { 
    content: [{ type: 'text', text: result.error }], 
    isError: true 
  };
}
return { content: [{ type: 'text', text: result.data }] };
```

---

## 8. Best Practices

### 1. Clear, Descriptive Names

❌ Bad:
```typescript
{ name: 'do-thing', description: 'Does a thing' }
```

✅ Good:
```typescript
{ name: 'convert-markdown-to-html', description: 'Convert markdown text to HTML format' }
```

### 2. Comprehensive Input Schemas

❌ Bad:
```typescript
inputSchema: {
  type: 'object',
  properties: {
    data: { type: 'string' }
  }
}
```

✅ Good:
```typescript
inputSchema: {
  type: 'object',
  properties: {
    markdown: {
      type: 'string',
      description: 'Markdown-formatted text to convert',
      minLength: 1
    },
    sanitize: {
      type: 'boolean',
      description: 'Whether to sanitize HTML output to prevent XSS',
      default: true
    }
  },
  required: ['markdown']
}
```

### 3. Helpful Error Messages

❌ Bad:
```typescript
throw new Error('Invalid input');
```

✅ Good:
```typescript
throw new Error(
  `Invalid email format: "${email}". ` +
  `Expected format: user@domain.com`
);
```

### 4. Return Structured Results

❌ Bad:
```typescript
return { content: [{ type: 'text', text: 'done' }] };
```

✅ Good:
```typescript
return {
  content: [{
    type: 'text',
    text: `File saved successfully!\n\n` +
          `Location: ${filePath}\n` +
          `Size: ${fileSize} bytes\n` +
          `Created: ${new Date().toISOString()}`
  }]
};
```

### 5. Document Complex Logic

```typescript
if (name === 'complex-calculation') {
  const { values } = args as { values: number[] };
  
  // Calculate weighted average using exponential decay
  // More recent values have higher weight
  // Formula: Σ(value * e^(-k*index)) / Σ(e^(-k*index))
  const k = 0.1; // Decay constant
  let weightedSum = 0;
  let weightSum = 0;
  
  values.forEach((value, index) => {
    const weight = Math.exp(-k * index);
    weightedSum += value * weight;
    weightSum += weight;
  });
  
  const result = weightedSum / weightSum;
  
  return {
    content: [{
      type: 'text',
      text: `Weighted average: ${result.toFixed(2)}`
    }]
  };
}
```

### 6. Unit Testing

Create tests for your tools:

```typescript
// tests/tools.test.ts
import { describe, it, expect } from '@jest/globals';

describe('convert-case tool', () => {
  it('should convert to uppercase', () => {
    const result = convertCase('hello', 'upper');
    expect(result).toBe('HELLO');
  });
  
  it('should convert to title case', () => {
    const result = convertCase('hello world', 'title');
    expect(result).toBe('Hello World');
  });
});
```

---

## Complete Example: Advanced Tool

Here's a complete example combining many concepts:

```typescript
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';

// Schema
const AnalyzeCodeSchema = z.object({
  path: z.string(),
  language: z.enum(['javascript', 'typescript', 'python']),
  metrics: z.array(z.enum(['lines', 'complexity', 'comments'])).default(['lines'])
});

// Tool definition
{
  name: 'analyze-code',
  description: 'Analyze code files and provide metrics',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to code file'
      },
      language: {
        type: 'string',
        enum: ['javascript', 'typescript', 'python'],
        description: 'Programming language'
      },
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['lines', 'complexity', 'comments']
        },
        description: 'Metrics to calculate',
        default: ['lines']
      }
    },
    required: ['path', 'language']
  }
}

// Implementation
if (name === 'analyze-code') {
  try {
    const input = AnalyzeCodeSchema.parse(args);
    const { path, language, metrics } = input;
    
    // Read file
    const code = await fs.readFile(path, 'utf-8');
    const lines = code.split('\n');
    
    const results: Record<string, any> = {};
    
    // Calculate requested metrics
    if (metrics.includes('lines')) {
      results.totalLines = lines.length;
      results.codeLines = lines.filter(l => l.trim().length > 0).length;
      results.blankLines = results.totalLines - results.codeLines;
    }
    
    if (metrics.includes('comments')) {
      const commentPatterns: Record<string, RegExp> = {
        javascript: /\/\/.+|\/\*[\s\S]*?\*\//g,
        typescript: /\/\/.+|\/\*[\s\S]*?\*\//g,
        python: /#.+|'''[\s\S]*?'''|"""[\s\S]*?"""/g
      };
      
      const pattern = commentPatterns[language];
      const comments = code.match(pattern) || [];
      results.commentLines = comments.length;
    }
    
    if (metrics.includes('complexity')) {
      // Simple cyclomatic complexity approximation
      const complexityKeywords = ['if', 'else', 'for', 'while', 'case', 'catch'];
      let complexity = 1; // Base complexity
      
      complexityKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        const matches = code.match(regex) || [];
        complexity += matches.length;
      });
      
      results.cyclomaticComplexity = complexity;
    }
    
    // Format output
    const output = Object.entries(results)
      .map(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        return `${label}: ${value}`;
      })
      .join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `Code Analysis for ${path}\n\n${output}`
      }]
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [{
          type: 'text',
          text: `Validation error: ${error.errors.map(e => `${e.path}: ${e.message}`).join(', ')}`
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `Error analyzing code: ${error.message}`
      }],
      isError: true
    };
  }
}
```

---

## Conclusion

You now have a comprehensive toolkit for building MCP tools:

- ✅ Simple text processing
- ✅ Input validation with Zod
- ✅ File system operations
- ✅ External API integration
- ✅ Stateful tools
- ✅ Async operations
- ✅ Error handling patterns
- ✅ Best practices

**Next Steps:**
1. Experiment with these patterns
2. Combine them to build complex tools
3. Share your creations with the community!

Happy tool building! 🛠️
