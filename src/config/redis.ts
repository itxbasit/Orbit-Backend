import { logger } from '../utils/logger';

class RedisClient {
  private static instance: RedisClient;
  public client: any;
  private locks = new Map<string, { value: string, expiresAt: number }>();

  private constructor() {
    logger.info('Using in-memory lock manager (Redis not required)');
    this.client = this.createMemoryClient();
  }

  private createMemoryClient(): any {
    return {
      set: async (key: string, value: any, options?: any) => {
        let ttl = 3600;
        if (options && options.EX) {
          ttl = options.EX;
        }
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        this.locks.set(key, { 
          value: stringValue, 
          expiresAt: Date.now() + ttl * 1000 
        });
        return 'OK';
      },
      setEx: async (key: string, seconds: number, value: any) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        this.locks.set(key, { 
          value: stringValue, 
          expiresAt: Date.now() + seconds * 1000 
        });
        return 'OK';
      },
      get: async (key: string) => {
        const data = this.locks.get(key);
        if (!data) return null;
        if (data.expiresAt < Date.now()) {
          this.locks.delete(key);
          return null;
        }
        return data.value;
      },
      del: async (key: string) => {
        this.locks.delete(key);
        return 1;
      },
      eval: async (script: string, options: any) => {
        const keys = options?.keys || [];
        const args = options?.arguments || [];
        
        // Simple implementation for lock release script
        if (script.includes('redis.call("get"') && script.includes('redis.call("del"')) {
          const lockKey = keys[0];
          const lockValue = args[0];
          const data = this.locks.get(lockKey);
          if (data && data.value === lockValue) {
            this.locks.delete(lockKey);
            return 1;
          }
          return 0;
        }
        return 1;
      },
      on: () => {
        // No-op for memory client
      },
      connect: async () => {
        // No-op for memory client
        return 'Connected';
      },
      quit: async () => {
        // No-op for memory client
        return 'OK';
      },
      isOpen: true,
      isReady: true
    };
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public isConnected(): boolean {
    return true;
  }
}

export const redisClient = RedisClient.getInstance().client;
export const isRedisAvailable = () => RedisClient.getInstance().isConnected();