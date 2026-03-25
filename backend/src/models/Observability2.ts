/**
 * Observability Advanced Models
 * Models for distributed tracing, correlation, profiling
 */

// Span Status
export enum SpanStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  UNSET = 'UNSET',
}

// Span Event
export interface SpanEvent {
  timestamp: Date;
  name: string;
  attributes: Record<string, any>;
}

// Span Error
export interface SpanError {
  timestamp: Date;
  message: string;
  stack?: string;
  type: string;
}

// Span
export interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: SpanStatus;
  attributes: Record<string, any>;
  events: SpanEvent[];
  errors: SpanError[];
}

// Trace Context
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  baggage: Record<string, string>;
}

// Health Status Type
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy';

// Health Status
export interface HealthStatus {
  status: HealthStatusType;
  component: string;
  responseTime: number;
  lastCheck: Date;
  message?: string;
  details?: any;
}

// Overall Health
export interface OverallHealth {
  status: HealthStatusType;
  timestamp: Date;
  components: HealthStatus[];
  uptime: number;
  version: string;
}

// Performance Profile
export interface ProfileSession {
  id: string;
  operation: string;
  startTime: Date;
  correlationId: string;
}

// Bottleneck
export interface Bottleneck {
  operation: string;
  duration: number;
  percentage: number;
  type: 'cpu' | 'memory' | 'io' | 'database' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Profile Report
export interface ProfileReport {
  sessionId: string;
  operation: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  cpuUsage: number;
  memoryUsage: number;
  databaseQueries: number;
  externalCalls: number;
  bottlenecks: Bottleneck[];
  metadata: Record<string, any>;
}

// Flame Graph Node
export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
}

// Slow Operation
export interface SlowOperation {
  id: string;
  operation: string;
  duration: number;
  threshold: number;
  timestamp: Date;
  correlationId: string;
  stackTrace?: string;
}

// Request Log Entry
export interface RequestLogEntry {
  id: string;
  timestamp: Date;
  correlationId: string;
  traceId: string;
  method: string;
  path: string;
  query: Record<string, any>;
  headers: Record<string, string>;
  body?: any;
  userId?: string;
  ip: string;
}

// Response Log Entry
export interface ResponseLogEntry {
  id: string;
  timestamp: Date;
  correlationId: string;
  traceId: string;
  statusCode: number;
  duration: number;
  body?: any;
  headers: Record<string, string>;
}

// Error Log Entry
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  correlationId: string;
  traceId: string;
  errorType: string;
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

// Audit Entry
export interface AuditEntry {
  id: string;
  timestamp: Date;
  correlationId: string;
  action: string;
  actor: string;
  resource: string;
  before?: any;
  after?: any;
  result: 'success' | 'failure';
}

// Log Pattern
export interface LogPattern {
  pattern: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  severity: 'info' | 'warning' | 'error';
  examples: string[];
}

// Log Anomaly
export interface LogAnomaly {
  id: string;
  timestamp: Date;
  type: 'spike' | 'drop' | 'unusual_pattern';
  metric: string;
  expected: number;
  actual: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Log Query Filter
export interface LogQueryFilter {
  startTime?: Date;
  endTime?: Date;
  correlationId?: string;
  traceId?: string;
  level?: string[];
  service?: string[];
  operation?: string[];
  userId?: string;
  limit?: number;
  offset?: number;
}

// Log Entry (Generic)
export interface LogEntry {
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  correlationId: string;
  traceId?: string;
  spanId?: string;
  service: string;
  operation: string;
  duration?: number;
  message: string;
  metadata?: Record<string, any>;
}

// Trace Export
export interface TraceExport {
  traceId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  spans: Span[];
  correlationId: string;
  service: string;
}

// Database Query Log
export interface DatabaseQueryLog {
  id: string;
  timestamp: Date;
  correlationId: string;
  query: string;
  duration: number;
  rowsAffected?: number;
  database: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
}

// External Call Log
export interface ExternalCallLog {
  id: string;
  timestamp: Date;
  correlationId: string;
  service: string;
  method: string;
  url: string;
  duration: number;
  statusCode?: number;
  error?: string;
}

// Sampling Strategy
export enum SamplingStrategy {
  ALWAYS = 'always',
  NEVER = 'never',
  PROBABILISTIC = 'probabilistic',
  RATE_LIMITING = 'rate_limiting',
}

// Sampling Config
export interface SamplingConfig {
  strategy: SamplingStrategy;
  rate?: number; // For probabilistic (0-1)
  maxTracesPerSecond?: number; // For rate limiting
}

// Observability Config
export interface ObservabilityConfig {
  tracing: {
    enabled: boolean;
    sampling: SamplingConfig;
    exportInterval: number; // milliseconds
    exportUrl?: string;
  };
  logging: {
    enabled: boolean;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    maskSensitiveData: boolean;
    aggregationInterval: number;
  };
  profiling: {
    enabled: boolean;
    slowOperationThreshold: number; // milliseconds
    trackDatabaseQueries: boolean;
    trackExternalCalls: boolean;
  };
  healthChecks: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
  };
}
