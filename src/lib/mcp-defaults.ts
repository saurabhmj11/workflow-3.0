import type { MCPToolDefinition } from '@/lib/types'

export const DEFAULT_MCP_TOOLS: MCPToolDefinition[] = [
  {
    id: 'tool-web-search',
    name: 'web_search',
    description: 'Search the web for current information',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
        max_results: { type: 'number', description: 'Maximum number of results to return' },
      },
      required: ['query'],
    },
  },
  {
    id: 'tool-calculator',
    name: 'calculator',
    description: 'Evaluate mathematical expressions',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Mathematical expression to evaluate' },
      },
      required: ['expression'],
    },
  },
  {
    id: 'tool-http-request',
    name: 'http_request',
    description: 'Make HTTP requests to external APIs',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Target URL' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
        headers: { type: 'object', description: 'Request headers' },
        body: { type: 'object', description: 'Request body' },
      },
      required: ['url', 'method'],
    },
  },
  {
    id: 'tool-file-read',
    name: 'file_read',
    description: 'Read file contents from the workspace',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
        encoding: { type: 'string', description: 'File encoding (default: utf-8)' },
      },
      required: ['path'],
    },
  },
  {
    id: 'tool-code-execute',
    name: 'code_execute',
    description: 'Execute code snippets in a sandboxed environment',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['python', 'javascript', 'typescript'], description: 'Programming language' },
        code: { type: 'string', description: 'Code to execute' },
        timeout_ms: { type: 'number', description: 'Execution timeout in milliseconds' },
      },
      required: ['language', 'code'],
    },
  },
  {
    id: 'tool-database-query',
    name: 'database_query',
    description: 'Run SQL queries against connected databases',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query to execute' },
        connection: { type: 'string', description: 'Database connection name' },
        parameters: { type: 'object', description: 'Query parameters' },
      },
      required: ['query'],
    },
  },
  {
    id: 'tool-email-send',
    name: 'email_send',
    description: 'Send emails via configured SMTP',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body content' },
        cc: { type: 'string', description: 'CC recipients' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    id: 'tool-slack-message',
    name: 'slack_message',
    description: 'Post messages to Slack channels',
    serverName: 'builtin',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Slack channel name or ID' },
        message: { type: 'string', description: 'Message text to post' },
        thread_ts: { type: 'string', description: 'Thread timestamp for reply' },
      },
      required: ['channel', 'message'],
    },
  },
]
