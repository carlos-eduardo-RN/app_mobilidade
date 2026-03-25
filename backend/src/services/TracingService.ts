/**
 * Tracing Service
 * Distributed tracing with OpenTelemetry-compatible API
 */

import { Logger } from '../utils/Logger';
import {
  Span,
  SpanStatus,
  SpanEvent,
  SpanError,
  TraceContext,
  TraceExport,
  SamplingConfig,
  SamplingStrategy,
} from '../models/Observability2';
import { v4 as uuidv4 } from 'uuid';

export class TracingService {
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];
  private currentContext: TraceContext | null = null;
  private samplingConfig: SamplingConfig;
  private tracesExported = 0;

  constructor(samplingConfig?: SamplingConfig) {
    this.samplingConfig = samplingConfig || {
      strategy: SamplingStrategy.ALWAYS,
    };
  }

  /**
   * Criar correlation ID único
   */
  createCorrelationId(): string {
    return `corr_${uuidv4()}`;
  }

  /**
   * Criar trace ID único
   */
  private createTraceId(): string {
    return `trace_${uuidv4()}`;
  }

  /**
   * Criar span ID único
   */
  private createSpanId(): string {
    return `span_${uuidv4()}`;
  }

  /**
   * Verificar se deve fazer sampling deste trace
   */
  private shouldSample(): boolean {
    switch (this.samplingConfig.strategy) {
      case SamplingStrategy.ALWAYS:
        return true;

      case SamplingStrategy.NEVER:
        return false;

      case SamplingStrategy.PROBABILISTIC:
        const rate = this.samplingConfig.rate || 1.0;
        return Math.random() < rate;

      case SamplingStrategy.RATE_LIMITING:
        const maxPerSecond = this.samplingConfig.maxTracesPerSecond || 100;
        // Simplified rate limiting (would need proper sliding window in production)
        return this.tracesExported < maxPerSecond;

      default:
        return true;
    }
  }

  /**
   * Iniciar novo span
   */
  startSpan(name: string, parentSpan?: Span, attributes?: Record<string, any>): Span {
    // Check sampling
    if (!this.shouldSample() && !parentSpan) {
      Logger.debug('TracingService', 'Trace not sampled', { name });
      // Return a no-op span
      return this.createNoOpSpan(name);
    }

    const spanId = this.createSpanId();
    const traceId = parentSpan?.traceId || this.createTraceId();

    const span: Span = {
      id: spanId,
      traceId,
      parentId: parentSpan?.id,
      name,
      startTime: new Date(),
      status: SpanStatus.UNSET,
      attributes: attributes || {},
      events: [],
      errors: [],
    };

    this.activeSpans.set(spanId, span);

    // Update context
    if (!this.currentContext || !parentSpan) {
      this.currentContext = {
        traceId,
        spanId,
        parentSpanId: parentSpan?.id,
        correlationId: this.createCorrelationId(),
        baggage: {},
      };
    }

    Logger.debug('TracingService', 'Span started', { spanId, name, traceId });

    return span;
  }

  /**
   * Criar span no-op (quando não faz sampling)
   */
  private createNoOpSpan(name: string): Span {
    return {
      id: 'noop',
      traceId: 'noop',
      name,
      startTime: new Date(),
      status: SpanStatus.UNSET,
      attributes: {},
      events: [],
      errors: [],
    };
  }

  /**
   * Finalizar span
   */
  endSpan(span: Span, status?: SpanStatus): void {
    if (span.id === 'noop') return; // No-op span

    const activeSpan = this.activeSpans.get(span.id);
    if (!activeSpan) {
      Logger.warn('TracingService', 'Span not found', { spanId: span.id });
      return;
    }

    activeSpan.endTime = new Date();
    activeSpan.duration = activeSpan.endTime.getTime() - activeSpan.startTime.getTime();
    activeSpan.status = status || SpanStatus.OK;

    // Move to completed
    this.completedSpans.push(activeSpan);
    this.activeSpans.delete(span.id);

    // Maintain max completed spans
    if (this.completedSpans.length > 10000) {
      this.completedSpans = this.completedSpans.slice(-5000);
    }

    Logger.debug('TracingService', 'Span ended', {
      spanId: span.id,
      duration: activeSpan.duration,
      status: activeSpan.status,
    });
  }

  /**
   * Adicionar evento ao span
   */
  addSpanEvent(span: Span, name: string, attributes?: Record<string, any>): void {
    if (span.id === 'noop') return;

    const activeSpan = this.activeSpans.get(span.id);
    if (activeSpan) {
      const event: SpanEvent = {
        timestamp: new Date(),
        name,
        attributes: attributes || {},
      };
      activeSpan.events.push(event);
    }
  }

  /**
   * Adicionar erro ao span
   */
  addSpanError(span: Span, error: Error | string): void {
    if (span.id === 'noop') return;

    const activeSpan = this.activeSpans.get(span.id);
    if (activeSpan) {
      const spanError: SpanError = {
        timestamp: new Date(),
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'string' ? undefined : error.stack,
        type: typeof error === 'string' ? 'Error' : error.constructor.name,
      };

      activeSpan.errors.push(spanError);
      activeSpan.status = SpanStatus.ERROR;

      Logger.error('TracingService', 'Span error', { spanId: span.id, error: spanError.message });
    }
  }

  /**
   * Adicionar atributos ao span
   */
  addSpanAttributes(span: Span, attributes: Record<string, any>): void {
    if (span.id === 'noop') return;

    const activeSpan = this.activeSpans.get(span.id);
    if (activeSpan) {
      Object.assign(activeSpan.attributes, attributes);
    }
  }

  /**
   * Obter span ativo atual
   */
  getActiveSpan(): Span | null {
    if (!this.currentContext) return null;
    return this.activeSpans.get(this.currentContext.spanId) || null;
  }

  /**
   * Obter context atual
   */
  getCurrentContext(): TraceContext | null {
    return this.currentContext;
  }

  /**
   * Definir context (para propagação)
   */
  setContext(context: TraceContext): void {
    this.currentContext = context;
  }

  /**
   * Obter trace ID atual
   */
  getTraceId(): string | null {
    return this.currentContext?.traceId || null;
  }

  /**
   * Obter correlation ID atual
   */
  getCorrelationId(): string | null {
    return this.currentContext?.correlationId || null;
  }

  /**
   * Propagar context de headers HTTP
   */
  propagateContext(headers: Record<string, string>): TraceContext | null {
    const traceId = headers['x-trace-id'];
    const spanId = headers['x-span-id'];
    const correlationId = headers['x-correlation-id'];

    if (!traceId || !spanId || !correlationId) {
      return null;
    }

    const context: TraceContext = {
      traceId,
      spanId,
      correlationId,
      baggage: {},
    };

    this.setContext(context);
    return context;
  }

  /**
   * Injetar context em headers HTTP
   */
  injectContext(headers: Record<string, string>): void {
    if (!this.currentContext) return;

    headers['x-trace-id'] = this.currentContext.traceId;
    headers['x-span-id'] = this.currentContext.spanId;
    headers['x-correlation-id'] = this.currentContext.correlationId;
  }

  /**
   * Exportar traces completos
   */
  exportTraces(): TraceExport[] {
    const traceMap: Map<string, Span[]> = new Map();

    // Agrupar spans por trace
    for (const span of this.completedSpans) {
      if (!traceMap.has(span.traceId)) {
        traceMap.set(span.traceId, []);
      }
      traceMap.get(span.traceId)?.push(span);
    }

    // Criar exports
    const exports: TraceExport[] = [];

    for (const [traceId, spans] of traceMap.entries()) {
      if (spans.length === 0) continue;

      const startTime = new Date(Math.min(...spans.map((s) => s.startTime.getTime())));
      const endTime = new Date(
        Math.max(...spans.filter((s) => s.endTime).map((s) => s.endTime!.getTime())),
      );

      exports.push({
        traceId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        spans: spans.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
        correlationId: this.currentContext?.correlationId || 'unknown',
        service: 'vou-de-moto',
      });
    }

    this.tracesExported += exports.length;
    Logger.info('TracingService', 'Traces exported', { count: exports.length });

    return exports;
  }

  /**
   * Limpar spans completados
   */
  clearCompletedSpans(): void {
    const count = this.completedSpans.length;
    this.completedSpans = [];
    Logger.info('TracingService', 'Completed spans cleared', { count });
  }

  /**
   * Obter estatísticas
   */
  getStats(): {
    activeSpans: number;
    completedSpans: number;
    tracesExported: number;
    currentTraceId: string | null;
  } {
    return {
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.length,
      tracesExported: this.tracesExported,
      currentTraceId: this.getTraceId(),
    };
  }

  /**
   * Buscar spans por trace ID
   */
  getSpansByTraceId(traceId: string): Span[] {
    return this.completedSpans.filter((s) => s.traceId === traceId);
  }

  /**
   * Buscar trace completo
   */
  getTrace(traceId: string): TraceExport | null {
    const spans = this.getSpansByTraceId(traceId);
    if (spans.length === 0) return null;

    const startTime = new Date(Math.min(...spans.map((s) => s.startTime.getTime())));
    const endTime = new Date(
      Math.max(...spans.filter((s) => s.endTime).map((s) => s.endTime!.getTime())),
    );

    return {
      traceId,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      spans: spans.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      correlationId: this.currentContext?.correlationId || 'unknown',
      service: 'vou-de-moto',
    };
  }

  /**
   * Wrapper helper para executar operação com span automático
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, any>,
  ): Promise<T> {
    const span = this.startSpan(name, this.getActiveSpan() || undefined, attributes);

    try {
      const result = await fn(span);
      this.endSpan(span, SpanStatus.OK);
      return result;
    } catch (error) {
      this.addSpanError(span, error as Error);
      this.endSpan(span, SpanStatus.ERROR);
      throw error;
    }
  }

  /**
   * Exportar para formato Jaeger
   */
  exportToJaeger(): any[] {
    const traces = this.exportTraces();

    return traces.map((trace) => ({
      traceID: trace.traceId,
      spans: trace.spans.map((span) => ({
        traceID: span.traceId,
        spanID: span.id,
        operationName: span.name,
        references: span.parentId
          ? [
              {
                refType: 'CHILD_OF',
                traceID: span.traceId,
                spanID: span.parentId,
              },
            ]
          : [],
        startTime: span.startTime.getTime() * 1000, // microseconds
        duration: (span.duration || 0) * 1000, // microseconds
        tags: Object.entries(span.attributes).map(([key, value]) => ({
          key,
          type: typeof value === 'string' ? 'string' : 'number',
          value,
        })),
        logs: span.events.map((event) => ({
          timestamp: event.timestamp.getTime() * 1000,
          fields: Object.entries(event.attributes).map(([key, value]) => ({
            key,
            type: typeof value === 'string' ? 'string' : 'number',
            value,
          })),
        })),
      })),
      processes: {
        p1: {
          serviceName: trace.service,
          tags: [],
        },
      },
    }));
  }
}
