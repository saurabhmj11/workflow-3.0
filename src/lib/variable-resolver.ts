// ─── Variable Resolution Engine ───────────────────
// Resolves {{variable}} template references in node configs and strings.
//
// Variable Syntax:
//   {{nodes.nodeId.field}}  — Access output of a specific node by its ID
//   {{nodes.nodeId}}        — Access entire output of a node
//   {{context.variables.key}} — Access workflow-level variables
//   {{input.field}}         — Access the current node's input (from previous node)
//   {{input}}               — Access the full input object
//   {{config.key}}          — Access the current node's own config value
//   {{bare_variable}}       — Fallback: searches input, then nodeOutputs, then variables
//   {{nested.path.0.name}}  — Dot notation for nested access + array indices

// ─── Node Output Store ───────────────────────────
export type NodeOutputStore = Record<string, unknown>

// ─── Resolution Context ──────────────────────────
export interface ResolutionContext {
  nodeOutputs: NodeOutputStore
  input: unknown
  variables: Record<string, unknown>
  config: Record<string, unknown>
}

// ─── Template pattern ────────────────────────────
const TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g

// ─── Get nested value using dot notation ─────────
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj == null || path === '') return undefined

  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current == null) return undefined

    if (Array.isArray(current)) {
      const index = Number(part)
      if (!Number.isNaN(index) && index >= 0 && index < current.length) {
        current = current[index]
      } else {
        return undefined
      }
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

// ─── Resolve a single variable path ──────────────
// Handles both structured paths (nodes.x, input.x, etc.)
// and bare variable names (fallback resolution)
function resolveVariablePath(path: string, context: ResolutionContext): unknown {
  const trimmed = path.trim()

  // {{nodes.nodeId.field}} or {{nodes.nodeId}}
  if (trimmed.startsWith('nodes.')) {
    const rest = trimmed.slice(6) // remove "nodes."
    const dotIndex = rest.indexOf('.')
    if (dotIndex === -1) {
      // {{nodes.nodeId}} — entire output
      return context.nodeOutputs[rest]
    }
    const nodeId = rest.slice(0, dotIndex)
    const fieldPath = rest.slice(dotIndex + 1)
    const nodeOutput = context.nodeOutputs[nodeId]
    return getNestedValue(nodeOutput, fieldPath)
  }

  // {{context.variables.key}}
  if (trimmed.startsWith('context.variables.')) {
    const key = trimmed.slice(18) // remove "context.variables."
    return getNestedValue(context.variables, key)
  }

  // {{context.key}} — alias for variables
  if (trimmed.startsWith('context.')) {
    const key = trimmed.slice(8) // remove "context."
    return getNestedValue(context.variables, key)
  }

  // {{input.field}} or {{input}}
  if (trimmed === 'input') {
    return context.input
  }
  if (trimmed.startsWith('input.')) {
    const fieldPath = trimmed.slice(6) // remove "input."
    return getNestedValue(context.input, fieldPath)
  }

  // {{config.key}} or {{config}}
  if (trimmed === 'config') {
    return context.config
  }
  if (trimmed.startsWith('config.')) {
    const fieldPath = trimmed.slice(7) // remove "config."
    return getNestedValue(context.config, fieldPath)
  }

  // ─── Bare variable fallback ──────────────────
  // For backward compatibility with templates that use {{classification}},
  // {{sender_email}}, etc. — search through contexts in priority order:
  // 1. input (most common for data flowing between nodes)
  // 2. nodeOutputs (results from previously executed nodes)
  // 3. variables (workflow-level variables)
  // 4. config (current node's config)

  // Try input
  const fromInput = getNestedValue(context.input, trimmed)
  if (fromInput !== undefined) return fromInput

  // Try nodeOutputs — search each node's output for the key
  for (const nodeId of Object.keys(context.nodeOutputs)) {
    const output = context.nodeOutputs[nodeId]
    const fromNode = getNestedValue(output, trimmed)
    if (fromNode !== undefined) return fromNode
  }

  // Try variables
  const fromVars = getNestedValue(context.variables, trimmed)
  if (fromVars !== undefined) return fromVars

  // Try config
  const fromConfig = getNestedValue(context.config, trimmed)
  if (fromConfig !== undefined) return fromConfig

  return undefined
}

// ─── Resolve a single {{...}} template string ────
// A string may contain multiple {{...}} expressions mixed with literal text.
// If the entire string is a single {{...}} expression, return the raw value
// (preserving types like numbers, booleans, objects).
// If it's a mix, convert all resolved values to string and concatenate.
function resolveTemplate(template: string, context: ResolutionContext): unknown {
  // Check if the entire string is a single template expression
  const singleMatch = /^\{\{([^}]+)\}\}$/.exec(template)
  if (singleMatch) {
    const resolved = resolveVariablePath(singleMatch[1], context)
    // If resolved is undefined, keep the original template string
    return resolved !== undefined ? resolved : template
  }

  // Multiple or mixed — resolve each and concatenate as strings
  let result = template
  let hasAnyResolved = false

  result = template.replace(TEMPLATE_REGEX, (match, path: string) => {
    const resolved = resolveVariablePath(path, context)
    if (resolved !== undefined) {
      hasAnyResolved = true
      return String(resolved)
    }
    return match // keep original {{...}} if unresolved
  })

  return hasAnyResolved ? result : template
}

// ─── Deep resolve ────────────────────────────────
// Walk objects/arrays and resolve all string values containing {{...}}
function deepResolve(value: unknown, context: ResolutionContext): unknown {
  if (typeof value === 'string') {
    // Only resolve strings that contain template expressions
    if (value.includes('{{')) {
      return resolveTemplate(value, context)
    }
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepResolve(item, context))
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepResolve(val, context)
    }
    return result
  }

  // Primitives (number, boolean, null, undefined) — return as-is
  return value
}

// ─── Main entry point ────────────────────────────
// Resolve all {{...}} templates in a value (string, object, array — recursively)
export function resolveVariables(
  value: unknown,
  context: ResolutionContext
): unknown {
  return deepResolve(value, context)
}

// ─── Simple condition evaluator ──────────────────
// Evaluates common comparison patterns in resolved expressions.
// Supports:
//   value === "string"      → string equality
//   value !== "string"      → string inequality
//   value > 5               → numeric greater than
//   value >= 5              → numeric greater than or equal
//   value < 5               → numeric less than
//   value <= 5              → numeric less than or equal
//   value === true          → boolean equality
//   value === false         → boolean equality
//   value !== true          → boolean inequality
//   Also supports || and && for combining conditions

type ComparisonOperator = '===' | '!==' | '>' | '>=' | '<' | '<='

interface ConditionPart {
  left: unknown
  operator: ComparisonOperator
  right: unknown
}

function parseComparison(left: string, op: ComparisonOperator, right: string): ConditionPart | null {
  let parsedRight: string | boolean | number | null | undefined = right.trim()
  let parsedLeft: string | boolean | number | null | undefined = left.trim()

  // Parse right side
  if (parsedRight.startsWith('"') && parsedRight.endsWith('"')) {
    parsedRight = parsedRight.slice(1, -1)
  } else if (parsedRight.startsWith("'") && parsedRight.endsWith("'")) {
    parsedRight = parsedRight.slice(1, -1)
  } else if (parsedRight === 'true') {
    parsedRight = true
  } else if (parsedRight === 'false') {
    parsedRight = false
  } else if (parsedRight === 'null') {
    parsedRight = null
  } else if (parsedRight === 'undefined') {
    parsedRight = undefined
  } else {
    const num = Number(parsedRight)
    if (!Number.isNaN(num)) {
      parsedRight = num
    }
  }

  // Parse left side (it's usually already resolved, but handle string values)
  if (typeof parsedLeft === 'string') {
    if (parsedLeft.startsWith('"') && parsedLeft.endsWith('"')) {
      parsedLeft = parsedLeft.slice(1, -1)
    } else if (parsedLeft.startsWith("'") && parsedLeft.endsWith("'")) {
      parsedLeft = parsedLeft.slice(1, -1)
    } else if (parsedLeft === 'true') {
      parsedLeft = true
    } else if (parsedLeft === 'false') {
      parsedLeft = false
    } else {
      const num = Number(parsedLeft)
      if (!Number.isNaN(num)) {
        parsedLeft = num
      }
    }
  }

  return { left: parsedLeft, operator: op, right: parsedRight }
}

function evaluateComparison(part: ConditionPart): boolean {
  const { left, operator, right } = part

  switch (operator) {
    case '===':
      return left === right
    case '!==':
      return left !== right
    case '>': {
      const l = Number(left)
      const r = Number(right)
      return !Number.isNaN(l) && !Number.isNaN(r) && l > r
    }
    case '>=': {
      const l = Number(left)
      const r = Number(right)
      return !Number.isNaN(l) && !Number.isNaN(r) && l >= r
    }
    case '<': {
      const l = Number(left)
      const r = Number(right)
      return !Number.isNaN(l) && !Number.isNaN(r) && l < r
    }
    case '<=': {
      const l = Number(left)
      const r = Number(right)
      return !Number.isNaN(l) && !Number.isNaN(r) && l <= r
    }
    default:
      return false
  }
}

// Split an expression by || or && at the top level (not inside quotes)
function splitByLogical(expression: string): { parts: string[]; operator: '||' | '&&' } | null {
  // Look for || first (lower precedence)
  const orIndex = findLogicalOperator(expression, '||')
  if (orIndex !== -1) {
    return {
      parts: [expression.slice(0, orIndex).trim(), expression.slice(orIndex + 2).trim()],
      operator: '||',
    }
  }

  const andIndex = findLogicalOperator(expression, '&&')
  if (andIndex !== -1) {
    return {
      parts: [expression.slice(0, andIndex).trim(), expression.slice(andIndex + 2).trim()],
      operator: '&&',
    }
  }

  return null
}

function findLogicalOperator(expression: string, op: string): number {
  let inQuote: string | null = null
  for (let i = 0; i < expression.length - op.length + 1; i++) {
    const ch = expression[i]
    if (ch === '"' || ch === "'") {
      if (inQuote === ch) {
        inQuote = null
      } else if (inQuote === null) {
        inQuote = ch
      }
    }
    if (inQuote === null && expression.slice(i, i + op.length) === op) {
      return i
    }
  }
  return -1
}

export function evaluateSimpleCondition(expression: string, resolvedConfig: Record<string, unknown>): boolean {
  const trimmed = expression.trim()
  if (!trimmed) return false

  // Handle logical operators (||, &&)
  const logical = splitByLogical(trimmed)
  if (logical) {
    const results = logical.parts.map((part) => evaluateSimpleCondition(part, resolvedConfig))
    return logical.operator === '||' ? results.some(Boolean) : results.every(Boolean)
  }

  // Handle negation at the start
  if (trimmed.startsWith('!')) {
    return !evaluateSimpleCondition(trimmed.slice(1), resolvedConfig)
  }

  // Handle parenthesized expressions
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return evaluateSimpleCondition(trimmed.slice(1, -1), resolvedConfig)
  }

  // Try to match a comparison operator
  const operators: ComparisonOperator[] = ['===', '!==', '>=', '<=', '>', '<']
  for (const op of operators) {
    const opIndex = findOperatorIndex(trimmed, op)
    if (opIndex !== -1) {
      const left = trimmed.slice(0, opIndex).trim()
      const right = trimmed.slice(opIndex + op.length).trim()

      // Resolve the left side if it's a variable reference
      let resolvedLeft: unknown = left
      if (left.includes('{{')) {
        // Already resolved by the variable engine — extract the value
        // The variable resolver would have already replaced {{...}} with actual values
        // in the config, so we need to look up the resolved value
        resolvedLeft = resolveExpressionValue(left, resolvedConfig)
      } else {
        // It might be a bare key that maps to the resolved config
        resolvedLeft = resolveExpressionValue(left, resolvedConfig)
      }

      const comparison = parseComparison(String(resolvedLeft), op, right)
      if (comparison) {
        return evaluateComparison(comparison)
      }
    }
  }

  // If no operator found, treat as truthy check
  const val = resolveExpressionValue(trimmed, resolvedConfig)
  return Boolean(val)
}

function findOperatorIndex(expression: string, op: string): number {
  let inQuote: string | null = null
  for (let i = 0; i < expression.length - op.length + 1; i++) {
    const ch = expression[i]
    if (ch === '"' || ch === "'") {
      if (inQuote === ch) {
        inQuote = null
      } else if (inQuote === null) {
        inQuote = ch
      }
    }
    if (inQuote === null && expression.slice(i, i + op.length) === op) {
      // Make sure we're not matching part of a longer operator
      // e.g., don't match '!' at position before '==' in '!=='
      if (op === '>' || op === '<') {
        // Make sure the next char isn't '='
        if (expression[i + op.length] === '=') continue
      }
      return i
    }
  }
  return -1
}

function resolveExpressionValue(expr: string, resolvedConfig: Record<string, unknown>): unknown {
  // If it contains {{...}}, the variable engine should have already resolved it
  // But for condition evaluation, the expression itself is a string in config
  // that contains {{...}} patterns. We need to resolve those patterns first.

  // Strip {{ and }} if present (single variable reference)
  const singleMatch = /^\{\{([^}]+)\}\}$/.exec(expr)
  if (singleMatch) {
    const path = singleMatch[1].trim()

    // Check structured paths
    if (path.startsWith('input.')) {
      const fieldPath = path.slice(6)
      return getNestedValue(resolvedConfig, fieldPath)
    }
    if (path === 'input') {
      return resolvedConfig
    }

    // Check bare variable in resolved config
    const fromConfig = getNestedValue(resolvedConfig, path)
    if (fromConfig !== undefined) return fromConfig

    // Check the config itself
    return resolvedConfig[path]
  }

  // If it's a bare word (no quotes, no {{}}), try to resolve from config
  if (!expr.startsWith('"') && !expr.startsWith("'")) {
    const num = Number(expr)
    if (Number.isNaN(num) && expr !== 'true' && expr !== 'false' && expr !== 'null' && expr !== 'undefined') {
      // It's a variable name
      const fromConfig = getNestedValue(resolvedConfig, expr)
      if (fromConfig !== undefined) return fromConfig
    }
  }

  return expr
}

// ─── Simple hash function for deterministic simulation ───
export function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
