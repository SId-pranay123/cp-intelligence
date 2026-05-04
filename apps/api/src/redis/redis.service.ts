import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message} — caching disabled`);
    });

    this.client.connect().catch(() => {
      // connection errors are already logged by the error handler
    });
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client?.get(key) ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client?.set(key, value, 'EX', ttlSeconds);
    } catch {
      // cache write failures are non-fatal
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client?.del(key);
    } catch {
      // cache invalidation failures are non-fatal
    }
  }
}
