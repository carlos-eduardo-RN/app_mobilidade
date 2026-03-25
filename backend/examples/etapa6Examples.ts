/**
 * ETAPA 6 - Advanced Observability Examples
 * Practical examples demonstrating distributed tracing, logging, profiling, and health monitoring
 */

import { TracingService } from '../src/services/TracingService';
import { RequestLogger } from '../src/services/RequestLogger';
import { PerformanceProfiler } from '../src/services/PerformanceProfiler';
import { HealthCheckManager } from '../src/services/HealthCheckManager';
import { LogAggregator } from '../src/services/LogAggregator';
import { SamplingStrategy } from '../src/models/Observability2';
import { LogLevel } from '../src/utils/Logger';
import { setupObservabilityMiddleware } from '../src/middleware/ObservabilityMiddleware';

// ============================================
// Example 1: Basic Tracing
// ============================================

export async function example1_basicTracing() {
  console.log('\n=== Example 1: Basic Tracing ===\n');

  const tracingService = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  // Start a span for an operation
  const span = tracingService.startSpan('match-rider-to-driver', undefined, {
    riderId: 'rider_123',
    location: 'São Paulo',
  });

  console.log(`Trace started: ${span.traceId}`);
  console.log(`Span started: ${span.id}`);

  // Add events to track progress
  tracingService.addSpanEvent(span, 'searching-nearby-drivers', {
    radius: '5km',
    count: 12,
  });

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 100));

  tracingService.addSpanEvent(span, 'driver-found', {
    driverId: 'driver_456',
    distance: '2.3km',
  });

  // End the span
  tracingService.endSpan(span);

  console.log(`Span ended with duration: ${span.duration}ms`);
  console.log(`Span status: ${span.status}`);

  // Export trace
  const traces = tracingService.exportTraces();
  console.log(`\nTotal traces: ${traces.length}`);
  console.log(`Trace details:`, JSON.stringify(traces[0], null, 2));
}

// ============================================
// Example 2: Correlation ID Flow
// ============================================

export async function example2_correlationIdFlow() {
  console.log('\n=== Example 2: Correlation ID Flow ===\n');

  const tracingService = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  // Generate correlation ID for request
  const correlationId = tracingService.createCorrelationId();
  console.log(`Correlation ID: ${correlationId}`);

  // Trace request through multiple services
  const parentSpan = tracingService.startSpan('handle-ride-request', undefined, {
    correlationId,
  });

  console.log(`\n1. API Gateway - Request received`);

  // Service A: Authentication
  const authSpan = tracingService.startSpan('authenticate-user', parentSpan, {
    correlationId,
    service: 'auth-service',
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  tracingService.endSpan(authSpan);
  console.log(`2. Auth Service - User authenticated (${authSpan.duration}ms)`);

  // Service B: Ride Matching
  const matchSpan = tracingService.startSpan('match-ride', parentSpan, {
    correlationId,
    service: 'matching-service',
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  tracingService.endSpan(matchSpan);
  console.log(`3. Matching Service - Ride matched (${matchSpan.duration}ms)`);

  // Service C: Notification
  const notifySpan = tracingService.startSpan('send-notification', parentSpan, {
    correlationId,
    service: 'notification-service',
  });
  await new Promise((resolve) => setTimeout(resolve, 75));
  tracingService.endSpan(notifySpan);
  console.log(`4. Notification Service - Notification sent (${notifySpan.duration}ms)`);

  tracingService.endSpan(parentSpan);

  console.log(`\nTotal request duration: ${parentSpan.duration}ms`);

  // Get complete trace
  const trace = tracingService.getTrace(parentSpan.traceId);
  if (trace) {
    console.log(`\nTrace contains ${trace.spans.length} spans`);
    trace.spans.forEach((s) => {
      console.log(`  - ${s.name} (${s.duration}ms)`);
    });
  }
}

// ============================================
// Example 3: Request/Response Logging
// ============================================

export async function example3_requestResponseLogging() {
  console.log('\n=== Example 3: Request/Response Logging ===\n');

  const requestLogger = new RequestLogger();
  const tracingService = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  const correlationId = tracingService.createCorrelationId();
  const span = tracingService.startSpan('POST /api/rides');

  // Log incoming request
  requestLogger.logRequest('POST', '/api/rides', correlationId, span.traceId, {
    query: {},
    headers: {
      'content-type': 'application/json',
      'user-agent': 'VouDeMoto-App/1.0',
      'authorization': 'Bearer secret-token-12345', // Will be masked
    },
    body: {
      riderId: 'rider_789',
      pickup: { lat: -23.550520, lng: -46.633308 },
      destination: { lat: -23.561684, lng: -46.656110 },
      password: 'user-password', // Will be masked
    },
    userId: 'user_123',
    ip: '192.168.1.100',
  });

  console.log('Request logged');

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Log response
  requestLogger.logResponse(correlationId, span.traceId, 201, 215, {
    body: {
      rideId: 'ride_999',
      status: 'PENDING',
      estimatedTime: 5,
    },
    headers: {
      'content-type': 'application/json',
    },
  });

  console.log('Response logged');

  tracingService.endSpan(span);

  // Retrieve request-response pair
  const pair = requestLogger.getRequestResponsePair(correlationId);
  
  console.log('\n--- Request ---');
  console.log(`Method: ${pair.request?.method}`);
  console.log(`Path: ${pair.request?.path}`);
  console.log(`Authorization: ${pair.request?.headers.authorization}`); // Masked
  console.log(`Password in body: ${pair.request?.body.password}`); // Masked

  console.log('\n--- Response ---');
  console.log(`Status: ${pair.response?.statusCode}`);
  console.log(`Duration: ${pair.response?.duration}ms`);
  console.log(`Body:`, pair.response?.body);

  // Get statistics
  const stats = requestLogger.getStats();
  console.log('\n--- Statistics ---');
  console.log(`Total requests: ${stats.totalRequests}`);
  console.log(`Total responses: ${stats.totalResponses}`);
  console.log(`Average duration: ${stats.avgDuration}ms`);
}

// ============================================
// Example 4: Performance Profiling
// ============================================

export async function example4_performanceProfiling() {
  console.log('\n=== Example 4: Performance Profiling ===\n');

  const profiler = new PerformanceProfiler();
  const correlationId = 'corr_perf_test';

  // Start profiling a complex operation
  const session = profiler.startProfile('process-ride-matching', correlationId);
  console.log(`Profiling session started: ${session.id}`);

  // Simulate database queries
  console.log('\n1. Database Operations:');
  await new Promise((resolve) => setTimeout(resolve, 50));
  profiler.trackDatabaseQuery(
    correlationId,
    'SELECT * FROM riders WHERE status = ? AND location_lat BETWEEN ? AND ?',
    45,
    { database: 'voudemoto', rowsAffected: 150 },
  );
  console.log('   - Query riders: 45ms');

  await new Promise((resolve) => setTimeout(resolve, 30));
  profiler.trackDatabaseQuery(
    correlationId,
    'SELECT * FROM drivers WHERE available = ? AND location_lat BETWEEN ? AND ?',
    28,
    { database: 'voudemoto', rowsAffected: 25 },
  );
  console.log('   - Query drivers: 28ms');

  // Simulate external API calls
  console.log('\n2. External API Calls:');
  await new Promise((resolve) => setTimeout(resolve, 120));
  profiler.trackExternalCall(
    correlationId,
    'google-maps-api',
    'POST',
    'https://maps.googleapis.com/maps/api/directions',
    115,
    { statusCode: 200 },
  );
  console.log('   - Google Maps API: 115ms');

  await new Promise((resolve) => setTimeout(resolve, 80));
  profiler.trackExternalCall(
    correlationId,
    'notification-service',
    'POST',
    'https://api.notifications.com/send',
    75,
    { statusCode: 200 },
  );
  console.log('   - Notification Service: 75ms');

  // Simulate more processing
  await new Promise((resolve) => setTimeout(resolve, 100));

  // End profiling
  const report = profiler.endProfile(session);

  console.log('\n--- Performance Report ---');
  console.log(`Total duration: ${report.duration}ms`);
  console.log(`CPU usage: ${report.cpuUsage.toFixed(2)}%`);
  console.log(`Memory usage: ${report.memoryUsage.toFixed(2)}MB`);
  console.log(`Database queries: ${report.databaseQueries}`);
  console.log(`External calls: ${report.externalCalls}`);

  if (report.bottlenecks.length > 0) {
    console.log('\n--- Bottlenecks Detected ---');
    report.bottlenecks.forEach((bottleneck) => {
      console.log(`  - Type: ${bottleneck.type}`);
      console.log(`    Severity: ${bottleneck.severity}`);
      console.log(`    Duration: ${bottleneck.duration}ms`);
      console.log(`    Percentage: ${bottleneck.percentage.toFixed(1)}%`);
    });
  }

  // Get database statistics
  const dbStats = profiler.getDatabaseStats();
  console.log('\n--- Database Statistics ---');
  console.log(`Total queries: ${dbStats.totalQueries}`);
  console.log(`Average duration: ${dbStats.avgDuration.toFixed(2)}ms`);
  console.log(`Slow queries (>100ms): ${dbStats.slowQueries}`);

  // Get external call statistics
  const extStats = profiler.getExternalCallStats();
  console.log('\n--- External Call Statistics ---');
  console.log(`Total calls: ${extStats.totalCalls}`);
  console.log(`Average duration: ${extStats.avgDuration.toFixed(2)}ms`);
  console.log(`Error rate: ${extStats.errorRate.toFixed(2)}%`);
}

// ============================================
// Example 5: Health Check Setup
// ============================================

export async function example5_healthCheckSetup() {
  console.log('\n=== Example 5: Health Check Setup ===\n');

  const healthManager = new HealthCheckManager();

  // Register custom health checks
  healthManager.registerHealthCheck('redis-connection', async () => {
    // Simulate Redis check
    try {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        status: 'healthy',
        component: 'redis',
        responseTime: 20,
        lastCheck: new Date(),
        message: 'Redis connection OK',
        details: { host: 'localhost:6379', connections: 5 },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'redis',
        responseTime: 0,
        lastCheck: new Date(),
        message: 'Redis connection failed',
      };
    }
  });

  healthManager.registerHealthCheck('payment-gateway', async () => {
    // Simulate payment gateway check
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        status: 'healthy',
        component: 'payment-gateway',
        responseTime: 50,
        lastCheck: new Date(),
        message: 'Payment gateway operational',
        details: { provider: 'stripe', latency: '50ms' },
      };
    } catch (error) {
      return {
        status: 'degraded',
        component: 'payment-gateway',
        responseTime: 500,
        lastCheck: new Date(),
        message: 'Payment gateway slow response',
      };
    }
  });

  console.log('Custom health checks registered\n');

  // Run all health checks
  const results = await healthManager.checkAll();

  console.log('--- Health Check Results ---');
  results.forEach((result) => {
    const statusIcon =
      result.status === 'healthy'
        ? '✅'
        : result.status === 'degraded'
        ? '⚠️'
        : '❌';
    console.log(`${statusIcon} ${result.component}: ${result.status} (${result.responseTime}ms)`);
    if (result.message) {
      console.log(`   Message: ${result.message}`);
    }
  });

  // Get overall health
  const overall = await healthManager.getOverallHealth();
  console.log('\n--- Overall System Health ---');
  console.log(`Status: ${overall.status}`);
  console.log(`Components: ${overall.components.length}`);
  console.log(`Timestamp: ${overall.timestamp}`);

  // Get health summary
  const summary = healthManager.getHealthSummary();
  console.log('\n--- Health Summary ---');
  console.log(`Total components: ${summary.total}`);
  console.log(`Healthy: ${summary.healthy}`);
  console.log(`Degraded: ${summary.degraded}`);
  console.log(`Unhealthy: ${summary.unhealthy}`);

  // Check if system is healthy
  const isHealthy = await healthManager.isHealthy();
  console.log(`\nSystem is ${isHealthy ? 'HEALTHY ✅' : 'UNHEALTHY ❌'}`);
}

// ============================================
// Example 6: Log Aggregation and Analysis
// ============================================

export async function example6_logAggregation() {
  console.log('\n=== Example 6: Log Aggregation and Analysis ===\n');

  const logAggregator = new LogAggregator();

  // Simulate logs from multiple services
  console.log('Aggregating logs from multiple services...\n');

  const logs = [
    {
      timestamp: new Date(),
      level: 'INFO' as LogLevel,
      message: 'User logged in successfully',
      correlationId: 'corr_1',
      traceId: 'trace_1',
      service: 'auth-service',
      operation: 'login',
      userId: 'user_123',
      duration: 150,
    },
    {
      timestamp: new Date(),
      level: 'INFO' as LogLevel,
      message: 'Ride request created',
      correlationId: 'corr_2',
      traceId: 'trace_2',
      service: 'ride-service',
      operation: 'create-ride',
      userId: 'user_123',
      duration: 200,
    },
    {
      timestamp: new Date(),
      level: 'ERROR' as LogLevel,
      message: 'Database connection timeout',
      correlationId: 'corr_3',
      traceId: 'trace_3',
      service: 'database-service',
      operation: 'query',
      duration: 5000,
    },
    {
      timestamp: new Date(),
      level: 'WARN' as LogLevel,
      message: 'High memory usage detected',
      correlationId: 'corr_4',
      traceId: 'trace_4',
      service: 'monitoring-service',
      operation: 'health-check',
    },
    {
      timestamp: new Date(),
      level: 'DEBUG' as LogLevel,
      message: 'Cache hit for user preferences',
      correlationId: 'corr_5',
      traceId: 'trace_5',
      service: 'cache-service',
      operation: 'get',
      duration: 5,
    },
  ];

  logAggregator.aggregateMany(logs);

  // Get statistics
  const stats = logAggregator.getStatistics();
  console.log('--- Log Statistics ---');
  console.log(`Total logs: ${stats.totalLogs}`);
  console.log(`Error rate: ${stats.errorRate.toFixed(2)}%`);
  console.log(`Average duration: ${stats.avgDuration?.toFixed(2)}ms`);

  console.log('\n--- Logs by Level ---');
  Object.entries(stats.byLevel).forEach(([level, count]) => {
    console.log(`  ${level}: ${count}`);
  });

  console.log('\n--- Logs by Service ---');
  Object.entries(stats.byService).forEach(([service, count]) => {
    console.log(`  ${service}: ${count}`);
  });

  // Analyze patterns
  const patterns = logAggregator.analyzePatterns();
  console.log('\n--- Log Patterns ---');
  patterns.slice(0, 3).forEach((pattern) => {
    console.log(`  Pattern: ${pattern.pattern}`);
    console.log(`  Count: ${pattern.count}`);
    console.log(`  First seen: ${pattern.firstSeen.toISOString()}`);
    console.log(`  Last seen: ${pattern.lastSeen.toISOString()}`);
    console.log('');
  });

  // Detect anomalies
  const anomalies = logAggregator.detectAnomalies();
  if (anomalies.length > 0) {
    console.log('--- Anomalies Detected ---');
    anomalies.forEach((anomaly) => {
      console.log(`  Type: ${anomaly.type}`);
      console.log(`  Severity: ${anomaly.severity}`);
      console.log(`  Description: ${anomaly.type}`);
      console.log('');
    });
  }

  // Search logs
  const searchResults = logAggregator.search('connection', { level: ['ERROR'] });
  console.log(`\n--- Search Results (query: "connection", level: ERROR) ---`);
  console.log(`Found ${searchResults.length} matching logs`);
  searchResults.forEach((log) => {
    console.log(`  [${log.level}] ${log.service}: ${log.message}`);
  });

  // Get top errors
  const topErrors = logAggregator.getTopErrors(3);
  console.log('\n--- Top Errors ---');
  topErrors.forEach((error, index) => {
    console.log(`  ${index + 1}. ${error.service}:${error.message}`);
    console.log(`     Count: ${error.count}`);
  });

  // Get slow operations
  const slowOps = logAggregator.getSlowOperations(1000);
  console.log('\n--- Slow Operations (>1000ms) ---');
  console.log(`Found ${slowOps.length} slow operations`);
  slowOps.forEach((op) => {
    console.log(`  ${op.service}.${op.operation}: ${op.duration}ms`);
  });
}

// ============================================
// Example 7: Error Tracing
// ============================================

export async function example7_errorTracing() {
  console.log('\n=== Example 7: Error Tracing ===\n');

  const tracingService = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  const requestLogger = new RequestLogger();
  const correlationId = tracingService.createCorrelationId();

  const span = tracingService.startSpan('process-payment', undefined, {
    correlationId,
    userId: 'user_456',
    amount: 50.0,
  });

  console.log(`Processing payment... (${correlationId})`);

  try {
    // Simulate payment processing steps
    tracingService.addSpanEvent(span, 'validating-payment-method');
    await new Promise((resolve) => setTimeout(resolve, 50));

    tracingService.addSpanEvent(span, 'contacting-payment-gateway');
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate error
    throw new Error('Payment gateway timeout - Connection refused');
  } catch (error) {
    console.log(`\n❌ Error occurred: ${(error as Error).message}`);

    // Log error with full context
    requestLogger.logError(correlationId, span.traceId, error as Error, 'critical', {
      userId: 'user_456',
      amount: 50.0,
      paymentMethod: 'credit_card',
      gateway: 'stripe',
      attemptNumber: 1,
    });

    // Add error to span
    tracingService.addSpanError(span, error as Error);
    tracingService.addSpanEvent(span, 'payment-failed', {
      errorType: 'gateway_timeout',
      retryable: true,
    });

    // End span with error status
    tracingService.endSpan(span);

    console.log('\nError details captured:');
    console.log(`  - Trace ID: ${span.traceId}`);
    console.log(`  - Span ID: ${span.id}`);
    console.log(`  - Correlation ID: ${correlationId}`);
    console.log(`  - Duration: ${span.duration}ms`);
    console.log(`  - Status: ${span.status}`);

    // Get error logs
    const errors = requestLogger.getErrors(correlationId);
    console.log('\n--- Error Log ---');
    console.log(`Message: ${errors[0].message}`);
    console.log(`Severity: ${errors[0].severity}`);
    console.log(`Metadata:`, errors[0].metadata);

    // Get complete trace to understand error context
    const trace = tracingService.getTrace(span.traceId);
    if (trace && trace.spans.length > 0) {
      console.log('\n--- Trace Events ---');
      trace.spans[0].events.forEach((event) => {
        console.log(`  ${event.timestamp.toISOString()}: ${event.name}`);
      });
    }
  }
}

// ============================================
// Example 8: Database Profiling
// ============================================

export async function example8_databaseProfiling() {
  console.log('\n=== Example 8: Database Profiling ===\n');

  const profiler = new PerformanceProfiler();
  const correlationId = 'corr_db_profile';

  console.log('Profiling database operations...\n');

  // Simulate various database operations
  const queries = [
    {
      sql: 'SELECT * FROM rides WHERE status = ? ORDER BY created_at DESC LIMIT 100',
      duration: 45,
      operation: 'SELECT',
    },
    {
      sql: 'UPDATE drivers SET location_lat = ?, location_lng = ?, updated_at = ? WHERE id = ?',
      duration: 12,
      operation: 'UPDATE',
    },
    {
      sql: 'INSERT INTO ride_events (ride_id, event_type, timestamp) VALUES (?, ?, ?)',
      duration: 8,
      operation: 'INSERT',
    },
    {
      sql: 'SELECT r.*, d.name, d.rating FROM rides r JOIN drivers d ON r.driver_id = d.id WHERE r.rider_id = ?',
      duration: 120,
      operation: 'SELECT',
    },
    {
      sql: 'DELETE FROM notifications WHERE created_at < ? AND read = ?',
      duration: 250,
      operation: 'DELETE',
    },
  ];

  for (const query of queries) {
    await new Promise((resolve) => setTimeout(resolve, query.duration));
    profiler.trackDatabaseQuery(correlationId, query.sql, query.duration, {});
    console.log(`[${query.operation}] ${query.duration}ms`);
  }

  // Get database statistics
  const dbStats = profiler.getDatabaseStats();

  console.log('\n--- Database Statistics ---');
  console.log(`Total queries: ${dbStats.totalQueries}`);
  console.log(`Average duration: ${dbStats.avgDuration.toFixed(2)}ms`);
  console.log(`Slow queries (>100ms): ${dbStats.slowQueries}`);

  console.log('\n--- Queries by Operation ---');
  Object.entries(dbStats.byOperation).forEach(([operation, stats]) => {
    console.log(`  ${operation}:`);
    console.log(`    Count: ${stats}`);
    console.log(`    Avg duration: N/A`);
  });

  // Detect slow operations
  const slowOps = profiler.detectSlowOperations(100);
  if (slowOps.length > 0) {
    console.log('\n--- Slow Database Operations (>100ms) ---');
    slowOps.forEach((op) => {
      console.log(`  Operation: ${op.operation}`);
      console.log(`  Duration: ${op.duration}ms`);
      console.log(`  Correlation ID: ${op.correlationId}`);
      console.log('');
    });
  }
}

// ============================================
// Example 9: Multi-Service Tracing
// ============================================

export async function example9_multiServiceTracing() {
  console.log('\n=== Example 9: Multi-Service Distributed Tracing ===\n');

  // Service 1: API Gateway
  const apiGateway = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  const correlationId = apiGateway.createCorrelationId();
  const gatewaySpan = apiGateway.startSpan('POST /api/rides', undefined, {
    correlationId,
  });

  console.log(`1. API Gateway received request (${correlationId})`);

  // Propagate context via headers
  const headers: Record<string, string> = {};
  apiGateway.injectContext(headers);

  console.log('2. Context injected into headers:');
  console.log(`   x-trace-id: ${headers['x-trace-id']}`);
  console.log(`   x-correlation-id: ${headers['x-correlation-id']}`);

  // Service 2: Ride Service
  const rideService = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  rideService.propagateContext(headers);
  const rideSpan = rideService.startSpan('create-ride', undefined, {
    correlationId,
  });

  console.log('\n3. Ride Service processing...');
  await new Promise((resolve) => setTimeout(resolve, 100));
  rideService.endSpan(rideSpan);
  console.log(`   Duration: ${rideSpan.duration}ms`);

  // Service 3: Matching Service
  const matchingService = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  matchingService.propagateContext(headers);
  const matchSpan = matchingService.startSpan('find-driver', undefined, {
    correlationId,
  });

  console.log('\n4. Matching Service searching for driver...');
  await new Promise((resolve) => setTimeout(resolve, 200));
  matchingService.endSpan(matchSpan);
  console.log(`   Duration: ${matchSpan.duration}ms`);

  // Service 4: Notification Service
  const notificationService = new TracingService({
    strategy: SamplingStrategy.ALWAYS,
  });

  notificationService.propagateContext(headers);
  const notifySpan = notificationService.startSpan('send-notification', undefined, {
    correlationId,
  });

  console.log('\n5. Notification Service sending notification...');
  await new Promise((resolve) => setTimeout(resolve, 75));
  notificationService.endSpan(notifySpan);
  console.log(`   Duration: ${notifySpan.duration}ms`);

  // Complete request
  apiGateway.endSpan(gatewaySpan);

  console.log('\n6. Request completed');
  console.log(`   Total duration: ${gatewaySpan.duration}ms`);

  // Verify all spans share the same trace ID
  console.log('\n--- Trace Verification ---');
  console.log(`All spans share trace ID: ${gatewaySpan.traceId === rideSpan.traceId && 
    rideSpan.traceId === matchSpan.traceId && 
    matchSpan.traceId === notifySpan.traceId ? '✅' : '❌'}`);

  console.log('\n--- Service Call Chain ---');
  console.log(`api-gateway → ride-service → matching-service → notification-service`);
  console.log(`${gatewaySpan.duration}ms     ${rideSpan.duration}ms           ${matchSpan.duration}ms                  ${notifySpan.duration}ms`);
}

// ============================================
// Example 10: Full Observability Stack
// ============================================

export async function example10_fullIntegration() {
  console.log('\n=== Example 10: Full Observability Stack Integration ===\n');

  // Initialize all observability components
  const tracingService = new TracingService({
    strategy: SamplingStrategy.PROBABILISTIC,
    rate: 1.0,
  });

  const requestLogger = new RequestLogger();
  const profiler = new PerformanceProfiler();
  const healthManager = new HealthCheckManager();
  const logAggregator = new LogAggregator();

  console.log('✅ All observability components initialized\n');

  // Simulate a complete ride matching flow
  const correlationId = tracingService.createCorrelationId();
  const mainSpan = tracingService.startSpan('complete-ride-matching-flow', undefined, {
    correlationId,
  });

  // Start profiling
  const session = profiler.startProfile('ride-matching-flow', correlationId);

  // 1. Log request
  requestLogger.logRequest('POST', '/api/rides', correlationId, mainSpan.traceId, {
    body: { riderId: 'rider_999', pickup: 'Location A', destination: 'Location B' },
    userId: 'user_999',
  });

  logAggregator.aggregate({
    timestamp: new Date(),
    level: 'INFO',
    message: 'Ride matching request received',
    correlationId,
    traceId: mainSpan.traceId,
    service: 'ride-matching',
    operation: 'create-ride',
  });

  // 2. Database operations
  tracingService.addSpanEvent(mainSpan, 'querying-available-drivers');
  await new Promise((resolve) => setTimeout(resolve, 80));
  profiler.trackDatabaseQuery(
    correlationId,
    'SELECT * FROM drivers WHERE available = true AND ST_Distance(location, ?) < 5000',
    75,
    { database: 'voudemoto', rowsAffected: 12 },
  );

  logAggregator.aggregate({
    timestamp: new Date(),
    level: 'DEBUG',
    message: 'Found 12 available drivers',
    correlationId,
    traceId: mainSpan.traceId,
    service: 'ride-matching',
    operation: 'query-drivers',
    duration: 75,
  });

  // 3. External API call
  tracingService.addSpanEvent(mainSpan, 'calculating-routes');
  await new Promise((resolve) => setTimeout(resolve, 150));
  profiler.trackExternalCall(
    correlationId,
    'google-maps',
    'POST',
    '/directions',
    140,
    { statusCode: 200 },
  );

  logAggregator.aggregate({
    timestamp: new Date(),
    level: 'INFO',
    message: 'Route calculated successfully',
    correlationId,
    traceId: mainSpan.traceId,
    service: 'ride-matching',
    operation: 'calculate-route',
    duration: 140,
  });

  // 4. Match algorithm
  tracingService.addSpanEvent(mainSpan, 'running-matching-algorithm');
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 5. Create ride
  await new Promise((resolve) => setTimeout(resolve, 50));
  profiler.trackDatabaseQuery(
    correlationId,
    'INSERT INTO rides (rider_id, driver_id, status) VALUES (?, ?, ?)',
    45,
    { database: 'voudemoto', rowsAffected: 1 },
  );

  // 6. Send notification
  tracingService.addSpanEvent(mainSpan, 'sending-notification');
  await new Promise((resolve) => setTimeout(resolve, 60));
  profiler.trackExternalCall(
    correlationId,
    'notification-service',
    'POST',
    '/notify',
    55,
    { statusCode: 200 },
  );

  // Complete operations
  const report = profiler.endProfile(session);
  tracingService.endSpan(mainSpan);

  requestLogger.logResponse(correlationId, mainSpan.traceId, 201, mainSpan.duration!, {
    body: { rideId: 'ride_new', status: 'MATCHED' },
  });

  logAggregator.aggregate({
    timestamp: new Date(),
    level: 'INFO',
    message: 'Ride matched successfully',
    correlationId,
    traceId: mainSpan.traceId,
    service: 'ride-matching',
    operation: 'complete',
    duration: mainSpan.duration,
  });

  // Check system health
  const health = await healthManager.getOverallHealth();

  // Display complete observability report
  console.log('=================================================');
  console.log('           OBSERVABILITY REPORT');
  console.log('=================================================\n');

  console.log('--- TRACING ---');
  console.log(`Correlation ID: ${correlationId}`);
  console.log(`Trace ID: ${mainSpan.traceId}`);
  console.log(`Total duration: ${mainSpan.duration}ms`);
  console.log(`Span events: ${mainSpan.events.length}`);

  console.log('\n--- PERFORMANCE ---');
  console.log(`CPU usage: ${report.cpuUsage.toFixed(2)}%`);
  console.log(`Memory usage: ${report.memoryUsage.toFixed(2)}MB`);
  console.log(`Database queries: ${report.databaseQueries}`);
  console.log(`External calls: ${report.externalCalls}`);
  if (report.bottlenecks.length > 0) {
    console.log(`Bottlenecks: ${report.bottlenecks.map((b) => b.type).join(', ')}`);
  }

  console.log('\n--- LOGGING ---');
  const logs = logAggregator.getByCorrelationId(correlationId);
  console.log(`Total logs: ${logs.length}`);
  logs.forEach((log) => {
    console.log(`  [${log.level}] ${log.message} (${log.duration || 0}ms)`);
  });

  console.log('\n--- HEALTH ---');
  console.log(`System status: ${health.status.toUpperCase()}`);
  console.log(`Components checked: ${health.components.length}`);

  console.log('\n--- REQUEST/RESPONSE ---');
  const pair = requestLogger.getRequestResponsePair(correlationId);
  console.log(`Request: ${pair.request?.method} ${pair.request?.path}`);
  console.log(`Response: ${pair.response?.statusCode} (${pair.response?.duration}ms)`);

  console.log('\n=================================================');
  console.log('✅ Full observability stack demonstration complete');
  console.log('=================================================\n');
}

// ============================================
// Run All Examples
// ============================================

export async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  ETAPA 6 - Advanced Observability Examples  ║');
  console.log('╚════════════════════════════════════════════════╝');

  await example1_basicTracing();
  await example2_correlationIdFlow();
  await example3_requestResponseLogging();
  await example4_performanceProfiling();
  await example5_healthCheckSetup();
  await example6_logAggregation();
  await example7_errorTracing();
  await example8_databaseProfiling();
  await example9_multiServiceTracing();
  await example10_fullIntegration();

  console.log('\n✅ All examples completed successfully!\n');
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
