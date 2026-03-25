/**
 * Observability Middleware
 * Express middleware for automatic tracing, logging, and profiling
 */

import { Request, Response, NextFunction } from 'express';
import { TracingService } from '../services/TracingService';
import { RequestLogger } from '../services/RequestLogger';
import { PerformanceProfiler } from '../services/PerformanceProfiler';
import { Span } from '../models/Observability2';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      traceId?: string;
      span?: Span;
      startTime?: number;
    }
  }
}

/**
 * Correlation ID Middleware
 * Inject or propagate correlation ID
 */
export function correlationIdMiddleware(
  tracingService: TracingService,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if correlation ID exists in headers
    const existingCorrelationId = req.headers['x-correlation-id'] as string;

    // Create or use existing correlation ID
    req.correlationId = existingCorrelationId || tracingService.createCorrelationId();

    // Set in response headers
    res.setHeader('x-correlation-id', req.correlationId);

    next();
  };
}

/**
 * Tracing Middleware
 * Auto-create spans for HTTP requests
 */
export function tracingMiddleware(
  tracingService: TracingService,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Propagate context from headers
    tracingService.propagateContext(req.headers as Record<string, string>);

    // Create span for request
    const span = tracingService.startSpan(`HTTP ${req.method} ${req.path}`, undefined, {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.path': req.path,
      'http.query': JSON.stringify(req.query),
      'http.user_agent': req.headers['user-agent'] || 'unknown',
      'http.client_ip': req.ip || req.socket.remoteAddress || 'unknown',
    });

    // Store span in request for later use
    req.span = span;
    req.traceId = span.traceId;

    // Inject context into response headers
    tracingService.injectContext(res.getHeaders() as Record<string, string>);

    // Add response finish listener
    res.on('finish', () => {
      // Add response attributes
      tracingService.addSpanAttributes(span, {
        'http.status_code': res.statusCode,
        'http.status_class': `${Math.floor(res.statusCode / 100)}xx`,
      });

      // End span with appropriate status
      const status = res.statusCode >= 500 ? 'ERROR' : 'OK';
      tracingService.endSpan(span, status);
    });

    // Handle errors
    res.on('error', (error: Error) => {
      tracingService.addSpanError(span, error);
      tracingService.endSpan(span, 'ERROR');
    });

    next();
  };
}

/**
 * Request Logger Middleware
 * Auto-log requests and responses
 */
export function requestLoggerMiddleware(
  requestLogger: RequestLogger,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    req.startTime = startTime;

    // Log request
    requestLogger.logRequest(
      req.method,
      req.path,
      req.correlationId!,
      req.traceId!,
      {
        query: req.query,
        headers: req.headers as Record<string, string>,
        body: req.body,
        userId: (req as any).user?.id,
        ip: req.ip || req.socket.remoteAddress,
      },
    );

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      res.send = originalSend;

      // Log response
      const duration = Date.now() - startTime;
      requestLogger.logResponse(
        req.correlationId!,
        req.traceId!,
        res.statusCode,
        duration,
        {
          body: data,
          headers: res.getHeaders() as Record<string, string>,
        },
      );

      return res.send(data);
    };

    next();
  };
}

/**
 * Error Capturing Middleware
 * Auto-log errors with context
 */
export function errorCapturingMiddleware(
  requestLogger: RequestLogger,
  tracingService: TracingService,
) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log error
    requestLogger.logError(
      req.correlationId!,
      req.traceId!,
      err,
      'high',
      {
        path: req.path,
        method: req.method,
        query: req.query,
        userId: (req as any).user?.id,
        ip: req.ip,
      },
    );

    // Add error to span if exists
    if (req.span) {
      tracingService.addSpanError(req.span, err);
    }

    next(err);
  };
}

/**
 * Performance Profiling Middleware
 * Auto-profile requests
 */
export function performanceProfilingMiddleware(
  profiler: PerformanceProfiler,
  options: {
    enableForAllRequests?: boolean;
    slowRequestThreshold?: number; // in ms
  } = {},
) {
  const {
    enableForAllRequests = false,
    slowRequestThreshold = 1000,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only profile if enabled or if request header asks for it
    const shouldProfile =
      enableForAllRequests ||
      req.headers['x-profile-request'] === 'true';

    if (!shouldProfile) {
      return next();
    }

    // Start profiling session
    const session = profiler.startProfile(
      `HTTP ${req.method} ${req.path}`,
      req.correlationId!,
    );

    // Add response finish listener
    res.on('finish', () => {
      // End profiling
      const report = profiler.endProfile(session);

      // If slow request, log warning
      if (report.duration > slowRequestThreshold) {
        console.warn('Slow request detected', {
          path: req.path,
          duration: report.duration,
          bottlenecks: report.bottlenecks,
        });
      }

      // Add profiling header to response
      res.setHeader('x-profile-duration', report.duration.toString());
      
      if (report.bottlenecks.length > 0) {
        res.setHeader(
          'x-profile-bottlenecks',
          report.bottlenecks.map((b) => b.type).join(','),
        );
      }
    });

    next();
  };
}

/**
 * Health Check Middleware
 * Add /health endpoint
 */
export function healthCheckEndpoint(
  healthCheckManager: any, // HealthCheckManager
) {
  return async (req: Request, res: Response) => {
    try {
      const overall = await healthCheckManager.getOverallHealth();

      // Set appropriate status code
      const statusCode = overall.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        status: overall.status,
        timestamp: new Date(),
        components: overall.components,
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Tracing Info Middleware
 * Add /tracing endpoint to get tracing information
 */
export function tracingInfoEndpoint(
  tracingService: TracingService,
) {
  return (req: Request, res: Response) => {
    const traceId = req.query.traceId as string;

    if (!traceId) {
      return res.status(400).json({
        error: 'Missing traceId query parameter',
      });
    }

    const trace = tracingService.getTrace(traceId);

    if (!trace) {
      return res.status(404).json({
        error: 'Trace not found',
      });
    }

    res.json(trace);
  };
}

/**
 * Performance Stats Middleware
 * Add /performance endpoint to get performance stats
 */
export function performanceStatsEndpoint(
  profiler: PerformanceProfiler,
) {
  return (req: Request, res: Response) => {
    const operation = req.query.operation as string | undefined;

    const stats = {
      operations: profiler.getOperationStats(operation),
      database: profiler.getDatabaseStats(),
      externalCalls: profiler.getExternalCallStats(),
      bottlenecks: profiler.getBottlenecks(),
      slowOperations: profiler.detectSlowOperations(),
    };

    res.json(stats);
  };
}

/**
 * Log Search Middleware
 * Add /logs endpoint to search logs
 */
export function logSearchEndpoint(
  logAggregator: any, // LogAggregator
) {
  return (req: Request, res: Response) => {
    const query = req.query.q as string;
    const filters = {
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      level: req.query.level as any,
      service: req.query.service as string,
      correlationId: req.query.correlationId as string,
      traceId: req.query.traceId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    };

    const results = logAggregator.search(query, filters);

    res.json({
      total: results.length,
      logs: results,
    });
  };
}

/**
 * Setup all observability middleware
 */
export function setupObservabilityMiddleware(
  app: any, // Express app
  services: {
    tracingService: TracingService;
    requestLogger: RequestLogger;
    performanceProfiler: PerformanceProfiler;
    healthCheckManager: any;
    logAggregator: any;
  },
) {
  const {
    tracingService,
    requestLogger,
    performanceProfiler,
    healthCheckManager,
    logAggregator,
  } = services;

  // Apply correlation ID middleware first
  app.use(correlationIdMiddleware(tracingService));

  // Apply tracing middleware
  app.use(tracingMiddleware(tracingService));

  // Apply request logger middleware
  app.use(requestLoggerMiddleware(requestLogger));

  // Apply performance profiling middleware (optional, based on configuration)
  app.use(
    performanceProfilingMiddleware(performanceProfiler, {
      enableForAllRequests: false,
      slowRequestThreshold: 1000,
    }),
  );

  // Setup observability endpoints
  app.get('/health', healthCheckEndpoint(healthCheckManager));
  app.get('/tracing', tracingInfoEndpoint(tracingService));
  app.get('/performance', performanceStatsEndpoint(performanceProfiler));
  app.get('/logs', logSearchEndpoint(logAggregator));

  // Apply error capturing middleware last
  app.use(errorCapturingMiddleware(requestLogger, tracingService));

  console.log('✅ Observability middleware configured');
}
