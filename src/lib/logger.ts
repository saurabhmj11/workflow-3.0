// Universal logger — works in both Node.js (server) and browser (client).
// Replaces `pino` which cannot be bundled for the browser.
// The API mirrors pino's so existing callers (info/warn/error/child) work unchanged.

type LogFn = (mergingObject: Record<string, unknown>, message: string) => void
type SimpleLogFn = (message: string) => void

export interface Logger {
  info: LogFn & SimpleLogFn
  warn: LogFn & SimpleLogFn
  error: LogFn & SimpleLogFn
  debug: LogFn & SimpleLogFn
  child: (bindings: Record<string, unknown>) => Logger
}

function isObject(arg: unknown): arg is Record<string, unknown> {
  return typeof arg === 'object' && arg !== null && !Array.isArray(arg)
}

function formatMessage(bindings: Record<string, unknown>, level: string, ...args: unknown[]): string {
  const prefix = Object.keys(bindings).length > 0 ? `[${new Date().toISOString()}] ${level.toUpperCase()} ${JSON.stringify(bindings)} ` : `[${new Date().toISOString()}] ${level.toUpperCase()} `
  return prefix + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
}

function createLevelFn(level: string, bindings: Record<string, unknown>, consoleFn: (...args: unknown[]) => void): LogFn & SimpleLogFn {
  function logFn(mergingObjectOrMessage: Record<string, unknown> | string, message?: string): void {
    if (typeof mergingObjectOrMessage === 'string') {
      consoleFn(formatMessage(bindings, level, mergingObjectOrMessage))
    } else if (isObject(mergingObjectOrMessage) && typeof message === 'string') {
      consoleFn(formatMessage({ ...bindings, ...mergingObjectOrMessage }, level, message))
    } else {
      consoleFn(formatMessage(bindings, level, mergingObjectOrMessage))
    }
  }
  return logFn
}

function createLogger(bindings: Record<string, unknown> = {}): Logger {
  return {
    info: createLevelFn('info', bindings, console.info),
    warn: createLevelFn('warn', bindings, console.warn),
    error: createLevelFn('error', bindings, console.error),
    debug: createLevelFn('debug', bindings, console.debug),
    child: (newBindings: Record<string, unknown>) => createLogger({ ...bindings, ...newBindings }),
  }
}

const logger = createLogger({ env: typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined })

export default logger

// Convenience methods with component prefix
export { createLogger }
