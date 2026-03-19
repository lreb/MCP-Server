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
 * === SQLite PERSISTENCE ===
 * Uses sql.js (SQLite compiled to WebAssembly) — zero native dependencies,
 * works on Windows/macOS/Linux without any build tools.
 *
 * The database is saved to ~/mcp-tasks.db as a binary file and loaded back
 * on every startup, giving full persistence without native compilation.
 *
 * === ADDING A NEW TOOL ===
 *  1. Add an entry to the TOOLS array below (name + inputSchema)
 *  2. Add a matching `if (name === 'your-tool')` branch in the CallToolRequestSchema handler
 */

// === IMPORTS ===
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import os from 'os';
import type { Database } from 'sql.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

// === SQLite DATABASE SETUP (sql.js — pure WebAssembly, no native build needed) ===
//
// sql.js loads SQLite as a WASM binary. Unlike better-sqlite3, it never needs
// node-gyp or Visual Studio Build Tools, so it installs cleanly on all platforms.
//
// Trade-off: the entire DB lives in memory while the server runs. We manually
// save it to disk (~/mcp-tasks.db) after every write operation so data persists
// across restarts. The file is loaded back into memory on startup.

const DB_PATH = join(os.homedir(), 'mcp-tasks.db');

// Dynamically import sql.js (CJS module inside an ESM project)
const initSqlJs = require('sql.js');

// db is initialised in main() before the server starts handling requests
let db: Database;
let taskIdCounter = 1;

/**
 * Persist the in-memory database to disk.
 * Called after every INSERT / UPDATE / DELETE so no data is lost on restart.
 */
async function saveDb(): Promise<void> {
  const data = db.export();
  await fs.writeFile(DB_PATH, Buffer.from(data));
}

/**
 * Initialise sql.js and open (or create) the database file.
 */
async function initDb(): Promise<void> {
  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const fileBuffer = await fs.readFile(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.error(`Task database loaded from: ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.error(`Task database created at: ${DB_PATH}`);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'todo'
                    CHECK(status IN ('todo','in-progress','done')),
      priority    TEXT NOT NULL DEFAULT 'medium'
                    CHECK(priority IN ('low','medium','high')),
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  // Seed the ID counter from the highest existing ID so IDs never repeat
  const result = db.exec(`SELECT MAX(CAST(REPLACE(id,'task-','') AS INTEGER)) as m FROM tasks`);
  const maxId = result[0]?.values[0]?.[0] as number | null ?? 0;
  taskIdCounter = (maxId ?? 0) + 1;

  await saveDb();
}

// === HELPERS ===

/**
 * Run a SELECT and return rows as plain objects.
 *
 * sql.js BindParams typing only exposes the array overload in some @types versions,
 * causing a spurious TS2345 on named-parameter objects. The cast to `any` is
 * intentional and safe — sql.js fully supports $name-style objects at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbAll(sql: string, params: Record<string, any> = {}): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/** Run an INSERT / UPDATE / DELETE */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRun(sql: string, params: Record<string, any> = {}): void {
  const stmt = db.prepare(sql);
  stmt.run(params as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  stmt.free();
}

/** Format a task row as a human-readable string */
function formatTask(t: Record<string, unknown>): string {
  return `[${t['id']}] ${t['title']}\n  Status: ${t['status']} | Priority: ${t['priority']}\n  ${t['description']}\n  Created: ${String(t['created_at']).slice(0, 10)} | Updated: ${String(t['updated_at']).slice(0, 10)}`;
}

// === SERVER INSTANCE ===
const server = new Server({
  name: 'local-dev-mcp-server',
  version: '2.0.0',
}, {
  capabilities: { tools: {} },
});

// === TOOL DEFINITIONS ===
const TOOLS = [
  // ── File Operations ──────────────────────────────────────────────────────
  {
    name: 'read-file',
    description: 'Read contents of a file from the local filesystem',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Absolute or relative path to the file' } },
      required: ['path']
    }
  },
  {
    name: 'write-file',
    description: 'Write content to a file, creating directories if needed',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file' },
        content: { type: 'string', description: 'Content to write to the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list-directory',
    description: 'List contents of a directory',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path to the directory' } },
      required: ['path']
    }
  },

  // ── Task Management ───────────────────────────────────────────────────────
  {
    name: 'create-task',
    description: 'Create a new task. Persisted to SQLite — survives server restarts.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Detailed task description' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority (default: medium)',
          default: 'medium'
        }
      },
      required: ['title', 'description']
    }
  },
  {
    name: 'list-tasks',
    description: 'List all tasks, optionally filtered by status. Sorted by priority then creation date.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todo', 'in-progress', 'done', 'all'],
          description: 'Filter by status (default: all)',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'update-task-status',
    description: 'Update the status of an existing task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID (e.g. task-1)' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'New status' }
      },
      required: ['taskId', 'status']
    }
  },
  {
    name: 'delete-task',
    description: 'Permanently delete a task by ID',
    inputSchema: {
      type: 'object',
      properties: { taskId: { type: 'string', description: 'Task ID to delete (e.g. task-3)' } },
      required: ['taskId']
    }
  },
  {
    name: 'search-tasks',
    description: 'Search tasks by keyword in title or description',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Keyword or phrase to search for' } },
      required: ['query']
    }
  },
  {
    name: 'tasks-completed-this-week',
    description: 'Return all tasks completed in the last 7 days. Useful for weekly standups.',
    inputSchema: { type: 'object', properties: {} }
  },

  // ── Document Generation ───────────────────────────────────────────────────
  {
    name: 'generate-markdown-doc',
    description: 'Generate a markdown document with specified structure',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title' },
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
        projectName: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description' },
        features: { type: 'array', items: { type: 'string' }, description: 'Key features' }
      },
      required: ['projectName', 'description']
    }
  },

  // ── PDF / Document Indexing ───────────────────────────────────────────────
  {
    name: 'read-pdf',
    description: 'Extract and read text content from a PDF file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative path to the PDF file' },
        pageStart: { type: 'number', description: 'Optional: Start page (1-indexed)' },
        pageEnd: { type: 'number', description: 'Optional: End page (inclusive)' }
      },
      required: ['path']
    }
  },
  {
    name: 'index-documents',
    description: 'Index all PDF documents in a directory for fast searching',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Path to directory containing PDF files' },
        indexName: { type: 'string', description: 'Name for this document index' }
      },
      required: ['directory', 'indexName']
    }
  },
  {
    name: 'search-documents',
    description: 'Search through indexed documents for specific terms or topics',
    inputSchema: {
      type: 'object',
      properties: {
        indexName: { type: 'string', description: 'Name of the document index to search' },
        query: { type: 'string', description: 'Search query' },
        maxResults: { type: 'number', description: 'Maximum results to return (default: 10)' }
      },
      required: ['indexName', 'query']
    }
  },
  {
    name: 'list-indexes',
    description: 'List all available document indexes',
    inputSchema: { type: 'object', properties: {} }
  }
] as const;

// === IN-MEMORY STORAGE (PDF indexes — not persisted, rebuilt on demand) ===
interface DocumentIndex {
  name: string;
  directory: string;
  documents: Array<{ filename: string; path: string; content: string; pageCount: number; indexed: string }>;
  createdAt: string;
}

const documentIndexes = new Map<string, DocumentIndex>();

// === REQUEST HANDLERS ===

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {

    // ── File Operations ──────────────────────────────────────────────────────
    if (name === 'read-file') {
      const { path } = args as { path: string };
      const content = await fs.readFile(path, 'utf-8');
      return { content: [{ type: 'text', text: `File: ${path}\n\n${content}` }] };
    }

    if (name === 'write-file') {
      const { path, content } = args as { path: string; content: string };
      await fs.mkdir(dirname(path), { recursive: true });
      await fs.writeFile(path, content, 'utf-8');
      return { content: [{ type: 'text', text: `Successfully wrote to ${path}` }] };
    }

    if (name === 'list-directory') {
      const { path } = args as { path: string };
      const entries = await fs.readdir(path, { withFileTypes: true });
      const formatted = entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
      return { content: [{ type: 'text', text: `Contents of ${path}:\n\n${formatted}` }] };
    }

    // ── Task Management (sql.js SQLite) ──────────────────────────────────────

    if (name === 'create-task') {
      const { title, description, priority = 'medium' } = args as {
        title: string; description: string; priority?: 'low' | 'medium' | 'high';
      };
      const id = `task-${taskIdCounter++}`;
      const now = new Date().toISOString();

      dbRun(
        `INSERT INTO tasks (id, title, description, status, priority, created_at, updated_at)
         VALUES ($id, $title, $description, $status, $priority, $created_at, $updated_at)`,
        { $id: id, $title: title, $description: description, $status: 'todo', $priority: priority, $created_at: now, $updated_at: now }
      );
      await saveDb();

      return {
        content: [{
          type: 'text',
          text: `✅ Task created and saved!\n\nID: ${id}\nTitle: ${title}\nStatus: todo\nPriority: ${priority}\nDatabase: ${DB_PATH}`
        }]
      };
    }

    if (name === 'list-tasks') {
      const { status = 'all' } = args as { status?: string };
      const sql = status === 'all'
        ? `SELECT * FROM tasks ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at ASC`
        : `SELECT * FROM tasks WHERE status = $status ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at ASC`;
      const rows = dbAll(sql, status === 'all' ? {} : { $status: status });

      if (rows.length === 0) {
        return { content: [{ type: 'text', text: `No tasks found${status !== 'all' ? ` with status "${status}"` : ''}.` }] };
      }
      return {
        content: [{
          type: 'text',
          text: `Tasks (${rows.length})${status !== 'all' ? ` — filtered: ${status}` : ''}:\n\n${rows.map(formatTask).join('\n\n')}`
        }]
      };
    }

    if (name === 'update-task-status') {
      const { taskId, status } = args as { taskId: string; status: string };
      const existing = dbAll(`SELECT id FROM tasks WHERE id = $id`, { $id: taskId });
      if (existing.length === 0) {
        return { content: [{ type: 'text', text: `Task "${taskId}" not found.` }], isError: true };
      }
      dbRun(`UPDATE tasks SET status = $status, updated_at = $updated_at WHERE id = $id`,
        { $id: taskId, $status: status, $updated_at: new Date().toISOString() });
      await saveDb();
      return { content: [{ type: 'text', text: `✅ Task ${taskId} status updated to: ${status}` }] };
    }

    if (name === 'delete-task') {
      const { taskId } = args as { taskId: string };
      const existing = dbAll(`SELECT id FROM tasks WHERE id = $id`, { $id: taskId });
      if (existing.length === 0) {
        return { content: [{ type: 'text', text: `Task "${taskId}" not found.` }], isError: true };
      }
      dbRun(`DELETE FROM tasks WHERE id = $id`, { $id: taskId });
      await saveDb();
      return { content: [{ type: 'text', text: `🗑️ Task ${taskId} deleted permanently.` }] };
    }

    if (name === 'search-tasks') {
      const { query } = args as { query: string };
      const rows = dbAll(
        `SELECT * FROM tasks WHERE title LIKE $q OR description LIKE $q ORDER BY created_at DESC`,
        { $q: `%${query}%` }
      );
      if (rows.length === 0) {
        return { content: [{ type: 'text', text: `No tasks found matching "${query}".` }] };
      }
      return {
        content: [{
          type: 'text',
          text: `Found ${rows.length} task(s) matching "${query}":\n\n${rows.map(formatTask).join('\n\n')}`
        }]
      };
    }

    if (name === 'tasks-completed-this-week') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const rows = dbAll(
        `SELECT * FROM tasks WHERE status = 'done' AND updated_at >= $since ORDER BY updated_at DESC`,
        { $since: since }
      );
      if (rows.length === 0) {
        return { content: [{ type: 'text', text: 'No tasks completed in the last 7 days.' }] };
      }
      return {
        content: [{
          type: 'text',
          text: `✅ ${rows.length} task(s) completed this week:\n\n${rows.map(formatTask).join('\n\n')}`
        }]
      };
    }

    // ── Document Generation ───────────────────────────────────────────────────
    if (name === 'generate-markdown-doc') {
      const { title, sections } = args as {
        title: string; sections: Array<{ heading: string; content: string }>;
      };
      let markdown = `# ${title}\n\n`;
      for (const section of sections) {
        markdown += `## ${section.heading}\n\n${section.content}\n\n`;
      }
      return { content: [{ type: 'text', text: markdown }] };
    }

    if (name === 'generate-readme') {
      const { projectName, description, features } = args as {
        projectName: string; description: string; features?: string[];
      };
      let readme = `# ${projectName}\n\n${description}\n\n`;
      if (features?.length) {
        readme += `## Features\n\n${features.map(f => `- ${f}`).join('\n')}\n\n`;
      }
      readme += `## Installation\n\n\`\`\`bash\n# Add installation instructions here\n\`\`\`\n\n`;
      readme += `## Usage\n\n\`\`\`bash\n# Add usage instructions here\n\`\`\`\n\n`;
      readme += `## License\n\nMIT\n`;
      return { content: [{ type: 'text', text: readme }] };
    }

    // ── PDF / Document Indexing ───────────────────────────────────────────────
    if (name === 'read-pdf') {
      const { path, pageStart, pageEnd } = args as {
        path: string; pageStart?: number; pageEnd?: number;
      };
      const dataBuffer = await fs.readFile(path);
      const pdfData = await new PDFParse({ data: dataBuffer }).getText();
      let text = pdfData.text;
      const totalPages = pdfData.total;

      if (pageStart || pageEnd) {
        const start = pageStart || 1;
        const end = pageEnd || totalPages;
        text = `Pages ${start}-${end} of ${totalPages}:\n\n${text}`;
      }
      return { content: [{ type: 'text', text: `PDF: ${path}\nPages: ${totalPages}\n\n${text}` }] };
    }

    if (name === 'index-documents') {
      const { directory, indexName } = args as { directory: string; indexName: string };
      const files = await fs.readdir(directory);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        return { content: [{ type: 'text', text: `No PDF files found in ${directory}` }], isError: true };
      }

      const documents: DocumentIndex['documents'] = [];
      const failed: Array<{ filename: string; error: string }> = [];

      for (const filename of pdfFiles) {
        const filepath = join(directory, filename);
        try {
          const dataBuffer = await fs.readFile(filepath);
          const pdfData = await new PDFParse({ data: dataBuffer }).getText();
          documents.push({ filename, path: filepath, content: pdfData.text, pageCount: pdfData.total, indexed: new Date().toISOString() });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Failed to index ${filename}:`, error);
          failed.push({ filename, error: message });
        }
      }

      if (documents.length === 0) {
        return { content: [{ type: 'text', text: `Failed to index any documents.\n\nErrors:\n${failed.map(f => `- ${f.filename}: ${f.error}`).join('\n')}` }], isError: true };
      }

      documentIndexes.set(indexName, { name: indexName, directory, documents, createdAt: new Date().toISOString() });
      let result = `Successfully indexed ${documents.length}/${pdfFiles.length} document(s) as "${indexName}":\n\n`;
      result += documents.map(d => `✓ ${d.filename} (${d.pageCount} pages)`).join('\n');
      if (failed.length > 0) result += `\n\nFailed:\n${failed.map(f => `✗ ${f.filename}: ${f.error}`).join('\n')}`;
      return { content: [{ type: 'text', text: result }] };
    }

    if (name === 'search-documents') {
      const { indexName, query, maxResults = 10 } = args as {
        indexName: string; query: string; maxResults?: number;
      };
      const index = documentIndexes.get(indexName);
      if (!index) {
        return { content: [{ type: 'text', text: `Index "${indexName}" not found. Use list-indexes to see available indexes.` }], isError: true };
      }

      const searchTerms = query.toLowerCase().split(/\s+/);
      const results = [];

      for (const doc of index.documents) {
        const content = doc.content.toLowerCase();
        let score = 0;
        const snippets: string[] = [];

        for (const term of searchTerms) {
          const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const matches = content.match(new RegExp(escaped, 'gi'));
          if (matches) {
            score += matches.length;
            const pos = content.indexOf(term);
            if (pos !== -1) {
              const snippet = doc.content.substring(Math.max(0, pos - 100), Math.min(content.length, pos + 100)).replace(/\n/g, ' ').trim();
              snippets.push(`...${snippet}...`);
            }
          }
        }
        if (score > 0) results.push({ filename: doc.filename, path: doc.path, score, pageCount: doc.pageCount, snippets: snippets.slice(0, 3) });
      }

      results.sort((a, b) => b.score - a.score);
      const top = results.slice(0, maxResults);

      if (top.length === 0) {
        return { content: [{ type: 'text', text: `No results found for "${query}" in index "${indexName}"` }] };
      }

      let resultText = `Found ${results.length} document(s) matching "${query}":\n\n`;
      top.forEach((r, i) => {
        resultText += `${i + 1}. ${r.filename} (${r.pageCount} pages, score: ${r.score})\n   Path: ${r.path}\n`;
        if (r.snippets.length > 0) resultText += `   Excerpt: ${r.snippets[0]}\n`;
        resultText += '\n';
      });
      return { content: [{ type: 'text', text: resultText }] };
    }

    if (name === 'list-indexes') {
      if (documentIndexes.size === 0) {
        return { content: [{ type: 'text', text: 'No document indexes created yet. Use index-documents to create one.' }] };
      }
      let list = `Available document indexes:\n\n`;
      for (const [n, idx] of documentIndexes) {
        list += `- ${n}\n  Directory: ${idx.directory}\n  Documents: ${idx.documents.length}\n  Created: ${idx.createdAt}\n\n`;
      }
      return { content: [{ type: 'text', text: list }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };

  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true
    };
  }
});

// === SERVER STARTUP ===
async function main() {
  await initDb();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP Server v2.0.0 running on stdio`);
  console.error(`Task database: ${DB_PATH}`);
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
