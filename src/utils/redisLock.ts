import { redisClient } from '../config/redis';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export class RedisLock {
  private static readonly LOCK_TTL = 30;
  private static readonly RETRY_DELAY = 100;
  private static readonly MAX_RETRIES = 3;
  private static localLocks = new Map<string, { value: string, expiresAt: number }>();

  static async acquireLock(
    resource: string, 
    ttl: number = this.LOCK_TTL
  ): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = uuidv4();
    
    try {
      // Try Redis first
      const acquired = await redisClient.set(lockKey, lockValue, {
        NX: true,
        EX: ttl
      });
      
      if (acquired) {
        return lockValue;
      }
      
      // Fallback to local lock
      return this.acquireLocalLock(resource, lockValue, ttl);
    } catch (error) {
      logger.warn('Redis lock failed, using local fallback:', error);
      return this.acquireLocalLock(resource, lockValue, ttl);
    }
  }

  private static acquireLocalLock(resource: string, lockValue: string, ttl: number): string | null {
    const existing = this.localLocks.get(resource);
    if (existing && existing.expiresAt > Date.now()) {
      return null;
    }
    this.localLocks.set(resource, {
      value: lockValue,
      expiresAt: Date.now() + ttl * 1000
    });
    return lockValue;
  }

  static async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    
    try {
      // Try Redis first
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await redisClient.eval(script, {
        keys: [lockKey],
        arguments: [lockValue]
      });
      
      if (result === 1) {
        return true;
      }
      
      // Fallback to local lock
      return this.releaseLocalLock(resource, lockValue);
    } catch (error) {
      logger.warn('Redis lock release failed, using local fallback:', error);
      return this.releaseLocalLock(resource, lockValue);
    }
  }

  private static releaseLocalLock(resource: string, lockValue: string): boolean {
    const existing = this.localLocks.get(resource);
    if (existing && existing.value === lockValue) {
      this.localLocks.delete(resource);
      return true;
    }
    return false;
  }

  static async withLock<T>(
    resource: string,
    operation: () => Promise<T>,
    ttl: number = this.LOCK_TTL,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let retries = 0;
    let lockValue: string | null = null;

    while (retries < maxRetries) {
      try {
        lockValue = await this.acquireLock(resource, ttl);
        
        if (lockValue) {
          const result = await operation();
          await this.releaseLock(resource, lockValue);
          return result;
        }

        retries++;
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retries));
      } catch (error) {
        if (lockValue) {
          await this.releaseLock(resource, lockValue);
        }
        throw error;
      }
    }

    throw new Error(`Failed to acquire lock for ${resource} after ${maxRetries} retries`);
  }
}