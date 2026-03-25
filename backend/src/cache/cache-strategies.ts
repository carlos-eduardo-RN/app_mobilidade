import { getCache } from './redis-cache';
import logger from '../utils/Logger';

/**
 * Estratégias de TTL por tipo de dado
 */
export const CacheTTL = {
  // Dados estáticos (raramente mudam)
  STATIC: 86400, // 24 horas
  
  // Dados de configuração
  CONFIG: 3600, // 1 hora
  
  // Dados de usuário
  USER_PROFILE: 1800, // 30 minutos
  USER_SESSION: 900, // 15 minutos
  
  // Dados de corridas
  RIDE_ACTIVE: 60, // 1 minuto (em tempo real)
  RIDE_COMPLETED: 3600, // 1 hora
  RIDE_HISTORY: 1800, // 30 minutos
  
  // Dados de motoristas
  DRIVER_LOCATION: 10, // 10 segundos (tempo real)
  DRIVER_PROFILE: 1800, // 30 minutos
  DRIVER_STATS: 3600, // 1 hora
  
  // Listas e agregações
  LIST_SHORT: 300, // 5 minutos
  LIST_MEDIUM: 900, // 15 minutos
  LIST_LONG: 3600, // 1 hora
  
  // Analytics
  ANALYTICS_REALTIME: 60, // 1 minuto
  ANALYTICS_HOURLY: 3600, // 1 hora
  ANALYTICS_DAILY: 86400, // 24 horas
};

/**
 * Gerador de chaves de cache padronizadas
 */
export class CacheKey {
  static user(userId: string): string {
    return `user:${userId}`;
  }

  static userProfile(userId: string): string {
    return `user:profile:${userId}`;
  }

  static userRides(userId: string, page: number = 1): string {
    return `user:rides:${userId}:page:${page}`;
  }

  static ride(rideId: string): string {
    return `ride:${rideId}`;
  }

  static rideActive(driverId: string): string {
    return `ride:active:driver:${driverId}`;
  }

  static driver(driverId: string): string {
    return `driver:${driverId}`;
  }

  static driverLocation(driverId: string): string {
    return `driver:location:${driverId}`;
  }

  static driverStats(driverId: string): string {
    return `driver:stats:${driverId}`;
  }

  static nearbyDrivers(lat: number, lng: number, radius: number): string {
    return `drivers:nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
  }

  static rating(entityId: string, entityType: 'user' | 'driver'): string {
    return `rating:${entityType}:${entityId}`;
  }

  static analytics(metric: string, period: string): string {
    return `analytics:${metric}:${period}`;
  }

  static config(key: string): string {
    return `config:${key}`;
  }
}

/**
 * Decorador para cache de métodos
 */
export function Cacheable(options: {
  keyGenerator: (...args: any[]) => string;
  ttl: number;
  tags?: string[];
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = getCache();
      const key = options.keyGenerator(...args);

      try {
        // Tenta obter do cache
        const cached = await cache.get(key);
        if (cached !== null) {
          logger.debug('Cache hit (decorator)', { method: propertyKey, key });
          return cached;
        }

        // Executa método original
        const result = await originalMethod.apply(this, args);

        // Armazena no cache
        await cache.set(key, result, {
          ttl: options.ttl,
          tags: options.tags,
        });

        return result;
      } catch (error) {
        logger.error('Cache decorator error', {
          method: propertyKey,
          key,
          error,
        });
        // Em caso de erro, executa método sem cache
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Estratégia de invalidação de cache
 */
export class CacheInvalidation {
  private cache = getCache();

  /**
   * Invalida cache relacionado a usuário
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.invalidateByTag(`user:${userId}`);
    await this.cache.del(CacheKey.user(userId));
    await this.cache.del(CacheKey.userProfile(userId));
    logger.info('User cache invalidated', { userId });
  }

  /**
   * Invalida cache relacionado a motorista
   */
  async invalidateDriver(driverId: string): Promise<void> {
    await this.cache.invalidateByTag(`driver:${driverId}`);
    await this.cache.del(CacheKey.driver(driverId));
    await this.cache.del(CacheKey.driverLocation(driverId));
    await this.cache.del(CacheKey.driverStats(driverId));
    logger.info('Driver cache invalidated', { driverId });
  }

  /**
   * Invalida cache relacionado a corrida
   */
  async invalidateRide(rideId: string, passengerId: string, driverId: string): Promise<void> {
    await this.cache.invalidateByTag(`ride:${rideId}`);
    await this.cache.del(CacheKey.ride(rideId));
    
    // Invalida listas de corridas
    await this.cache.invalidateByTag(`user:${passengerId}`);
    await this.cache.invalidateByTag(`driver:${driverId}`);
    
    logger.info('Ride cache invalidated', { rideId });
  }

  /**
   * Invalida cache de analytics
   */
  async invalidateAnalytics(metric?: string): Promise<void> {
    if (metric) {
      await this.cache.invalidateByTag(`analytics:${metric}`);
    } else {
      await this.cache.invalidateByTag('analytics');
    }
    logger.info('Analytics cache invalidated', { metric });
  }

  /**
   * Invalida cache de motoristas próximos
   */
  async invalidateNearbyDrivers(): Promise<void> {
    await this.cache.invalidateByTag('drivers:nearby');
    logger.info('Nearby drivers cache invalidated');
  }
}

/**
 * Cache warming: pré-carrega dados importantes
 */
export class CacheWarmer {
  private cache = getCache();

  /**
   * Aquece cache de dados estáticos
   */
  async warmStaticData(): Promise<void> {
    logger.info('Starting cache warming for static data');
    
    // Implementar conforme necessário
    // Exemplo: carregar configurações, listas de cidades, etc.
    
    logger.info('Cache warming completed');
  }

  /**
   * Aquece cache de motoristas online
   */
  async warmOnlineDrivers(driverIds: string[]): Promise<void> {
    logger.info('Warming cache for online drivers', { count: driverIds.length });
    
    // Implementar: carregar perfis e localizações de motoristas online
  }
}

export default {
  CacheTTL,
  CacheKey,
  Cacheable,
  CacheInvalidation,
  CacheWarmer,
};
