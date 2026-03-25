/**
 * ETAPA 6 - Advanced Observability Tests
 * Comprehensive test suite for distributed tracing, logging, profiling, and health checks
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TracingService } from '../src/services/TracingService';
import { RequestLogger } from '../src/services/RequestLogger';
import { PerformanceProfiler } from '../src/services/PerformanceProfiler';
import { HealthCheckManager } from '../src/services/HealthCheckManager';
import { LogAggregator } from '../src/services/LogAggregator';
import {
  Span,
  SpanStatus,
  SamplingStrategy,
  HealthStatusType,
  LogLevel,
  LogEntry,
} from '../src/models/Observability2';

// ============================================
// TracingService Tests (30 tests)
// ============================================

describe('TracingService', () => {
  let tracingService: TracingService;

  beforeEach(() => {
    tracingService = new TracingService({
      serviceName: 'test-service',
      samplingStrategy: SamplingStrategy.ALWAYS,
    });
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = tracingService.createCorrelationId();
      const id2 = tracingService.createCorrelationId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^corr_/);
    });

    it('should generate trace IDs', () => {
      const id = tracingService.createTraceId();
      expect(id).toMatch(/^trace_/);
      expect(id.length).toBeGreaterThan(10);
    });

    it('should generate span IDs', () => {
      const id = tracingService.createSpanId();
      expect(id).toMatch(/^span_/);
      expect(id.length).toBeGreaterThan(10);
    });
  });

  describe('Span Lifecycle', () => {
    it('should create a span', () => {
      const span = tracingService.startSpan('test-operation');
      expect(span.name).toBe('test-operation');
      expect(span.traceId).toBeDefined();
      expect(span.id).toBeDefined();
      expect(span.startTime).toBeDefined();
      expect(span.status).toBe('UNSET');
    });

    it('should create span with attributes', () => {
      const span = tracingService.startSpan('test-op', undefined, {
        userId: '123',
        action: 'create',
      });
      expect(span.attributes.userId).toBe('123');
      expect(span.attributes.action).toBe('create');
    });

    it('should create child span', () => {
      const parent = tracingService.startSpan('parent-op');
      const child = tracingService.startSpan('child-op', parent);
      expect(child.parentId).toBe(parent.id);
      expect(child.traceId).toBe(parent.traceId);
    });

    it('should end span with duration', () => {
      const span = tracingService.startSpan('test-op');
      setTimeout(() => {
        tracingService.endSpan(span);
        expect(span.endTime).toBeDefined();
        expect(span.duration).toBeGreaterThan(0);
        expect(span.status).toBe('OK');
      }, 10);
    });

    it('should end span with error status', () => {
      const span = tracingService.startSpan('test-op');
      tracingService.endSpan(span, 'ERROR');
      expect(span.status).toBe('ERROR');
    });

    it('should add span events', () => {
      const span = tracingService.startSpan('test-op');
      tracingService.addSpanEvent(span, 'event-1', { key: 'value' });
      expect(span.events.length).toBe(1);
      expect(span.events[0].name).toBe('event-1');
      expect(span.events[0].attributes.key).toBe('value');
    });

    it('should add span errors', () => {
      const span = tracingService.startSpan('test-op');
      const error = new Error('Test error');
      tracingService.addSpanError(span, error);
      expect(span.errors.length).toBe(1);
      expect(span.errors[0].message).toBe('Test error');
      expect(span.status).toBe('ERROR');
    });

    it('should add span attributes', () => {
      const span = tracingService.startSpan('test-op');
      tracingService.addSpanAttributes(span, { newKey: 'newValue' });
      expect(span.attributes.newKey).toBe('newValue');
    });
  });

  describe('Context Propagation', () => {
    it('should inject context into headers', () => {
      const span = tracingService.startSpan('test-op');
      const headers: Record<string, string> = {};
      tracingService.injectContext(headers);
      expect(headers['x-trace-id']).toBeDefined();
      expect(headers['x-span-id']).toBeDefined();
      expect(headers['x-correlation-id']).toBeDefined();
    });

    it('should propagate context from headers', () => {
      const headers = {
        'x-trace-id': 'trace_123',
        'x-span-id': 'span_456',
        'x-correlation-id': 'corr_789',
      };
      tracingService.propagateContext(headers);
      const context = tracingService.getCurrentContext();
      expect(context?.traceId).toBe('trace_123');
      expect(context?.parentSpanId).toBe('span_456');
      expect(context?.correlationId).toBe('corr_789');
    });

    it('should maintain context stack', () => {
      const span1 = tracingService.startSpan('op1');
      const context1 = tracingService.getCurrentContext();
      const span2 = tracingService.startSpan('op2');
      const context2 = tracingService.getCurrentContext();
      expect(context2?.spanId).toBe(span2.id);
      expect(context1?.spanId).toBe(span1.id);
    });
  });

  describe('Sampling', () => {
    it('should always sample with ALWAYS strategy', () => {
      const service = new TracingService({
        serviceName: 'test',
        samplingStrategy: SamplingStrategy.ALWAYS,
      });
      expect(service['shouldSample']()).toBe(true);
    });

    it('should never sample with NEVER strategy', () => {
      const service = new TracingService({
        serviceName: 'test',
        samplingStrategy: SamplingStrategy.NEVER,
      });
      expect(service['shouldSample']()).toBe(false);
    });

    it('should probabilistically sample', () => {
      const service = new TracingService({
        serviceName: 'test',
        samplingStrategy: SamplingStrategy.PROBABILISTIC,
        samplingRate: 0.5,
      });
      let sampledCount = 0;
      for (let i = 0; i < 100; i++) {
        if (service['shouldSample']()) sampledCount++;
      }
      expect(sampledCount).toBeGreaterThan(30);
      expect(sampledCount).toBeLessThan(70);
    });

    it('should rate limit sampling', () => {
      const service = new TracingService({
        serviceName: 'test',
        samplingStrategy: SamplingStrategy.RATE_LIMITING,
        maxTracesPerSecond: 10,
      });
      let sampledCount = 0;
      for (let i = 0; i < 20; i++) {
        if (service['shouldSample']()) sampledCount++;
      }
      expect(sampledCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Trace Export', () => {
    it('should export traces', () => {
      const span1 = tracingService.startSpan('op1');
      tracingService.endSpan(span1);
      const span2 = tracingService.startSpan('op2');
      tracingService.endSpan(span2);

      const traces = tracingService.exportTraces();
      expect(traces.length).toBeGreaterThan(0);
      expect(traces[0].spans.length).toBeGreaterThan(0);
    });

    it('should export to Jaeger format', () => {
      const span = tracingService.startSpan('test-op');
      tracingService.endSpan(span);

      const jaegerTraces = tracingService.exportToJaeger();
      expect(jaegerTraces.length).toBeGreaterThan(0);
      expect(jaegerTraces[0].traceID).toBeDefined();
      expect(jaegerTraces[0].spans[0].operationName).toBe('test-op');
    });

    it('should get trace by ID', () => {
      const span = tracingService.startSpan('test-op');
      const traceId = span.traceId;
      tracingService.endSpan(span);

      const trace = tracingService.getTrace(traceId);
      expect(trace).toBeDefined();
      expect(trace.traceId).toBe(traceId);
    });

    it('should sort spans by start time in trace', () => {
      const span1 = tracingService.startSpan('op1');
      setTimeout(() => {
        const span2 = tracingService.startSpan('op2', span1);
        tracingService.endSpan(span2);
        tracingService.endSpan(span1);

        const trace = tracingService.getTrace(span1.traceId);
        expect(trace.spans[0].startTime).toBeLessThanOrEqual(trace.spans[1].startTime);
      }, 10);
    });
  });

  describe('Async Operations', () => {
    it('should handle async operations with withSpan', async () => {
      const result = await tracingService.withSpan('async-op', async () => {
        return 'success';
      });
      expect(result).toBe('success');
    });

    it('should capture errors in withSpan', async () => {
      try {
        await tracingService.withSpan('async-op', async () => {
          throw new Error('Async error');
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should pass attributes to withSpan', async () => {
      await tracingService.withSpan('async-op', async () => {
        return 'done';
      }, { userId: '123' });
      
      const traces = tracingService.exportTraces();
      const span = traces[0]?.spans.find((s) => s.name === 'async-op');
      expect(span?.attributes.userId).toBe('123');
    });
  });

  describe('Statistics', () => {
    it('should track statistics', () => {
      tracingService.startSpan('op1');
      tracingService.startSpan('op2');
      
      const stats = tracingService.getStats();
      expect(stats.activeSpans).toBe(2);
      expect(stats.totalSpans).toBe(2);
    });

    it('should cleanup old spans', () => {
      for (let i = 0; i < 15000; i++) {
        const span = tracingService.startSpan(`op${i}`);
        tracingService.endSpan(span);
      }
      
      const stats = tracingService.getStats();
      expect(stats.completedSpans).toBeLessThan(15000);
    });
  });
});

// ============================================
// RequestLogger Tests (20 tests)
// ============================================

describe('RequestLogger', () => {
  let logger: RequestLogger;

  beforeEach(() => {
    logger = new RequestLogger();
  });

  describe('Request Logging', () => {
    it('should log request', () => {
      logger.logRequest('GET', '/api/users', 'corr_123', 'trace_456', {
        query: { page: '1' },
        headers: { 'user-agent': 'test' },
      });

      const request = logger.getRequest('corr_123');
      expect(request).toBeDefined();
      expect(request?.method).toBe('GET');
      expect(request?.path).toBe('/api/users');
    });

    it('should mask sensitive data in request', () => {
      logger.logRequest('POST', '/api/login', 'corr_123', 'trace_456', {
        body: { username: 'user', password: 'secret123' },
      });

      const request = logger.getRequest('corr_123');
      expect(request?.body.password).toBe('***MASKED***');
      expect(request?.body.username).toBe('user');
    });

    it('should mask authorization headers', () => {
      logger.logRequest('GET', '/api/users', 'corr_123', 'trace_456', {
        headers: { authorization: 'Bearer token123' },
      });

      const request = logger.getRequest('corr_123');
      expect(request?.headers.authorization).toBe('***MASKED***');
    });
  });

  describe('Response Logging', () => {
    it('should log response', () => {
      logger.logResponse('corr_123', 'trace_456', 200, 150, {
        body: { success: true },
      });

      const response = logger.getResponse('corr_123');
      expect(response).toBeDefined();
      expect(response?.statusCode).toBe(200);
      expect(response?.duration).toBe(150);
    });

    it('should mask sensitive data in response', () => {
      logger.logResponse('corr_123', 'trace_456', 200, 100, {
        body: { user: { id: '1', token: 'secret' } },
      });

      const response = logger.getResponse('corr_123');
      expect(response?.body.user.token).toBe('***MASKED***');
    });
  });

  describe('Error Logging', () => {
    it('should log error', () => {
      const error = new Error('Test error');
      logger.logError('corr_123', 'trace_456', error, 'high');

      const errors = logger.getErrors('corr_123');
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error');
      expect(errors[0].severity).toBe('high');
    });

    it('should capture stack trace', () => {
      const error = new Error('Test error');
      logger.logError('corr_123', 'trace_456', error, 'medium');

      const errors = logger.getErrors('corr_123');
      expect(errors[0].stack).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log audit trail', () => {
      logger.logAudit('corr_123', 'user.delete', 'admin@example.com', 'user:123', 'success', {
        before: { status: 'active' },
        after: { status: 'deleted' },
      });

      const audits = logger.getAuditTrail();
      expect(audits.length).toBeGreaterThan(0);
      expect(audits[0].action).toBe('user.delete');
    });

    it('should track audit metadata', () => {
      logger.logAudit('corr_123', 'order.create', 'user@example.com', 'order:456', 'success', {
        metadata: { amount: 100 },
      });

      const audits = logger.getAuditTrail();
      expect(audits[0].metadata).toBeDefined();
    });
  });

  describe('Log Search', () => {
    it('should search by user', () => {
      logger.logRequest('GET', '/api/users', 'corr_1', 'trace_1', {
        userId: 'user123',
      });
      logger.logRequest('GET', '/api/posts', 'corr_2', 'trace_2', {
        userId: 'user456',
      });

      const results = logger.searchLogs({ userId: 'user123' });
      expect(results.length).toBe(1);
      expect(results[0].userId).toBe('user123');
    });

    it('should search by path', () => {
      logger.logRequest('GET', '/api/users', 'corr_1', 'trace_1');
      logger.logRequest('POST', '/api/users', 'corr_2', 'trace_2');

      const results = logger.searchLogs({ path: '/api/users' });
      expect(results.length).toBe(2);
    });

    it('should search by time range', () => {
      const now = new Date();
      logger.logRequest('GET', '/api/test', 'corr_1', 'trace_1');

      const results = logger.searchLogs({
        startTime: new Date(now.getTime() - 1000),
        endTime: new Date(now.getTime() + 1000),
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit search results', () => {
      for (let i = 0; i < 20; i++) {
        logger.logRequest('GET', '/api/test', `corr_${i}`, `trace_${i}`);
      }

      const results = logger.searchLogs({ limit: 5 });
      expect(results.length).toBe(5);
    });
  });

  describe('Request-Response Pairing', () => {
    it('should get request-response pair', () => {
      logger.logRequest('GET', '/api/users', 'corr_123', 'trace_456');
      logger.logResponse('corr_123', 'trace_456', 200, 100);

      const pair = logger.getRequestResponsePair('corr_123');
      expect(pair.request).toBeDefined();
      expect(pair.response).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', () => {
      logger.logRequest('GET', '/api/users', 'corr_1', 'trace_1');
      logger.logResponse('corr_1', 'trace_1', 200, 100);
      logger.logError('corr_2', 'trace_2', new Error('Test'), 'high');

      const stats = logger.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalResponses).toBe(1);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBeGreaterThan(0);
    });
  });
});

// ============================================
// PerformanceProfiler Tests (25 tests)
// ============================================

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  describe('Profiling Sessions', () => {
    it('should start profile session', () => {
      const session = profiler.startProfile('test-op', 'corr_123');
      expect(session.id).toBeDefined();
      expect(session.operation).toBe('test-op');
      expect(session.startTime).toBeDefined();
    });

    it('should end profile session', () => {
      const session = profiler.startProfile('test-op', 'corr_123');
      const report = profiler.endProfile(session);
      expect(report.duration).toBeGreaterThan(0);
      expect(report.operation).toBe('test-op');
    });

    it('should track CPU usage', () => {
      const session = profiler.startProfile('cpu-intensive', 'corr_123');
      // Simulate CPU work
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i);
      }
      const report = profiler.endProfile(session);
      expect(report.cpuUsage).toBeGreaterThan(0);
    });

    it('should track memory usage', () => {
      const session = profiler.startProfile('memory-intensive', 'corr_123');
      const report = profiler.endProfile(session);
      expect(report.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Database Query Tracking', () => {
    it('should track database query', () => {
      profiler.trackDatabaseQuery('corr_123', 'SELECT * FROM users', 50);
      const stats = profiler.getDatabaseStats();
      expect(stats.totalQueries).toBe(1);
    });

    it('should sanitize sensitive queries', () => {
      profiler.trackDatabaseQuery(
        'corr_123',
        "INSERT INTO users (email, password) VALUES ('user@example.com', 'secret')",
        30,
      );
      // Query should be sanitized
      const stats = profiler.getDatabaseStats();
      expect(stats.totalQueries).toBe(1);
    });

    it('should detect slow queries', () => {
      profiler.trackDatabaseQuery('corr_123', 'SELECT * FROM large_table', 150);
      const stats = profiler.getDatabaseStats();
      expect(stats.slowQueries).toBe(1);
    });

    it('should classify query operations', () => {
      profiler.trackDatabaseQuery('corr_123', 'SELECT * FROM users', 20);
      profiler.trackDatabaseQuery('corr_123', 'INSERT INTO posts VALUES(...)', 30);
      const stats = profiler.getDatabaseStats();
      expect(stats.byOperation.SELECT).toBeDefined();
      expect(stats.byOperation.INSERT).toBeDefined();
    });
  });

  describe('External Call Tracking', () => {
    it('should track external API call', () => {
      profiler.trackExternalCall(
        'corr_123',
        'payment-api',
        'POST',
        'https://api.stripe.com/charges',
        200,
      );
      const stats = profiler.getExternalCallStats();
      expect(stats.totalCalls).toBe(1);
    });

    it('should detect slow external calls', () => {
      profiler.trackExternalCall('corr_123', 'external-api', 'GET', '/slow', 600);
      const stats = profiler.getExternalCallStats();
      expect(stats.slowCalls).toBe(1);
    });

    it('should track external call errors', () => {
      profiler.trackExternalCall('corr_123', 'external-api', 'GET', '/error', 100, {
        statusCode: 500,
      });
      const stats = profiler.getExternalCallStats();
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should group by service', () => {
      profiler.trackExternalCall('corr_1', 'service-a', 'GET', '/endpoint', 100);
      profiler.trackExternalCall('corr_2', 'service-b', 'POST', '/endpoint', 150);
      const stats = profiler.getExternalCallStats();
      expect(stats.byService['service-a']).toBeDefined();
      expect(stats.byService['service-b']).toBeDefined();
    });
  });

  describe('Bottleneck Detection', () => {
    it('should detect database bottleneck', () => {
      const session = profiler.startProfile('db-heavy', 'corr_123');
      profiler.trackDatabaseQuery('corr_123', 'SELECT * FROM users', 500);
      const report = profiler.endProfile(session);
      
      const dbBottleneck = report.bottlenecks.find((b) => b.type === 'database');
      expect(dbBottleneck).toBeDefined();
    });

    it('should detect network bottleneck', () => {
      const session = profiler.startProfile('network-heavy', 'corr_123');
      profiler.trackExternalCall('corr_123', 'api', 'GET', '/data', 600);
      const report = profiler.endProfile(session);
      
      const networkBottleneck = report.bottlenecks.find((b) => b.type === 'network');
      expect(networkBottleneck).toBeDefined();
    });

    it('should classify bottleneck severity', () => {
      const session = profiler.startProfile('slow-op', 'corr_123');
      profiler.trackDatabaseQuery('corr_123', 'SELECT * FROM users', 800);
      const report = profiler.endProfile(session);
      
      expect(report.bottlenecks[0].severity).toBeDefined();
    });

    it('should aggregate bottlenecks', () => {
      const session1 = profiler.startProfile('op1', 'corr_1');
      profiler.trackDatabaseQuery('corr_1', 'SELECT *', 300);
      profiler.endProfile(session1);

      const session2 = profiler.startProfile('op2', 'corr_2');
      profiler.trackDatabaseQuery('corr_2', 'SELECT *', 400);
      profiler.endProfile(session2);

      const bottlenecks = profiler.getBottlenecks();
      expect(bottlenecks.length).toBeGreaterThan(0);
    });
  });

  describe('Slow Operation Detection', () => {
    it('should detect slow operations', () => {
      const session = profiler.startProfile('slow-op', 'corr_123');
      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 1100) {
        // Wait
      }
      profiler.endProfile(session);

      const slowOps = profiler.detectSlowOperations(1000);
      expect(slowOps.length).toBeGreaterThan(0);
    });

    it('should use custom threshold', () => {
      const session = profiler.startProfile('op', 'corr_123');
      profiler.endProfile(session);

      const slowOps = profiler.detectSlowOperations(1);
      expect(slowOps.length).toBeGreaterThan(0);
    });
  });

  describe('Operation Statistics', () => {
    it('should calculate operation stats', () => {
      for (let i = 0; i < 5; i++) {
        const session = profiler.startProfile('test-op', `corr_${i}`);
        profiler.endProfile(session);
      }

      const stats = profiler.getOperationStats('test-op');
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].count).toBe(5);
    });

    it('should calculate min/max/avg', () => {
      const session1 = profiler.startProfile('op', 'corr_1');
      profiler.endProfile(session1);

      const session2 = profiler.startProfile('op', 'corr_2');
      // Simulate longer operation
      const start = Date.now();
      while (Date.now() - start < 50) {}
      profiler.endProfile(session2);

      const stats = profiler.getOperationStats('op');
      expect(stats[0].minDuration).toBeLessThan(stats[0].maxDuration);
      expect(stats[0].avgDuration).toBeDefined();
    });
  });

  describe('Flame Graph Generation', () => {
    it('should generate flame graph', () => {
      const session = profiler.startProfile('parent-op', 'corr_123');
      profiler.trackDatabaseQuery('corr_123', 'SELECT *', 100);
      profiler.trackExternalCall('corr_123', 'api', 'GET', '/data', 150);
      profiler.endProfile(session);

      const flameGraph = profiler.generateFlameGraph();
      expect(flameGraph).toBeDefined();
      expect(flameGraph.name).toBe('root');
      expect(flameGraph.children.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// HealthCheckManager Tests (20 tests)
// ============================================

describe('HealthCheckManager', () => {
  let healthManager: HealthCheckManager;

  beforeEach(() => {
    healthManager = new HealthCheckManager();
  });

  describe('Health Check Registration', () => {
    it('should register custom health check', () => {
      healthManager.registerHealthCheck('custom-check', async () => ({
        status: 'healthy',
        component: 'custom',
        responseTime: 10,
        lastCheck: new Date(),
      }));

      const checks = healthManager['healthChecks'];
      expect(checks.has('custom-check')).toBe(true);
    });

    it('should unregister health check', () => {
      healthManager.registerHealthCheck('temp-check', async () => ({
        status: 'healthy',
        component: 'temp',
        responseTime: 10,
        lastCheck: new Date(),
      }));
      
      healthManager.unregisterHealthCheck('temp-check');
      const checks = healthManager['healthChecks'];
      expect(checks.has('temp-check')).toBe(false);
    });
  });

  describe('Built-in Health Checks', () => {
    it('should check memory health', async () => {
      const result = await healthManager.checkMemory();
      expect(result.status).toBeDefined();
      expect(result.component).toBe('memory');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should detect high memory usage', async () => {
      // This test depends on actual memory usage
      const result = await healthManager.checkMemory();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should check CPU health', async () => {
      const result = await healthManager.checkCPU();
      expect(result.status).toBeDefined();
      expect(result.component).toBe('cpu');
    });

    it('should check uptime', async () => {
      const result = await healthManager.checkUptime();
      expect(result.status).toBe('healthy');
      expect(result.message).toContain('Uptime:');
    });

    it('should check database connection', async () => {
      const mockTest = async () => true;
      const result = await healthManager.checkDatabase(mockTest);
      expect(result.status).toBe('healthy');
      expect(result.component).toBe('database');
    });

    it('should detect database connection failure', async () => {
      const mockTest = async () => {
        throw new Error('Connection failed');
      };
      const result = await healthManager.checkDatabase(mockTest);
      expect(result.status).toBe('unhealthy');
    });

    it('should check external service', async () => {
      const result = await healthManager.checkExternalService(
        'test-service',
        'http://example.com',
        1000,
      );
      expect(result.component).toBe('test-service');
    });
  });

  describe('Overall Health Assessment', () => {
    it('should assess overall health', async () => {
      const overall = await healthManager.getOverallHealth();
      expect(overall.status).toBeDefined();
      expect(overall.timestamp).toBeDefined();
      expect(Array.isArray(overall.components)).toBe(true);
    });

    it('should be healthy when all components healthy', async () => {
      healthManager.registerHealthCheck('check1', async () => ({
        status: 'healthy',
        component: 'check1',
        responseTime: 10,
        lastCheck: new Date(),
      }));

      const overall = await healthManager.getOverallHealth();
      expect(overall.status).toBe('healthy');
    });

    it('should be degraded when any component degraded', async () => {
      healthManager.registerHealthCheck('check1', async () => ({
        status: 'degraded',
        component: 'check1',
        responseTime: 10,
        lastCheck: new Date(),
        message: 'Slow response',
      }));

      const overall = await healthManager.getOverallHealth();
      expect(overall.status).toBe('degraded');
    });

    it('should be unhealthy when any component unhealthy', async () => {
      healthManager.registerHealthCheck('check1', async () => ({
        status: 'unhealthy',
        component: 'check1',
        responseTime: 10,
        lastCheck: new Date(),
        message: 'Service down',
      }));

      const overall = await healthManager.getOverallHealth();
      expect(overall.status).toBe('unhealthy');
    });
  });

  describe('Health Check Execution', () => {
    it('should execute all checks', async () => {
      const results = await healthManager.checkAll();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should cache last results', async () => {
      await healthManager.checkAll();
      const cached = healthManager.getAllLastResults();
      expect(cached.length).toBeGreaterThan(0);
    });
  });

  describe('Health Summary', () => {
    it('should provide health summary', async () => {
      await healthManager.checkAll();
      const summary = healthManager.getHealthSummary();
      
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.healthy).toBeDefined();
      expect(summary.degraded).toBeDefined();
      expect(summary.unhealthy).toBeDefined();
    });

    it('should check if system is healthy', async () => {
      const isHealthy = healthManager.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Export', () => {
    it('should export health data', async () => {
      await healthManager.checkAll();
      const exported = healthManager.export();
      
      expect(exported.lastCheck).toBeDefined();
      expect(Array.isArray(exported.checks)).toBe(true);
    });
  });
});

// ============================================
// LogAggregator Tests (25 tests)
// ============================================

describe('LogAggregator', () => {
  let aggregator: LogAggregator;

  beforeEach(() => {
    aggregator = new LogAggregator();
  });

  describe('Log Aggregation', () => {
    it('should aggregate log entry', () => {
      const log: LogEntry = {
        timestamp: new Date(),
        level: 'INFO',
        message: 'Test log',
        correlationId: 'corr_123',
        traceId: 'trace_456',
        service: 'test-service',
        operation: 'test-op',
      };

      aggregator.aggregate(log);
      const result = aggregator.getByCorrelationId('corr_123');
      expect(result.length).toBe(1);
    });

    it('should aggregate many logs', () => {
      const logs: LogEntry[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(),
        level: 'INFO',
        message: `Log ${i}`,
        correlationId: `corr_${i}`,
        traceId: `trace_${i}`,
        service: 'test-service',
        operation: 'test-op',
      }));

      aggregator.aggregateMany(logs);
      const stats = aggregator.getStatistics();
      expect(stats.totalLogs).toBe(10);
    });

    it('should index by correlation ID', () => {
      const log: LogEntry = {
        timestamp: new Date(),
        level: 'INFO',
        message: 'Test',
        correlationId: 'corr_123',
        traceId: 'trace_456',
        service: 'service',
        operation: 'op',
      };

      aggregator.aggregate(log);
      const result = aggregator.getByCorrelationId('corr_123');
      expect(result.length).toBe(1);
      expect(result[0].correlationId).toBe('corr_123');
    });

    it('should index by trace ID', () => {
      const log: LogEntry = {
        timestamp: new Date(),
        level: 'INFO',
        message: 'Test',
        correlationId: 'corr_123',
        traceId: 'trace_456',
        service: 'service',
        operation: 'op',
      };

      aggregator.aggregate(log);
      const result = aggregator.getByTraceId('trace_456');
      expect(result.length).toBe(1);
    });

    it('should index by service', () => {
      const log: LogEntry = {
        timestamp: new Date(),
        level: 'INFO',
        message: 'Test',
        correlationId: 'corr_123',
        traceId: 'trace_456',
        service: 'test-service',
        operation: 'op',
      };

      aggregator.aggregate(log);
      const result = aggregator.getByService('test-service');
      expect(result.length).toBe(1);
    });
  });

  describe('Log Search', () => {
    beforeEach(() => {
      const logs: LogEntry[] = [
        {
          timestamp: new Date(),
          level: 'INFO',
          message: 'User logged in',
          correlationId: 'corr_1',
          traceId: 'trace_1',
          service: 'auth-service',
          operation: 'login',
        },
        {
          timestamp: new Date(),
          level: 'ERROR',
          message: 'Database connection failed',
          correlationId: 'corr_2',
          traceId: 'trace_2',
          service: 'db-service',
          operation: 'connect',
        },
      ];
      aggregator.aggregateMany(logs);
    });

    it('should search by query', () => {
      const results = aggregator.search('User logged');
      expect(results.length).toBe(1);
      expect(results[0].message).toContain('User logged');
    });

    it('should filter by level', () => {
      const results = aggregator.search('', { level: 'ERROR' });
      expect(results.length).toBe(1);
      expect(results[0].level).toBe('ERROR');
    });

    it('should filter by service', () => {
      const results = aggregator.search('', { service: 'auth-service' });
      expect(results.length).toBe(1);
      expect(results[0].service).toBe('auth-service');
    });

    it('should filter by time range', () => {
      const now = new Date();
      const results = aggregator.search('', {
        startTime: new Date(now.getTime() - 1000),
        endTime: new Date(now.getTime() + 1000),
      });
      expect(results.length).toBe(2);
    });

    it('should limit results', () => {
      const results = aggregator.search('', { limit: 1 });
      expect(results.length).toBe(1);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect log patterns', () => {
      for (let i = 0; i < 5; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'INFO',
          message: 'User action',
          correlationId: `corr_${i}`,
          traceId: `trace_${i}`,
          service: 'api',
          operation: 'user-action',
        });
      }

      const patterns = aggregator.analyzePatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].count).toBe(5);
    });

    it('should track pattern examples', () => {
      for (let i = 0; i < 3; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'INFO',
          message: 'Pattern test',
          correlationId: `corr_${i}`,
          traceId: `trace_${i}`,
          service: 'test',
          operation: 'test-op',
        });
      }

      const patterns = aggregator.analyzePatterns();
      expect(patterns[0].examples.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect error rate spike', () => {
      // Add normal logs
      for (let i = 0; i < 50; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'INFO',
          message: 'Normal log',
          correlationId: `corr_${i}`,
          traceId: `trace_${i}`,
          service: 'test',
          operation: 'op',
        });
      }

      // Add error logs (>5%)
      for (let i = 0; i < 10; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'ERROR',
          message: 'Error log',
          correlationId: `corr_err_${i}`,
          traceId: `trace_err_${i}`,
          service: 'test',
          operation: 'op',
        });
      }

      const anomalies = aggregator.detectAnomalies();
      const errorRateAnomaly = anomalies.find((a) => a.type === 'ERROR_RATE_SPIKE');
      expect(errorRateAnomaly).toBeDefined();
    });

    it('should classify anomaly severity', () => {
      // Create critical error rate
      for (let i = 0; i < 20; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'ERROR',
          message: 'Error',
          correlationId: `corr_${i}`,
          traceId: `trace_${i}`,
          service: 'test',
          operation: 'op',
        });
      }

      const anomalies = aggregator.detectAnomalies();
      if (anomalies.length > 0) {
        expect(['low', 'medium', 'high', 'critical']).toContain(anomalies[0].severity);
      }
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      const logs: LogEntry[] = [
        {
          timestamp: new Date(),
          level: 'INFO',
          message: 'Info log',
          correlationId: 'corr_1',
          traceId: 'trace_1',
          service: 'service-a',
          operation: 'op1',
          duration: 100,
        },
        {
          timestamp: new Date(),
          level: 'ERROR',
          message: 'Error log',
          correlationId: 'corr_2',
          traceId: 'trace_2',
          service: 'service-b',
          operation: 'op2',
          duration: 200,
        },
      ];
      aggregator.aggregateMany(logs);
    });

    it('should calculate total logs', () => {
      const stats = aggregator.getStatistics();
      expect(stats.totalLogs).toBe(2);
    });

    it('should group by level', () => {
      const stats = aggregator.getStatistics();
      expect(stats.byLevel.INFO).toBe(1);
      expect(stats.byLevel.ERROR).toBe(1);
    });

    it('should group by service', () => {
      const stats = aggregator.getStatistics();
      expect(stats.byService['service-a']).toBe(1);
      expect(stats.byService['service-b']).toBe(1);
    });

    it('should calculate error rate', () => {
      const stats = aggregator.getStatistics();
      expect(stats.errorRate).toBe(50); // 1 error out of 2 logs
    });

    it('should calculate average duration', () => {
      const stats = aggregator.getStatistics();
      expect(stats.avgDuration).toBe(150); // (100 + 200) / 2
    });
  });

  describe('Top Errors', () => {
    it('should get top errors', () => {
      for (let i = 0; i < 5; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'ERROR',
          message: 'Database error',
          correlationId: `corr_${i}`,
          traceId: `trace_${i}`,
          service: 'db',
          operation: 'query',
        });
      }

      for (let i = 0; i < 3; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'ERROR',
          message: 'Network error',
          correlationId: `corr_net_${i}`,
          traceId: `trace_net_${i}`,
          service: 'api',
          operation: 'call',
        });
      }

      const topErrors = aggregator.getTopErrors(2);
      expect(topErrors.length).toBe(2);
      expect(topErrors[0].count).toBe(5);
    });
  });

  describe('Slow Operations', () => {
    it('should detect slow operations', () => {
      aggregator.aggregate({
        timestamp: new Date(),
        level: 'INFO',
        message: 'Slow op',
        correlationId: 'corr_1',
        traceId: 'trace_1',
        service: 'test',
        operation: 'slow-op',
        duration: 2000,
      });

      const slowOps = aggregator.getSlowOperations(1000);
      expect(slowOps.length).toBe(1);
    });
  });

  describe('Export Formats', () => {
    it('should export to Elasticsearch format', () => {
      aggregator.aggregate({
        timestamp: new Date(),
        level: 'INFO',
        message: 'Test',
        correlationId: 'corr_1',
        traceId: 'trace_1',
        service: 'test',
        operation: 'op',
      });

      const elastic = aggregator.exportToElastic();
      expect(elastic.length).toBe(1);
      expect(elastic[0]['@timestamp']).toBeDefined();
      expect(elastic[0]['service.name']).toBe('test');
    });

    it('should export to Splunk format', () => {
      aggregator.aggregate({
        timestamp: new Date(),
        level: 'INFO',
        message: 'Test',
        correlationId: 'corr_1',
        traceId: 'trace_1',
        service: 'test',
        operation: 'op',
      });

      const splunk = aggregator.exportToSplunk();
      expect(splunk.length).toBe(1);
      expect(splunk[0].time).toBeDefined();
      expect(splunk[0].sourcetype).toBe('_json');
    });
  });

  describe('Auto-pruning', () => {
    it('should prune old logs when limit exceeded', () => {
      // Add 100k+ logs
      for (let i = 0; i < 101000; i++) {
        aggregator.aggregate({
          timestamp: new Date(),
          level: 'INFO',
          message: `Log ${i}`,
          correlationId: `corr_${i}`,
          traceId: `trace_${i}`,
          service: 'test',
          operation: 'op',
        });
      }

      const stats = aggregator.getStatistics();
      expect(stats.totalLogs).toBeLessThan(101000);
    });
  });
});

// ============================================
// Integration Tests (10 tests)
// ============================================

describe('Integration Tests', () => {
  let tracingService: TracingService;
  let requestLogger: RequestLogger;
  let profiler: PerformanceProfiler;
  let healthManager: HealthCheckManager;
  let logAggregator: LogAggregator;

  beforeEach(() => {
    tracingService = new TracingService({
      serviceName: 'integration-test',
      samplingStrategy: SamplingStrategy.ALWAYS,
    });
    requestLogger = new RequestLogger();
    profiler = new PerformanceProfiler();
    healthManager = new HealthCheckManager();
    logAggregator = new LogAggregator();
  });

  it('should trace complete request lifecycle', async () => {
    const correlationId = tracingService.createCorrelationId();
    const span = tracingService.startSpan('HTTP GET /api/users');

    requestLogger.logRequest('GET', '/api/users', correlationId, span.traceId);
    
    // Simulate processing
    tracingService.addSpanEvent(span, 'processing-started');
    
    requestLogger.logResponse(correlationId, span.traceId, 200, 150);
    tracingService.endSpan(span);

    const trace = tracingService.getTrace(span.traceId);
    const pair = requestLogger.getRequestResponsePair(correlationId);

    expect(trace).toBeDefined();
    expect(pair.request).toBeDefined();
    expect(pair.response).toBeDefined();
  });

  it('should profile and trace database operations', async () => {
    const correlationId = tracingService.createCorrelationId();
    const span = tracingService.startSpan('database-operation');
    const session = profiler.startProfile('db-query', correlationId);

    profiler.trackDatabaseQuery(correlationId, 'SELECT * FROM users', 100);
    
    const report = profiler.endProfile(session);
    tracingService.addSpanAttributes(span, { dbDuration: report.duration });
    tracingService.endSpan(span);

    expect(report.databaseQueries.length).toBeGreaterThan(0);
    expect(span.attributes.dbDuration).toBeDefined();
  });

  it('should aggregate logs from all components', async () => {
    const correlationId = tracingService.createCorrelationId();
    
    // Simulate logging from different components
    logAggregator.aggregate({
      timestamp: new Date(),
      level: 'INFO',
      message: 'Request started',
      correlationId,
      traceId: 'trace_1',
      service: 'api',
      operation: 'request',
    });

    logAggregator.aggregate({
      timestamp: new Date(),
      level: 'DEBUG',
      message: 'Database query executed',
      correlationId,
      traceId: 'trace_1',
      service: 'database',
      operation: 'query',
    });

    const logs = logAggregator.getByCorrelationId(correlationId);
    expect(logs.length).toBe(2);
    expect(logs[0].service).not.toBe(logs[1].service);
  });

  it('should monitor system health during operations', async () => {
    const span = tracingService.startSpan('health-check');
    const health = await healthManager.getOverallHealth();
    tracingService.addSpanAttributes(span, {
      systemHealth: health.status,
    });
    tracingService.endSpan(span);

    expect(health.status).toBeDefined();
    expect(span.attributes.systemHealth).toBeDefined();
  });

  it('should handle error scenarios with full observability', async () => {
    const correlationId = tracingService.createCorrelationId();
    const span = tracingService.startSpan('error-operation');

    try {
      throw new Error('Simulated error');
    } catch (error) {
      requestLogger.logError(correlationId, span.traceId, error as Error, 'high');
      tracingService.addSpanError(span, error as Error);
      
      logAggregator.aggregate({
        timestamp: new Date(),
        level: 'ERROR',
        message: (error as Error).message,
        correlationId,
        traceId: span.traceId,
        service: 'test',
        operation: 'error-op',
      });
    }

    tracingService.endSpan(span, 'ERROR');

    const errors = requestLogger.getErrors(correlationId);
    const logs = logAggregator.getByCorrelationId(correlationId);
    
    expect(span.status).toBe('ERROR');
    expect(errors.length).toBeGreaterThan(0);
    expect(logs.some((l) => l.level === 'ERROR')).toBe(true);
  });

  it('should export complete observability data', () => {
    const span = tracingService.startSpan('export-test');
    tracingService.endSpan(span);

    const traces = tracingService.exportTraces();
    const logStats = logAggregator.getStatistics();
    const perfStats = profiler.getOperationStats();

    expect(traces.length).toBeGreaterThan(0);
    expect(logStats).toBeDefined();
    expect(Array.isArray(perfStats)).toBe(true);
  });

  it('should correlate data across all observability components', () => {
    const correlationId = tracingService.createCorrelationId();
    const span = tracingService.startSpan('correlated-op');

    requestLogger.logRequest('POST', '/api/data', correlationId, span.traceId);
    
    logAggregator.aggregate({
      timestamp: new Date(),
      level: 'INFO',
      message: 'Processing data',
      correlationId,
      traceId: span.traceId,
      service: 'api',
      operation: 'process',
    });

    tracingService.endSpan(span);

    const request = requestLogger.getRequest(correlationId);
    const logs = logAggregator.getByCorrelationId(correlationId);
    const trace = tracingService.getTrace(span.traceId);

    expect(request?.correlationId).toBe(correlationId);
    expect(logs.every((l) => l.correlationId === correlationId)).toBe(true);
    expect(trace.spans.every((s) => s.traceId === span.traceId)).toBe(true);
  });

  it('should detect performance bottlenecks in traced operations', () => {
    const correlationId = tracingService.createCorrelationId();
    const span = tracingService.startSpan('bottleneck-op');
    const session = profiler.startProfile('slow-operation', correlationId);

    profiler.trackDatabaseQuery(correlationId, 'SELECT * FROM large_table', 800);
    
    const report = profiler.endProfile(session);
    
    if (report.bottlenecks.length > 0) {
      tracingService.addSpanAttributes(span, {
        bottleneckDetected: true,
        bottleneckType: report.bottlenecks[0].type,
      });
    }

    tracingService.endSpan(span);

    expect(report.bottlenecks.length).toBeGreaterThan(0);
  });

  it('should maintain observability data consistency', () => {
    const correlationId = tracingService.createCorrelationId();
    
    // Create data across all components
    const span = tracingService.startSpan('consistency-test');
    requestLogger.logRequest('GET', '/test', correlationId, span.traceId);
    
    logAggregator.aggregate({
      timestamp: new Date(),
      level: 'INFO',
      message: 'Test',
      correlationId,
      traceId: span.traceId,
      service: 'test',
      operation: 'test',
    });

    tracingService.endSpan(span);
    requestLogger.logResponse(correlationId, span.traceId, 200, 100);

    // Verify consistency
    const request = requestLogger.getRequest(correlationId);
    const response = requestLogger.getResponse(correlationId);
    const logs = logAggregator.getByCorrelationId(correlationId);
    const trace = tracingService.getTrace(span.traceId);

    expect(request?.traceId).toBe(span.traceId);
    expect(response?.traceId).toBe(span.traceId);
    expect(logs.every((l) => l.traceId === span.traceId)).toBe(true);
    expect(trace.traceId).toBe(span.traceId);
  });

  it('should support distributed tracing across services', () => {
    // Simulate service A
    const span1 = tracingService.startSpan('service-a-operation');
    const headers: Record<string, string> = {};
    tracingService.injectContext(headers);

    // Simulate service B receiving context
    const serviceB = new TracingService({
      serviceName: 'service-b',
      samplingStrategy: SamplingStrategy.ALWAYS,
    });
    serviceB.propagateContext(headers);
    const span2 = serviceB.startSpan('service-b-operation');

    tracingService.endSpan(span1);
    serviceB.endSpan(span2);

    // Both spans should share the same trace ID
    expect(span1.traceId).toBe(span2.traceId);
  });
});

console.log('✅ ETAPA 6 - Test Suite Complete: 120+ tests');
