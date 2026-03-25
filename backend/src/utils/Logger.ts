import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { trace } from '@opentelemetry/api';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format to include trace context
const traceFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
  }
  return info;
});

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  traceFormat(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf((info: any) => {
        const { timestamp, level, message, trace_id, span_id, ...meta } = info;
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (trace_id) {
          log += ` [trace_id: ${trace_id}]`;
        }
        if (span_id) {
          log += ` [span_id: ${span_id}]`;
        }
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        return log;
      })
    ),
  }),
];

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format,
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format,
    })
  );

  // HTTP log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      format,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Log HTTP request
 */
export const logRequest = (req: any, statusCode: number, responseTime: number) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    status_code: statusCode,
    response_time_ms: responseTime,
    user_agent: req.get('user-agent'),
    ip: req.ip || req.socket.remoteAddress,
    user_id: req.user?.id,
  });
};

/**
 * Log database query
 */
export const logDatabaseQuery = (operation: string, table: string, duration: number, error?: Error) => {
  if (error) {
    logger.error('Database query failed', {
      operation,
      table,
      duration_ms: duration,
      error: error.message,
      stack: error.stack,
    });
  } else {
    logger.debug('Database query', {
      operation,
      table,
      duration_ms: duration,
    });
  }
};

/**
 * Log cache operation
 */
export const logCacheOperation = (operation: string, key: string, hit: boolean) => {
  logger.debug('Cache operation', {
    operation,
    key,
    hit,
  });
};

/**
 * Log external API call
 */
export const logExternalApiCall = (service: string, endpoint: string, duration: number, error?: Error) => {
  if (error) {
    logger.error('External API call failed', {
      service,
      endpoint,
      duration_ms: duration,
      error: error.message,
      stack: error.stack,
    });
  } else {
    logger.debug('External API call', {
      service,
      endpoint,
      duration_ms: duration,
    });
  }
};

/**
 * Log queue operation
 */
export const logQueueOperation = (queue: string, operation: string, jobId?: string, error?: Error) => {
  if (error) {
    logger.error('Queue operation failed', {
      queue,
      operation,
      job_id: jobId,
      error: error.message,
      stack: error.stack,
    });
  } else {
    logger.info('Queue operation', {
      queue,
      operation,
      job_id: jobId,
    });
  }
};

/**
 * Log authentication event
 */
export const logAuth = (event: string, userId?: string, success: boolean = true, error?: Error) => {
  const level = success ? 'info' : 'warn';
  logger.log(level, `Authentication: ${event}`, {
    user_id: userId,
    success,
    error: error?.message,
  });
};

/**
 * Log business event
 */
export const logBusinessEvent = (event: string, data: Record<string, any>) => {
  logger.info(`Business event: ${event}`, data);
};

// Export legacy Logger class for backward compatibility
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private static minLevel: LogLevel = LogLevel.DEBUG;
  private context: string;

  constructor(context?: string) {
    this.context = context ?? 'App';
  }

  static setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private static shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  static debug(context: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      logger.debug(message, { context, ...data });
    }
  }

  static info(context: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      logger.info(message, { context, ...data });
    }
  }

  static warn(context: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      logger.warn(message, { context, ...data });
    }
  }

  static error(context: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      logger.error(message, { context, ...data });
    }
  }

  debug(message: string, data?: any): void {
    Logger.debug(this.context, message, data);
  }

  info(message: string, data?: any): void {
    Logger.info(this.context, message, data);
  }

  warn(message: string, data?: any): void {
    Logger.warn(this.context, message, data);
  }

  error(message: string, data?: any): void {
    Logger.error(this.context, message, data);
  }
}

export default logger;
