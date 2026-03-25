import { Redis } from 'ioredis';
import logger from '../utils/Logger';

export interface CacheOptions {
  ttl?: number; // Time to live em segundos
  prefix?: string; // Prefixo para chave
  tags?: string[]; // Tags para invalidação em grupo
}

export class RedisCache {
  private redis: Redis;
  private defaultTTL: number = 3600; // 1 hora

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Obtém valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value);
      logger.debug('Cache hit', { key });
      return parsed as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Armazena valor no cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || this.defaultTTL;
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
      
      await this.redis.setex(fullKey, ttl, JSON.stringify(value));

      // Adiciona às tags se especificado
      if (options?.tags) {
        for (const tag of options.tags) {
          await this.redis.sadd(`tag:${tag}`, fullKey);
        }
      }

      logger.debug('Cache set', { key: fullKey, ttl });
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Remove valor do cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug('Cache delete', { key });
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Remove múltiplas chaves
   */
  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.redis.del(...keys);
      logger.debug('Cache delete many', { count: keys.length });
    } catch (error) {
      logger.error('Cache delete many error', { keys, error });
    }
  }

  /**
   * Invalida cache por tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
        logger.info('Cache invalidated by tag', { tag, keysCount: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidate by tag error', { tag, error });
    }
  }

  /**
   * Verifica se chave existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Cache-aside pattern: obtém do cache ou executa função
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Incrementa contador
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, by);
    } catch (error) {
      logger.error('Cache increment error', { key, error });
      return 0;
    }
  }

  /**
   * Decrementa contador
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, by);
    } catch (error) {
      logger.error('Cache decrement error', { key, error });
      return 0;
    }
  }

  /**
   * Limpa todo o cache
   */
  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
      logger.warn('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error', { error });
    }
  }

  /**
   * Obtém TTL restante
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', { key, error });
      return -1;
    }
  }

  /**
   * Define TTL para chave existente
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', { key, error });
      return false;
    }
  }
}

// Instância singleton
let cacheInstance: RedisCache | null = null;

export const initCache = (redis: Redis): RedisCache => {
  cacheInstance = new RedisCache(redis);
  return cacheInstance;
};

export const getCache = (): RedisCache => {
  if (!cacheInstance) {
    throw new Error('Cache not initialized. Call initCache first.');
  }
  return cacheInstance;
};

export default RedisCache;
