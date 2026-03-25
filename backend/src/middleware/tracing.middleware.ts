import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Initialize tracer provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'voudemoto-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
});

// Configure Jaeger exporter
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger-collector:14268/api/traces',
  tags: [],
  maxPacketSize: 65000,
});

// Add span processor
provider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));

// Register the provider
provider.register();

// Register instrumentations
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingPaths: ['/health', '/metrics'],
    }),
    new ExpressInstrumentation(),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
    }),
    new RedisInstrumentation(),
    new MongoDBInstrumentation({
      enhancedDatabaseReporting: true,
    }),
  ],
});

// Get tracer
export const tracer = trace.getTracer('voudemoto-backend');

/**
 * Middleware to add tracing context to requests
 */
export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan(`${req.method} ${req.route?.path || req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.route?.path || req.path,
      'http.user_agent': req.get('user-agent') || 'unknown',
      'http.client_ip': req.ip || req.socket.remoteAddress || 'unknown',
    },
  });

  // Store span in request for access in route handlers
  (req as any).span = span;

  // Add trace context to response headers
  const spanContext = span.spanContext();
  res.setHeader('X-Trace-Id', spanContext.traceId);
  res.setHeader('X-Span-Id', spanContext.spanId);

  // Track response
  const originalSend = res.send;
  res.send = function (data: any) {
    span.setAttribute('http.status_code', res.statusCode);
    
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
    return originalSend.call(this, data);
  };

  // Run next middleware in span context
  context.with(trace.setSpan(context.active(), span), next);
};

/**
 * Utility to create a child span
 */
export const createSpan = (name: string, attributes?: Record<string, any>): Span => {
  return tracer.startSpan(name, { attributes });
};

/**
 * Utility to wrap async function with tracing
 */
export const traceAsyncFunction = async <T>(
  name: string,
  attributes: Record<string, any>,
  fn: (span: Span) => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(name, { attributes });
  
  try {
    const result = await context.with(trace.setSpan(context.active(), span), async () => {
      return await fn(span);
    });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
};

/**
 * Utility to get current span from request
 */
export const getSpanFromRequest = (req: Request): Span | undefined => {
  return (req as any).span;
};

/**
 * Utility to add event to current span
 */
export const addSpanEvent = (req: Request, name: string, attributes?: Record<string, any>) => {
  const span = getSpanFromRequest(req);
  if (span) {
    span.addEvent(name, attributes);
  }
};

/**
 * Utility to set span attribute
 */
export const setSpanAttribute = (req: Request, key: string, value: any) => {
  const span = getSpanFromRequest(req);
  if (span) {
    span.setAttribute(key, value);
  }
};

export default {
  tracer,
  tracingMiddleware,
  createSpan,
  traceAsyncFunction,
  getSpanFromRequest,
  addSpanEvent,
  setSpanAttribute,
};
