type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  [key: string]: unknown;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  if (level === 'error' || level === 'warn') {
    console.error(formatEntry(entry));
  } else {
    console.log(formatEntry(entry));
  }
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => log('debug', message, fields),
  info: (message: string, fields?: Record<string, unknown>) => log('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => log('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => log('error', message, fields),

  child(defaultFields: Record<string, unknown>) {
    return {
      debug: (message: string, fields?: Record<string, unknown>) =>
        log('debug', message, { ...defaultFields, ...fields }),
      info: (message: string, fields?: Record<string, unknown>) =>
        log('info', message, { ...defaultFields, ...fields }),
      warn: (message: string, fields?: Record<string, unknown>) =>
        log('warn', message, { ...defaultFields, ...fields }),
      error: (message: string, fields?: Record<string, unknown>) =>
        log('error', message, { ...defaultFields, ...fields }),
    };
  },
};
