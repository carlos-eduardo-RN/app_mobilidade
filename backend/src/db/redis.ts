import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl
  ? new Redis(redisUrl)
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
    });

redis.on('error', (error) => {
  Logger.warn('Redis', 'Redis connection error', { error: String(error) });
});

export default redis;
