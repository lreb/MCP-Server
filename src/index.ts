#!/usr/bin/env node

/**
 * MCP Server for Local Development
 * 
 * This server provides tools for:
 * - File operations
 * - Task/issue management
 * - Document generation
 * - Local development utilities
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

// Create the MCP server
const server = new Server({
  name: 'local-dev-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Define available tools
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
  }
] as const;

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
let taskIdCounter = 1;

// ============= FILE OPERATIONS TOOLS =============

// ============= FILE OPERATIONS TOOLS =============

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
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

// ============= START THE SERVER =============

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
