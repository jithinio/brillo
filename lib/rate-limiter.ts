// Server-side rate limiting for API endpoints

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (req: Request) => string
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class MemoryRateLimitStore {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store[key]
    if (!entry) return null

    if (Date.now() > entry.resetTime) {
      delete this.store[key]
      return null
    }

    return entry
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    this.store[key] = { count, resetTime }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now()
    const entry = await this.get(key)

    if (!entry) {
      const newEntry = { count: 1, resetTime: now + windowMs }
      await this.set(key, newEntry.count, newEntry.resetTime)
      return newEntry
    }

    const updatedEntry = { count: entry.count + 1, resetTime: entry.resetTime }
    await this.set(key, updatedEntry.count, updatedEntry.resetTime)
    return updatedEntry
  }

  private cleanup(): void {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store = {}
  }
}

// Global rate limit store
const rateLimitStore = new MemoryRateLimitStore()

// Default key generator (uses IP address)
function defaultKeyGenerator(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return `rate-limit:${ip}`
}

export async function rateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const key = config.keyGenerator ? config.keyGenerator(req) : defaultKeyGenerator(req)
  
  const { count, resetTime } = await rateLimitStore.increment(key, config.windowMs)
  
  const remaining = Math.max(0, config.maxRequests - count)
  const success = count <= config.maxRequests

  return { success, remaining, resetTime }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Authentication endpoints - very strict
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // API endpoints - moderate
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // File uploads - strict
  upload: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // General requests - lenient
  general: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
}

// Rate limit middleware for Next.js API routes
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig = rateLimitConfigs.api
): Promise<Response | null> {
  const result = await rateLimit(req, config)
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  
  return null
}

// Cleanup function for graceful shutdown
export function cleanupRateLimit(): void {
  rateLimitStore.destroy()
} 