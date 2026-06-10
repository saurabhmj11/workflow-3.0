// ─── Built-in Plugins ────────────────────────────
// Three example plugins shipped with OpenWorkflow to demonstrate
// the plugin ecosystem: PDF Generator, Web Scraper, Data Transformer.

import { pluginRegistry } from './registry'
import type { PluginManifest } from './registry'

// ─── 1. PDF Generator Plugin ─────────────────────

const pdfGeneratorManifest: PluginManifest = {
  id: 'pdf-generator',
  name: 'PDF Generator',
  version: '1.0.0',
  description: 'Generate PDF documents from templates and data. Supports HTML-to-PDF conversion, custom headers/footers, and dynamic content injection.',
  author: 'OpenWorkflow',
  icon: 'FileText',
  homepage: 'https://openworkflow.dev/plugins/pdf-generator',
  permissions: ['filesystem'],
  nodes: [
    {
      type: 'plugin:pdf-generator',
      label: 'PDF Generator',
      category: 'action',
      icon: 'FileText',
      color: '#e11d48',
      configSchema: {
        type: 'object',
        properties: {
          template: {
            type: 'string',
            description: 'HTML template for the PDF content. Supports {{variable}} placeholders.',
          },
          outputFormat: {
            type: 'string',
            enum: ['pdf', 'pdf-a4', 'pdf-letter'],
            description: 'Output format and page size',
          },
          headerTemplate: {
            type: 'string',
            description: 'Optional HTML template for page header',
          },
          footerTemplate: {
            type: 'string',
            description: 'Optional HTML template for page footer',
          },
          fileName: {
            type: 'string',
            description: 'Output file name (without extension)',
          },
        },
        required: ['template'],
      },
      sourceHandle: ['default', 'error'],
      handler: 'pdf-generator/generate',
    },
  ],
  settings: [
    {
      key: 'defaultFormat',
      label: 'Default Page Format',
      type: 'select',
      required: false,
      defaultValue: 'pdf-a4',
      options: ['pdf', 'pdf-a4', 'pdf-letter'],
    },
    {
      key: 'maxFileSize',
      label: 'Max File Size (MB)',
      type: 'number',
      required: false,
      defaultValue: 10,
    },
  ],
}

// ─── 2. Web Scraper Plugin ───────────────────────

const webScraperManifest: PluginManifest = {
  id: 'web-scraper',
  name: 'Web Scraper',
  version: '1.0.0',
  description: 'Scrape web pages and extract structured data. Supports CSS selectors, XPath, pagination, and rate limiting.',
  author: 'OpenWorkflow',
  icon: 'Globe',
  homepage: 'https://openworkflow.dev/plugins/web-scraper',
  permissions: ['network'],
  nodes: [
    {
      type: 'plugin:web-scraper',
      label: 'Web Scraper',
      category: 'action',
      icon: 'Globe',
      color: '#0891b2',
      configSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to scrape',
          },
          selector: {
            type: 'string',
            description: 'CSS selector to extract content',
          },
          extractMode: {
            type: 'string',
            enum: ['text', 'html', 'attributes', 'structured'],
            description: 'What to extract from matched elements',
          },
          followLinks: {
            type: 'boolean',
            description: 'Whether to follow pagination links',
          },
          maxPages: {
            type: 'number',
            description: 'Maximum number of pages to scrape',
          },
          requestDelayMs: {
            type: 'number',
            description: 'Delay between requests in ms (rate limiting)',
          },
        },
        required: ['url'],
      },
      sourceHandle: ['default', 'error'],
      handler: 'web-scraper/scrape',
    },
  ],
  triggers: [
    {
      type: 'plugin:web-scraper-schedule',
      name: 'Scheduled Scrape',
      handler: 'web-scraper/schedule',
      configSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          cronExpression: { type: 'string' },
          selector: { type: 'string' },
        },
        required: ['url', 'cronExpression'],
      },
    },
  ],
  settings: [
    {
      key: 'userAgent',
      label: 'User Agent String',
      type: 'string',
      required: false,
      defaultValue: 'OpenWorkflow-Scraper/1.0',
    },
    {
      key: 'respectRobotsTxt',
      label: 'Respect robots.txt',
      type: 'boolean',
      required: false,
      defaultValue: true,
    },
    {
      key: 'defaultDelayMs',
      label: 'Default Request Delay (ms)',
      type: 'number',
      required: false,
      defaultValue: 1000,
    },
  ],
}

// ─── 3. Data Transformer Plugin ──────────────────

const dataTransformerManifest: PluginManifest = {
  id: 'data-transformer',
  name: 'Data Transformer',
  version: '1.0.0',
  description: 'Transform, filter, map, and reshape data between workflow nodes. Supports JSONPath, custom mapping, aggregation, and schema validation.',
  author: 'OpenWorkflow',
  icon: 'ArrowLeftRight',
  homepage: 'https://openworkflow.dev/plugins/data-transformer',
  permissions: [],
  nodes: [
    {
      type: 'plugin:data-transformer',
      label: 'Data Transformer',
      category: 'logic',
      icon: 'ArrowLeftRight',
      color: '#16a34a',
      configSchema: {
        type: 'object',
        properties: {
          transformType: {
            type: 'string',
            enum: ['map', 'filter', 'reduce', 'flatten', 'pick', 'rename', 'validate'],
            description: 'Type of transformation to apply',
          },
          expression: {
            type: 'string',
            description: 'Transformation expression (JSONPath or custom syntax)',
          },
          mapping: {
            type: 'object',
            description: 'Key-value mapping for rename/pick transforms',
          },
          outputSchema: {
            type: 'object',
            description: 'Expected output JSON Schema for validation',
          },
        },
        required: ['transformType'],
      },
      sourceHandle: ['default', 'error'],
      handler: 'data-transformer/transform',
    },
  ],
  settings: [
    {
      key: 'strictMode',
      label: 'Strict Validation Mode',
      type: 'boolean',
      required: false,
      defaultValue: false,
    },
    {
      key: 'maxArraySize',
      label: 'Max Array Size',
      type: 'number',
      required: false,
      defaultValue: 10000,
    },
  ],
}

// ─── Register all built-in plugins ───────────────

export function registerBuiltinPlugins(): void {
  const builtins: PluginManifest[] = [
    pdfGeneratorManifest,
    webScraperManifest,
    dataTransformerManifest,
  ]

  for (const manifest of builtins) {
    try {
      pluginRegistry.registerPlugin(manifest)
      // Auto-enable built-in plugins
      pluginRegistry.enablePlugin(manifest.id)
    } catch (err) {
      console.error(`[BuiltinPlugins] Failed to register ${manifest.id}:`, err)
    }
  }
}

/** Get all built-in plugin manifests */
export function getBuiltinPluginManifests(): PluginManifest[] {
  return [pdfGeneratorManifest, webScraperManifest, dataTransformerManifest]
}
