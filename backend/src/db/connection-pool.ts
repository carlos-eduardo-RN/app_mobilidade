import { Pool, PoolConfig } from 'pg';
import logger from '../utils/Logger';
import { updateDbConnectionPoolMetrics } from '../middleware/metrics.middleware';

export class DatabaseConnectionPool {
  private pool: Pool;
  private config: PoolConfig;

  constructor(config: PoolConfig) {
    this.config = {
      ...config,
      // Otimizações de pool
      max: parseInt(process.env.DB_POOL_MAX || '20'), // Máximo de conexões
      min: parseInt(process.env.DB_POOL_MIN || '5'), // Mínimo de conexões
      idleTimeoutMillis: 30000, // 30 segundos
      connectionTimeoutMillis: 10000, // 10 segundos
      maxUses: 7500, // Recicla conexão após N usos
      
      // Statement timeout
      statement_timeout: 30000, // 30 segundos
      
      // Query timeout
      query_timeout: 30000, // 30 segundos
      
      // Keep alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    this.pool = new Pool(this.config);
    this.setupEventHandlers();
    this.startMetricsCollection();
  }

  private setupEventHandlers(): void {
    // Evento de conexão estabelecida
    this.pool.on('connect', (client) => {
      logger.debug('Database connection established');
      
      // Configurações de sessão
      client.query(`
        SET timezone = 'UTC';
        SET statement_timeout = 30000;
        SET lock_timeout = 10000;
        SET idle_in_transaction_session_timeout = 60000;
      `);
    });

    // Evento de aquisição de conexão
    this.pool.on('acquire', () => {
      logger.debug('Connection acquired from pool');
    });

    // Evento de erro na conexão
    this.pool.on('error', (err, client) => {
      logger.error('Unexpected error on idle client', { error: err });
    });

    // Evento de remoção de conexão
    this.pool.on('remove', () => {
      logger.debug('Connection removed from pool');
    });
  }

  /**
   * Coleta métricas do pool
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      const totalCount = this.pool.totalCount;
      const idleCount = this.pool.idleCount;
      const waitingCount = this.pool.waitingCount;
      const activeCount = totalCount - idleCount;

      updateDbConnectionPoolMetrics(activeCount, this.config.max || 20);

      logger.debug('Database pool metrics', {
        total: totalCount,
        active: activeCount,
        idle: idleCount,
        waiting: waitingCount,
      });
    }, 10000); // A cada 10 segundos
  }

  /**
   * Executa query com retry automático
   */
  async query(text: string, params?: any[]): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const start = Date.now();
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;

        if (duration > 1000) {
          logger.warn('Slow query detected', {
            duration,
            query: text.substring(0, 100),
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Erros que não devem fazer retry
        if (
          error instanceof Error &&
          (error.message.includes('syntax error') ||
           error.message.includes('column') ||
           error.message.includes('relation') ||
           error.message.includes('constraint'))
        ) {
          throw error;
        }

        if (attempt < maxRetries) {
          logger.warn(`Query failed, retrying (${attempt}/${maxRetries})`, {
            error: (error as Error).message,
          });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    logger.error('Query failed after retries', { error: lastError });
    throw lastError;
  }

  /**
   * Executa transação
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  /**
   * Obtém estatísticas do pool
   */
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      active: this.pool.totalCount - this.pool.idleCount,
      max: this.config.max,
      min: this.config.min,
    };
  }

  /**
   * Fecha o pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

// Singleton instance
let dbPool: DatabaseConnectionPool | null = null;

export const initDatabasePool = (config: PoolConfig): DatabaseConnectionPool => {
  if (!dbPool) {
    dbPool = new DatabaseConnectionPool(config);
  }
  return dbPool;
};

export const getDatabasePool = (): DatabaseConnectionPool => {
  if (!dbPool) {
    throw new Error('Database pool not initialized');
  }
  return dbPool;
};

export default DatabaseConnectionPool;
