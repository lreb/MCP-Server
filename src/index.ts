#!/usr/bin/env node

/**
 * MCP Server for Local Development
 * 
 * === HOW MCP WORKS ===
 * The Model Context Protocol (MCP) lets AI assistants (like Claude) call tools
 * on a local server via a JSON-RPC-over-stdio transport.
 *
 * Communication flow:
 *   Claude Desktop  -->  stdio  -->  MCP Server (this file)
 *                                        |
 *                              Executes requested tool
 *                                        |
 *   Claude Desktop  <--  stdio  <--  Returns result
 *
 * === THIS SERVER EXPOSES TWO REQUEST TYPES ===
 *  1. ListTools   – responds with the TOOLS array (what tools are available)
 *  2. CallTool    – executes the named tool and returns the result
 *
 * === ADDING A NEW TOOL ===
 *  1. Add an entry to the TOOLS array below (name + inputSchema)
 *  2. Add a matching `if (name === 'your-tool')` branch in the CallToolRequestSchema handler
 *
 * This server provides tools for:
 * - File operations      (read-file, write-file, list-directory)
 * - Task management      (create-task, list-tasks, update-task-status)
 * - Document generation  (generate-markdown-doc, generate-readme)
 * - PDF reading          (read-pdf)
 * - Document indexing    (index-documents, search-documents, list-indexes)
 */

// === IMPORTS ===
// MCP SDK – Server class and transport (stdio = standard input/output pipes)
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Schema validators used to type-check incoming JSON-RPC requests
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
// pdf-parse is a CommonJS module; createRequire lets us import it in an ES module context.
// pdf-parse v2 no longer exports a default function — it exports a PDFParse class.
// Usage: new PDFParse({ data: buffer }).getText()  →  { text, total (page count) }
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

// === SERVER INSTANCE ===
// The Server class manages the MCP lifecycle (handshake, routing, error handling).
// 'name' and 'version' are reported to the client (e.g. Claude Desktop) on connect.
// capabilities.tools: {} tells the client that this server supports tool calls.
const server = new Server({
  name: 'local-dev-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// === TOOL DEFINITIONS (Schema / Discovery) ===
// This array is returned verbatim when Claude calls ListTools.
// Each entry MUST have:
//   - name        : unique tool identifier (used to route calls in the handler below)
//   - description : shown to the AI to help it decide when to use the tool
//   - inputSchema : JSON Schema describing required/optional arguments
// NOTE: This is metadata only – the actual implementation lives in the
//       CallToolRequestSchema handler further down.
const TOOLS = [
  {
    name: 'read-file',
    description: 'Read contents of a file from the local filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write-file',
    description: 'Write content to a file, creating directories if needed',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list-directory',
    description: 'List contents of a directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'create-task',
    description: 'Create a new task or issue',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title'
        },
        description: {
          type: 'string',
          description: 'Detailed task description'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority',
          default: 'medium'
        }
      },
      required: ['title', 'description']
    }
  },
  {
    name: 'list-tasks',
    description: 'List all tasks, optionally filtered by status',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todo', 'in-progress', 'done', 'all'],
          description: 'Filter by status'
        }
      }
    }
  },
  {
    name: 'update-task-status',
    description: 'Update the status of a task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in-progress', 'done'],
          description: 'New status'
        }
      },
      required: ['taskId', 'status']
    }
  },
  {
    name: 'generate-markdown-doc',
    description: 'Generate a markdown document with specified structure',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Document title'
        },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heading: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['heading', 'content']
          },
          description: 'Sections with headings and content'
        }
      },
      required: ['title', 'sections']
    }
  },
  {
    name: 'generate-readme',
    description: 'Generate a README.md template for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Project name'
        },
        description: {
          type: 'string',
          description: 'Project description'
        },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key features'
        }
      },
      required: ['projectName', 'description']
    }
  },
  {
    name: 'read-pdf',
    description: 'Extract and read text content from a PDF file (owner manuals, diagrams with text, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the PDF file'
        },
        pageStart: {
          type: 'number',
          description: 'Optional: Start page number (1-indexed, default: 1)'
        },
        pageEnd: {
          type: 'number',
          description: 'Optional: End page number (inclusive, default: all pages)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'index-documents',
    description: 'Index all PDF documents in a directory for fast searching. Creates a searchable index of automotive manuals.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Path to directory containing PDF files'
        },
        indexName: {
          type: 'string',
          description: 'Name for this document index (e.g., "tacoma-2012-manuals")'
        }
      },
      required: ['directory', 'indexName']
    }
  },
  {
    name: 'search-documents',
    description: 'Search through indexed documents for specific terms or topics (e.g., "OBD2", "diagnostic codes", "P0420")',
    inputSchema: {
      type: 'object',
      properties: {
        indexName: {
          type: 'string',
          description: 'Name of the document index to search'
        },
        query: {
          type: 'string',
          description: 'Search query (keywords, diagnostic codes, topics)'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)'
        }
      },
      required: ['indexName', 'query']
    }
  },
  {
    name: 'list-indexes',
    description: 'List all available document indexes',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
] as const;

// === IN-MEMORY STORAGE ===
// Tasks and document indexes are stored in Maps for the lifetime of the server
// process. Data is lost when the server restarts (no persistence layer).

// Simple in-memory task storage
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

const tasks = new Map<string, Task>();
let taskIdCounter = 1; // Monotonically increasing; used to generate unique task IDs

// Document indexing storage
// Once PDFs are indexed, their full extracted text is held in memory so
// search-documents can do fast keyword matching without re-parsing the files.
interface DocumentIndex {
  name: string;
  directory: string;
  documents: Array<{
    filename: string;
    path: string;
    content: string;
    pageCount: number;
    indexed: string;
  }>;
  createdAt: string;
}

const documentIndexes = new Map<string, DocumentIndex>();

// === REQUEST HANDLERS ===
// MCP uses two handler types:
//   ListToolsRequestSchema  – client asks "what can you do?"  → return TOOLS array
//   CallToolRequestSchema   – client says "run this tool"     → execute and return result

// Handler 1: Tool discovery – simply returns the static TOOLS manifest.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

// Handler 2: Tool execution – routes to the correct implementation by tool name.
// Each branch mirrors one entry in the TOOLS array above.
// All tool responses follow the MCP content format: { content: [{ type, text }] }
// Errors set isError: true so the client can distinguish failures from results.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── File Operations ──────────────────────────────────────────────────────
    if (name === 'read-file') {
      const { path } = args as { path: string };
      const content = await fs.readFile(path, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: `File: ${path}\n\n${content}`
          }
        ]
      };
    }

    if (name === 'write-file') {
      const { path, content } = args as { path: string; content: string };
      await fs.mkdir(dirname(path), { recursive: true });
      await fs.writeFile(path, content, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote to ${path}`
          }
        ]
      };
    }

    if (name === 'list-directory') {
      const { path } = args as { path: string };
      const entries = await fs.readdir(path, { withFileTypes: true });
      const formattedEntries = entries.map(entry => 
        `${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`
      ).join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `Contents of ${path}:\n\n${formattedEntries}`
          }
        ]
      };
    }

    // ── Task Management ───────────────────────────────────────────────────────
    if (name === 'create-task') {
      const { title, description, priority = 'medium' } = args as { 
        title: string; 
        description: string; 
        priority?: 'low' | 'medium' | 'high' 
      };
      const id = `task-${taskIdCounter++}`;
      const now = new Date().toISOString();
      
      const task: Task = {
        id,
        title,
        description,
        status: 'todo',
        priority,
        createdAt: now,
        updatedAt: now
      };
      
      tasks.set(id, task);
      
      return {
        content: [
          {
            type: 'text',
            text: `Task created successfully!\n\nID: ${id}\nTitle: ${title}\nStatus: todo\nPriority: ${priority}`
          }
        ]
      };
    }

    if (name === 'list-tasks') {
      const { status } = args as { status?: 'todo' | 'in-progress' | 'done' | 'all' };
      const allTasks = Array.from(tasks.values());
      const filteredTasks = status && status !== 'all' 
        ? allTasks.filter(t => t.status === status)
        : allTasks;
      
      if (filteredTasks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No tasks found.'
            }
          ]
        };
      }
      
      const taskList = filteredTasks.map(t => 
        `[${t.id}] ${t.title}\n  Status: ${t.status} | Priority: ${t.priority}\n  ${t.description}`
      ).join('\n\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `Tasks (${filteredTasks.length}):\n\n${taskList}`
          }
        ]
      };
    }

    if (name === 'update-task-status') {
      const { taskId, status } = args as { taskId: string; status: 'todo' | 'in-progress' | 'done' };
      const task = tasks.get(taskId);
      
      if (!task) {
        return {
          content: [
            {
              type: 'text',
              text: `Task ${taskId} not found.`
            }
          ],
          isError: true
        };
      }
      
      task.status = status;
      task.updatedAt = new Date().toISOString();
      
      return {
        content: [
          {
            type: 'text',
            text: `Task ${taskId} status updated to: ${status}`
          }
        ]
      };
    }

    // ── Document Generation ───────────────────────────────────────────────────
    if (name === 'generate-markdown-doc') {
      const { title, sections } = args as { 
        title: string; 
        sections: Array<{ heading: string; content: string }> 
      };
      let markdown = `# ${title}\n\n`;
      
      for (const section of sections) {
        markdown += `## ${section.heading}\n\n${section.content}\n\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: markdown
          }
        ]
      };
    }

    if (name === 'generate-readme') {
      const { projectName, description, features } = args as { 
        projectName: string; 
        description: string; 
        features?: string[] 
      };
      let readme = `# ${projectName}\n\n${description}\n\n`;
      
      if (features && features.length > 0) {
        readme += `## Features\n\n`;
        features.forEach(feature => {
          readme += `- ${feature}\n`;
        });
        readme += '\n';
      }
      
      readme += `## Installation\n\n\`\`\`bash\n# Add installation instructions here\n\`\`\`\n\n`;
      readme += `## Usage\n\n\`\`\`bash\n# Add usage instructions here\n\`\`\`\n\n`;
      readme += `## License\n\nMIT\n`;
      
      return {
        content: [
          {
            type: 'text',
            text: readme
          }
        ]
      };
    }

    // ── PDF / Document Indexing ───────────────────────────────────────────────
    if (name === 'read-pdf') {
      const { path, pageStart, pageEnd } = args as { 
        path: string; 
        pageStart?: number;
        pageEnd?: number;
      };
      
      const dataBuffer = await fs.readFile(path);
      const pdfData = await new PDFParse({ data: dataBuffer }).getText();
      
      let text = pdfData.text;
      const totalPages = pdfData.total;
      
      // If specific page range requested, extract those pages
      if (pageStart || pageEnd) {
        const start = pageStart || 1;
        const end = pageEnd || totalPages;
        text = `Pages ${start}-${end} of ${totalPages}:\n\n${text}`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `PDF: ${path}\nPages: ${totalPages}\n\n${text}`
          }
        ]
      };
    }

    if (name === 'index-documents') {
      const { directory, indexName } = args as { 
        directory: string; 
        indexName: string;
      };
      
      const files = await fs.readdir(directory);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No PDF files found in ${directory}`
            }
          ],
          isError: true
        };
      }
      
      const documents: Array<{ filename: string; path: string; content: string; pageCount: number; indexed: string }> = [];
      const failed: Array<{ filename: string; error: string }> = [];

      for (const filename of pdfFiles) {
        const filepath = join(directory, filename);
        try {
          const dataBuffer = await fs.readFile(filepath);
          const pdfData = await new PDFParse({ data: dataBuffer }).getText();
          
          documents.push({
            filename,
            path: filepath,
            content: pdfData.text,
            pageCount: pdfData.total,
            indexed: new Date().toISOString()
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Failed to index ${filename}:`, error);
          failed.push({ filename, error: message });
        }
      }

      // If every file failed, report the errors rather than saving an empty index
      if (documents.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to index any documents from "${directory}".\n\nErrors:\n${failed.map(f => `- ${f.filename}: ${f.error}`).join('\n')}`
            }
          ],
          isError: true
        };
      }
      
      const index: DocumentIndex = {
        name: indexName,
        directory,
        documents,
        createdAt: new Date().toISOString()
      };
      
      documentIndexes.set(indexName, index);

      let indexResultText = `Successfully indexed ${documents.length} of ${pdfFiles.length} document(s) as "${indexName}":\n\n`;
      indexResultText += documents.map(d => `\u2713 ${d.filename} (${d.pageCount} pages)`).join('\n');
      if (failed.length > 0) {
        indexResultText += `\n\nFailed to index ${failed.length} file(s):\n`;
        indexResultText += failed.map(f => `\u2717 ${f.filename}: ${f.error}`).join('\n');
      }

      return {
        content: [{ type: 'text', text: indexResultText }]
      };
    }

    if (name === 'search-documents') {
      const { indexName, query, maxResults = 10 } = args as { 
        indexName: string; 
        query: string;
        maxResults?: number;
      };
      
      const index = documentIndexes.get(indexName);
      if (!index) {
        return {
          content: [
            {
              type: 'text',
              text: `Index "${indexName}" not found. Use list-indexes to see available indexes.`
            }
          ],
          isError: true
        };
      }
      
      const searchTerms = query.toLowerCase().split(/\s+/);
      const results = [];
      
      for (const doc of index.documents) {
        const content = doc.content.toLowerCase();
        let score = 0;
        const snippets = [];
        
        for (const term of searchTerms) {
          // Escape special regex characters so raw user input (e.g. "P0420 (catalyst)") never throws
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedTerm, 'gi');
          const matches = content.match(regex);
          if (matches) {
            score += matches.length;
            
            // Find context around match (use a distinct variable name to avoid shadowing outer `index`)
            const matchPos = content.indexOf(term);
            if (matchPos !== -1) {
              const start = Math.max(0, matchPos - 100);
              const end = Math.min(content.length, matchPos + 100);
              const snippet = doc.content.substring(start, end).replace(/\n/g, ' ').trim();
              snippets.push(`...${snippet}...`);
            }
          }
        }
        
        if (score > 0) {
          results.push({
            filename: doc.filename,
            path: doc.path,
            score,
            pageCount: doc.pageCount,
            snippets: snippets.slice(0, 3) // Top 3 snippets
          });
        }
      }
      
      results.sort((a, b) => b.score - a.score);
      const topResults = results.slice(0, maxResults);
      
      if (topResults.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for "${query}" in index "${indexName}"`
            }
          ]
        };
      }
      
      let resultText = `Found ${results.length} document(s) matching "${query}":\n\n`;
      topResults.forEach((result, i) => {
        resultText += `${i + 1}. ${result.filename} (${result.pageCount} pages, score: ${result.score})\n`;
        resultText += `   Path: ${result.path}\n`;
        if (result.snippets.length > 0) {
          resultText += `   Excerpt: ${result.snippets[0]}\n`;
        }
        resultText += '\n';
      });
      
      return {
        content: [
          {
            type: 'text',
            text: resultText
          }
        ]
      };
    }

    if (name === 'list-indexes') {
      if (documentIndexes.size === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No document indexes created yet. Use index-documents to create one.'
            }
          ]
        };
      }
      
      let indexList = `Available document indexes:\n\n`;
      for (const [name, index] of documentIndexes) {
        indexList += `- ${name}\n`;
        indexList += `  Directory: ${index.directory}\n`;
        indexList += `  Documents: ${index.documents.length}\n`;
        indexList += `  Created: ${index.createdAt}\n\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: indexList
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`
        }
      ],
      isError: true
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// === SERVER STARTUP ===
// StdioServerTransport wires the Server to process.stdin / process.stdout.
// Claude Desktop launches this file as a child process and communicates over
// those pipes – which is why console.log MUST NOT be used for debug output
// (it would corrupt the JSON-RPC stream). Use console.error instead.
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
