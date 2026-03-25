import { Request, Response, NextFunction } from 'express';
import prometheus from 'prom-client';

// Create a Registry to register metrics
const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeRequests = new prometheus.Gauge({
  name: 'http_requests_active',
  help: 'Number of active HTTP requests',
  labelNames: ['method', 'route'],
  registers: [register],
});

export const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const cacheOperations = new prometheus.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const queueDepth = new prometheus.Gauge({
  name: 'queue_depth',
  help: 'Number of items in queue',
  labelNames: ['queue'],
  registers: [register],
});

export const websocketConnections = new prometheus.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['type'],
  registers: [register],
});

export const dbConnectionPoolActive = new prometheus.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const dbConnectionPoolMax = new prometheus.Gauge({
  name: 'db_connection_pool_max',
  help: 'Maximum number of database connections',
  registers: [register],
});

/**
 * Middleware to track HTTP metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Get route pattern (e.g., /api/rides/:id instead of /api/rides/123)
  const route = req.route?.path || req.path;
  
  // Increment active requests
  activeRequests.inc({ method: req.method, route });

  // Track response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );
    httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });
    activeRequests.dec({ method: req.method, route });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Endpoint to expose metrics for Prometheus
 */
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};

/**
 * Utility to track database query duration
 */
export const trackDatabaseQuery = async <T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.observe({ operation, table }, duration);
    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.observe({ operation, table }, duration);
    throw error;
  }
};

/**
 * Utility to track cache operations
 */
export const trackCacheOperation = (operation: 'get' | 'set' | 'delete', status: 'hit' | 'miss' | 'success' | 'error') => {
  cacheOperations.inc({ operation, status });
};

/**
 * Update database connection pool metrics
 */
export const updateDbConnectionPoolMetrics = (active: number, max: number) => {
  dbConnectionPoolActive.set(active);
  dbConnectionPoolMax.set(max);
};

/**
 * Update queue depth metric
 */
export const updateQueueDepth = (queue: string, depth: number) => {
  queueDepth.set({ queue }, depth);
};

/**
 * Update WebSocket connections metric
 */
export const updateWebSocketConnections = (type: string, count: number) => {
  websocketConnections.set({ type }, count);
};

export default register;
