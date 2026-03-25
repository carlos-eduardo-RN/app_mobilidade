/**
 * Config
 * Carregamento de configurações do ambiente
 */

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  mode: 'mock' | 'real';
  port: number;
  host: string;
  logLevel: string;

  // Timeouts
  driverAcceptTimeout: number;
  matchingTimeout: number;
  rideInactivityTimeout: number;

  // Matching
  maxSearchRadiusKm: number;
  minDriversForMatching: number;

  // Database (placeholder)
  databaseUrl?: string;
  redisUrl?: string;

  // External Services (placeholder)
  googleMapsApiKey?: string;
}

export class ConfigLoader {
  static load(): AppConfig {
    return {
      env: (process.env.NODE_ENV as any) || 'development',
      mode: (process.env.APP_MODE as any) || 'mock',
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      logLevel: process.env.LOG_LEVEL || 'debug',

      driverAcceptTimeout: parseInt(process.env.DRIVER_ACCEPT_TIMEOUT || '30000', 10),
      matchingTimeout: parseInt(process.env.MATCHING_TIMEOUT || '60000', 10),
      rideInactivityTimeout: parseInt(process.env.RIDE_INACTIVITY_TIMEOUT || '300000', 10),

      maxSearchRadiusKm: parseInt(process.env.MAX_SEARCH_RADIUS_KM || '10', 10),
      minDriversForMatching: parseInt(process.env.MIN_DRIVERS_FOR_MATCHING || '1', 10),

      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    };
  }
}
