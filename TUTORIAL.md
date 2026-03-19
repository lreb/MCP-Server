# Tutorial - Add One Custom Tool

This tutorial shows the minimum steps to add and test a new MCP tool.

## 1. Add tool schema

In `src/index.ts`, add this object to the `TOOLS` array:

```typescript
{
  name: 'greet',
  description: 'Generate a greeting message',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name to greet'
      }
    },
    required: ['name']
  }
}
```

## 2. Add tool handler

In the `CallToolRequestSchema` handler, add:

```typescript
if (name === 'greet') {
  const { name: userName } = args as { name: string };

  return {
    content: [
      {
        type: 'text',
        text: `Hello, ${userName}!`
      }
    ]
  };
}
```

## 3. Build and restart

```bash
npm run build
# restart Claude Desktop
```

If you are only testing in terminal watch mode, use:

```bash
npm run watch
```

## 4. Test in Claude

Ask:

```text
Use greet with name Alice
```

Expected result:

```text
Hello, Alice!
```

## Common mistakes

- Tool name in `TOOLS` does not exactly match handler branch
- Missing required field in `inputSchema`
- Forgot to run `npm run build` before testing in Claude Desktop
- Used `console.log` for logs instead of `console.error`

## Next step

Repeat the same pattern for any new tool:

1. Define schema in `TOOLS`
2. Implement handler branch
3. Build and restart Claude Desktop
4. Test from Claude
