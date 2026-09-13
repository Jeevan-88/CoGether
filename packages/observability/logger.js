/**
 * CoGether Structured JSON Logger
 * Formats every log entry as single-line JSON adhering to OpenTelemetry standards.
 */

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

class StructuredLogger {
  constructor(context = {}) {
    this.context = {
      service: context.service || 'cogether-platform',
      environment: context.environment || process.env.NODE_ENV || 'development',
      ...context
    };
    this.minLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] || LOG_LEVELS.info;
  }

  child(extraContext = {}) {
    return new StructuredLogger({
      ...this.context,
      ...extraContext
    });
  }

  log(level, message, extra = {}) {
    if ((LOG_LEVELS[level] || 20) < this.minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...extra
    };

    if (extra.error instanceof Error) {
      entry.error = {
        name: extra.error.name,
        message: extra.error.message,
        stack: extra.error.stack,
        code: extra.error.code
      };
      delete entry.extraError;
    }

    const output = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  debug(msg, extra) { this.log('debug', msg, extra); }
  info(msg, extra) { this.log('info', msg, extra); }
  warn(msg, extra) { this.log('warn', msg, extra); }
  error(msg, extra) { this.log('error', msg, extra); }
}

const defaultLogger = new StructuredLogger();

module.exports = {
  StructuredLogger,
  logger: defaultLogger
};
