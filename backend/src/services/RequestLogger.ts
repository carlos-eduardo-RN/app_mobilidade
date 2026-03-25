/**
 * Request Logger
 * Comprehensive request/response logging with sensitive data masking
 */

import { Logger } from '../utils/Logger';
import {
  RequestLogEntry,
  ResponseLogEntry,
  ErrorLogEntry,
  AuditEntry,
} from '../models/Observability2';
import { v4 as uuidv4 } from 'uuid';

export class RequestLogger {
  private requestLogs: RequestLogEntry[] = [];
  private responseLogs: ResponseLogEntry[] = [];
  private errorLogs: ErrorLogEntry[] = [];
  private auditTrail: AuditEntry[] = [];
  private maskSensitiveData: boolean;

  // Sensitive fields to mask
  private sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'creditCard',
    'ssn',
    'cvv',
  ];

  constructor(maskSensitiveData: boolean = true) {
    this.maskSensitiveData = maskSensitiveData;
  }

  /**
   * Log incoming request
   */
  logRequest(
    method: string,
    path: string,
    correlationId: string,
    traceId: string,
    options?: {
      query?: Record<string, any>;
      headers?: Record<string, string>;
      body?: any;
      userId?: string;
      ip?: string;
    },
  ): RequestLogEntry {
    const entry: RequestLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      correlationId,
      traceId,
      method,
      path,
      query: options?.query || {},
      headers: this.filterHeaders(options?.headers || {}),
      body: this.maskSensitiveData ? this.mask(options?.body) : options?.body,
      userId: options?.userId,
      ip: options?.ip || 'unknown',
    };

    this.requestLogs.push(entry);

    // Maintain max size
    if (this.requestLogs.length > 10000) {
      this.requestLogs = this.requestLogs.slice(-5000);
    }

    Logger.info('RequestLogger', 'Request logged', {
      correlationId,
      method,
      path,
      userId: options?.userId,
    });

    return entry;
  }

  /**
   * Log outgoing response
   */
  logResponse(
    correlationId: string,
    traceId: string,
    statusCode: number,
    duration: number,
    options?: {
      body?: any;
      headers?: Record<string, string>;
    },
  ): ResponseLogEntry {
    const entry: ResponseLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      correlationId,
      traceId,
      statusCode,
      duration,
      body: this.maskSensitiveData ? this.mask(options?.body) : options?.body,
      headers: this.filterHeaders(options?.headers || {}),
    };

    this.responseLogs.push(entry);

    // Maintain max size
    if (this.responseLogs.length > 10000) {
      this.responseLogs = this.responseLogs.slice(-5000);
    }

    Logger.info('RequestLogger', 'Response logged', {
      correlationId,
      statusCode,
      duration,
    });

    return entry;
  }

  /**
   * Log error
   */
  logError(
    correlationId: string,
    traceId: string,
    error: Error | string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata?: Record<string, any>,
  ): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      correlationId,
      traceId,
      errorType: typeof error === 'string' ? 'Error' : error.constructor.name,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      severity,
      metadata,
    };

    this.errorLogs.push(entry);

    // Maintain max size
    if (this.errorLogs.length > 10000) {
      this.errorLogs = this.errorLogs.slice(-5000);
    }

    Logger.error('RequestLogger', 'Error logged', {
      correlationId,
      errorType: entry.errorType,
      severity,
    });

    return entry;
  }

  /**
   * Log audit entry
   */
  logAudit(
    correlationId: string,
    action: string,
    actor: string,
    resource: string,
    result: 'success' | 'failure',
    options?: {
      before?: any;
      after?: any;
    },
  ): AuditEntry {
    const entry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      correlationId,
      action,
      actor,
      resource,
      before: this.maskSensitiveData ? this.mask(options?.before) : options?.before,
      after: this.maskSensitiveData ? this.mask(options?.after) : options?.after,
      result,
    };

    this.auditTrail.push(entry);

    // Maintain max size
    if (this.auditTrail.length > 10000) {
      this.auditTrail = this.auditTrail.slice(-5000);
    }

    Logger.info('RequestLogger', 'Audit logged', {
      correlationId,
      action,
      actor,
      result,
    });

    return entry;
  }

  /**
   * Mask sensitive data
   */
  private mask(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.mask(item));
    }

    const masked: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.mask(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Check if field is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.sensitiveFields.some((sensitive) => lowerField.includes(sensitive.toLowerCase()));
  }

  /**
   * Filter headers (remove sensitive ones)
   */
  private filterHeaders(headers: Record<string, string>): Record<string, string> {
    const filtered: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (this.isSensitiveField(key)) {
        filtered[key] = '***MASKED***';
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Get audit trail by correlation ID
   */
  getAuditTrail(correlationId: string): AuditEntry[] {
    return this.auditTrail.filter((entry) => entry.correlationId === correlationId);
  }

  /**
   * Get request by correlation ID
   */
  getRequest(correlationId: string): RequestLogEntry | undefined {
    return this.requestLogs.find((entry) => entry.correlationId === correlationId);
  }

  /**
   * Get response by correlation ID
   */
  getResponse(correlationId: string): ResponseLogEntry | undefined {
    return this.responseLogs.find((entry) => entry.correlationId === correlationId);
  }

  /**
   * Get errors by correlation ID
   */
  getErrors(correlationId: string): ErrorLogEntry[] {
    return this.errorLogs.filter((entry) => entry.correlationId === correlationId);
  }

  /**
   * Get complete request/response pair
   */
  getRequestResponsePair(correlationId: string): {
    request: RequestLogEntry | undefined;
    response: ResponseLogEntry | undefined;
    errors: ErrorLogEntry[];
  } {
    return {
      request: this.getRequest(correlationId),
      response: this.getResponse(correlationId),
      errors: this.getErrors(correlationId),
    };
  }

  /**
   * Search logs by criteria
   */
  searchLogs(criteria: {
    startTime?: Date;
    endTime?: Date;
    userId?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    minDuration?: number;
    maxDuration?: number;
    limit?: number;
  }): {
    requests: RequestLogEntry[];
    responses: ResponseLogEntry[];
    errors: ErrorLogEntry[];
  } {
    let requests = [...this.requestLogs];
    let responses = [...this.responseLogs];
    let errors = [...this.errorLogs];

    // Filter by time
    if (criteria.startTime) {
      const startTime = criteria.startTime.getTime();
      requests = requests.filter((r) => r.timestamp.getTime() >= startTime);
      responses = responses.filter((r) => r.timestamp.getTime() >= startTime);
      errors = errors.filter((e) => e.timestamp.getTime() >= startTime);
    }

    if (criteria.endTime) {
      const endTime = criteria.endTime.getTime();
      requests = requests.filter((r) => r.timestamp.getTime() <= endTime);
      responses = responses.filter((r) => r.timestamp.getTime() <= endTime);
      errors = errors.filter((e) => e.timestamp.getTime() <= endTime);
    }

    // Filter requests
    if (criteria.userId) {
      requests = requests.filter((r) => r.userId === criteria.userId);
    }

    if (criteria.path) {
      requests = requests.filter((r) => r.path.includes(criteria.path!));
    }

    if (criteria.method) {
      requests = requests.filter((r) => r.method === criteria.method);
    }

    // Filter responses
    if (criteria.statusCode) {
      responses = responses.filter((r) => r.statusCode === criteria.statusCode);
    }

    if (criteria.minDuration) {
      responses = responses.filter((r) => r.duration >= criteria.minDuration!);
    }

    if (criteria.maxDuration) {
      responses = responses.filter((r) => r.duration <= criteria.maxDuration!);
    }

    // Apply limit
    const limit = criteria.limit || 100;
    requests = requests.slice(-limit);
    responses = responses.slice(-limit);
    errors = errors.slice(-limit);

    return { requests, responses, errors };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRequests: number;
    totalResponses: number;
    totalErrors: number;
    totalAudit: number;
    avgDuration: number;
    errorRate: number;
  } {
    const avgDuration =
      this.responseLogs.length > 0
        ? this.responseLogs.reduce((sum, r) => sum + r.duration, 0) / this.responseLogs.length
        : 0;

    const errorRate =
      this.requestLogs.length > 0 ? (this.errorLogs.length / this.requestLogs.length) * 100 : 0;

    return {
      totalRequests: this.requestLogs.length,
      totalResponses: this.responseLogs.length,
      totalErrors: this.errorLogs.length,
      totalAudit: this.auditTrail.length,
      avgDuration,
      errorRate,
    };
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.requestLogs = [];
    this.responseLogs = [];
    this.errorLogs = [];
    this.auditTrail = [];
    Logger.info('RequestLogger', 'All logs cleared');
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        requests: this.requestLogs,
        responses: this.responseLogs,
        errors: this.errorLogs,
        audit: this.auditTrail,
        stats: this.getStats(),
        exportedAt: new Date(),
      },
      null,
      2,
    );
  }
}
