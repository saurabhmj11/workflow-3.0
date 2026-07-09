# Variable/Context System Implementation — Task Summary

## Files Created
- `/home/z/my-project/src/lib/variable-resolver.ts` — The Variable Resolution Engine

## Files Modified
- `/home/z/my-project/src/lib/types.ts` — Added `nodeOutputs` to `ExecutionContext`
- `/home/z/my-project/src/lib/engine.ts` — Integrated variable resolution into the execution engine

## Key Decisions

### 1. Variable Syntax Support
Implemented both structured and bare variable syntax:
- **Structured**: `{{nodes.nodeId.field}}`, `{{input.field}}`, `{{config.key}}`, `{{context.variables.key}}`
- **Bare fallback**: `{{classification}}`, `{{sender_email}}` — searches input → nodeOutputs → variables → config
This ensures backward compatibility with existing workflow templates that use shorthand notation.

### 2. Type Preservation
When a string is a single `{{...}}` expression (e.g., `{{input.score}}`), the resolved value preserves its original type (number, boolean, object) instead of always converting to string. Mixed strings (e.g., `"Score: {{input.score}}"`) concatenate resolved values as strings.

### 3. Unresolvable Variables
If a variable can't be resolved, the original `{{...}}` string is kept intact. The engine never throws on unresolvable variables.

### 4. Condition Evaluation
- `evaluateSimpleCondition()` handles `===`, `!==`, `>`, `>=`, `<`, `<=` operators
- Supports `||` and `&&` for combining conditions
- Falls back to `Math.random()` for condition nodes without an expression
- The expression is resolved by the variable engine BEFORE evaluation, so `{{input.field}} === "value"` becomes `"actual_value" === "value"`

### 5. Switch Node
Added switch node handler that evaluates case conditions from `config.cases` using the same `evaluateSimpleCondition()`. Falls back to hash-based deterministic selection.

### 6. Classifier Node
Replaced random classification with deterministic hash-based selection. The category is determined by `simpleHash(JSON.stringify(input)) % categories.length`, ensuring consistent results for the same input.

### 7. Action Nodes
Action node outputs now include resolved config values (`...config`) alongside the result and input, making resolved template values visible in downstream nodes.

### 8. Switch Edge Routing
Added switch node edge routing in the BFS executor — routes to the edge whose `sourceHandle` matches the `matchedCase`.

## Build & Lint
- `npx next build` ✅ passes
- `bun run lint` ✅ passes (no errors)
