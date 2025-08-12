import { createClient } from 'redis';

// Only create Redis client if REDIS_URL is provided
let redisClient: ReturnType<typeof createClient> | null = null;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));
} else {
  console.log('Redis disabled - REDIS_URL not provided');
}

export async function connectRedis() {
  if (!redisClient) {
    console.log('Redis not available');
    return null;
  }

  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return null;
    }
  }
  return redisClient;
}

export { redisClient };
