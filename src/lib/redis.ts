import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Redis] Connection error (non-fatal in dev):', err.message);
    }
  });
  return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient();
if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
