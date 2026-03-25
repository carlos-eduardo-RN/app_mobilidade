/**
 * RedisLockService
 * Lock distribuído simples e seguro
 */

import { Logger } from '../utils/Logger';

export class RedisLockService {
  constructor(private redis: any) {}

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis.set(
      key,
      'locked',
      'NX',
      'PX',
      ttlMs
    );

    const acquired = result === 'OK';

    if (!acquired) {
      Logger.debug('RedisLockService', 'Lock not acquired', { key });
    }

    return acquired;
  }

  async release(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      Logger.warn('RedisLockService', 'Failed to release lock', { key });
    }
  }
}