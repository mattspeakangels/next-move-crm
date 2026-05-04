/**
 * Upstash Redis Rate Limiter
 * Persistent rate limiting across Vercel cold starts
 * Free tier: 10k commands/day (sufficient for 5 req/hour/user)
 */

const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment rate limit for a user
 * Limit: 5 requests per hour (3600 seconds)
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    // Fallback to permissive if Redis not configured
    console.warn('Upstash Redis not configured, rate limiting disabled');
    return {
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 3600000,
    };
  }

  try {
    const key = `ratelimit:${userId}`;
    const limit = 5;
    const window = 3600; // 1 hour in seconds

    // Get current count
    const getResponse = await fetch(`${UPSTASH_REST_URL}/get/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
    });

    if (!getResponse.ok) {
      throw new Error(`Redis GET failed: ${getResponse.status}`);
    }

    const getData = await getResponse.json() as { result?: string | null };
    const currentCount = getData.result ? parseInt(getData.result, 10) : 0;

    // Check if limit exceeded
    if (currentCount >= limit) {
      // Get TTL for reset time
      const ttlResponse = await fetch(`${UPSTASH_REST_URL}/ttl/${key}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
        },
      });

      const ttlData = await ttlResponse.json() as { result: number };
      const ttl = ttlData.result;
      const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : window * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Increment counter
    const incrResponse = await fetch(`${UPSTASH_REST_URL}/incr/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
    });

    if (!incrResponse.ok) {
      throw new Error(`Redis INCR failed: ${incrResponse.status}`);
    }

    // Set expiration on first request only
    if (currentCount === 0) {
      await fetch(`${UPSTASH_REST_URL}/expire/${key}/${window}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
        },
      });
    }

    const remaining = limit - (currentCount + 1);
    const resetAt = Date.now() + window * 1000;

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open on error (allow request)
    return {
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 3600000,
    };
  }
}

/**
 * Get current usage for a user (for monitoring/debugging)
 */
export async function getRateLimitStatus(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
} | null> {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    return null;
  }

  try {
    const key = `ratelimit:${userId}`;
    const limit = 5;

    const response = await fetch(`${UPSTASH_REST_URL}/get/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
    });

    const data = await response.json() as { result?: string | null };
    const used = data.result ? parseInt(data.result, 10) : 0;

    // Get TTL
    const ttlResponse = await fetch(`${UPSTASH_REST_URL}/ttl/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
    });

    const ttlData = await ttlResponse.json() as { result: number };
    const ttl = ttlData.result;
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : 3600000);

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return null;
  }
}

/**
 * Reset rate limit for a user (admin function)
 */
export async function resetRateLimit(userId: string): Promise<boolean> {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    return false;
  }

  try {
    const key = `ratelimit:${userId}`;

    const response = await fetch(`${UPSTASH_REST_URL}/del/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  }
}
