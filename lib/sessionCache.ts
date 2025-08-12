import { redisClient } from './redis';

export class SessionCache {
  // Cache user sessions
  static async setUserSession(userId: string, sessionData: any, ttl = 3600) {
    if (!redisClient) {
      console.log('Redis not available - session caching disabled');
      return;
    }

    try {
      await redisClient.setEx(
        `session:${userId}`,
        ttl,
        JSON.stringify(sessionData),
      );
    } catch (error) {
      console.error('Failed to cache user session:', error);
    }
  }

  // Get cached session
  static async getUserSession(userId: string) {
    if (!redisClient) {
      console.log('Redis not available - session cache disabled');
      return null;
    }

    try {
      const data = await redisClient.get(`session:${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached session:', error);
      return null;
    }
  }

  // Cache event results
  static async setEventCache(key: string, events: any[], ttl = 1800) {
    if (!redisClient) {
      console.log('Redis not available - event caching disabled');
      return;
    }

    try {
      await redisClient.setEx(`events:${key}`, ttl, JSON.stringify(events));
    } catch (error) {
      console.error('Failed to cache events:', error);
    }
  }

  // Get cached events
  static async getEventCache(key: string) {
    if (!redisClient) {
      console.log('Redis not available - event cache disabled');
      return null;
    }

    try {
      const data = await redisClient.get(`events:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached events:', error);
      return null;
    }
  }

  // Rate limiting for API calls
  static async checkRateLimit(
    userId: string,
    action: string,
    limit = 10,
    window = 3600,
  ) {
    if (!redisClient) {
      console.log('Redis not available - rate limiting disabled');
      return true; // Allow all requests when Redis is not available
    }

    try {
      const key = `ratelimit:${userId}:${action}`;
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, window);
      }

      return current <= limit;
    } catch (error) {
      console.error('Rate limiting failed:', error);
      return true; // Allow request when rate limiting fails
    }
  }
}
