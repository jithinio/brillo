# Production-Safe Logging Guide

## Overview

The Brillo application uses a custom logging system that automatically handles development vs production logging scenarios while sanitizing sensitive data.

## Usage

Import the logger and use appropriate methods:

```typescript
import { logger } from '@/lib/logger'

// Basic logging
logger.debug('Debug information', { data: 'value' })
logger.info('General information', { status: 'success' })
logger.warn('Warning message', { issue: 'description' })
logger.error('Error occurred', error)

// Context-specific logging
logger.authLog('User authentication event', { userId: 'sanitized-id' })
logger.apiLog('API request processed', { endpoint: '/api/users' })
logger.stripeLog('Payment processed', { subscriptionId: 'sub_123' })
logger.paymentLog('Payment status updated', { status: 'completed' })
```

## Log Levels

- **debug**: Development-only detailed information
- **info**: General application flow information
- **warn**: Warning conditions that should be noted
- **error**: Error conditions that need attention

## Production Behavior

In production (`NODE_ENV=production`):
- Only `warn` and `error` levels are logged
- Sensitive data is automatically redacted
- Stack traces are hidden for security
- Console logs are automatically removed by Next.js compiler

## Development Behavior

In development (`NODE_ENV=development`):
- All log levels are shown
- Full error details including stack traces
- Sensitive data is still sanitized for security

## Sensitive Data Protection

The logger automatically redacts these sensitive fields:
- `password`, `token`, `secret`, `key`
- `auth`, `authorization`
- `stripe_customer_id`, `customer_id`
- `payment_method`, `card`, `cvv`, `ssn`

Example:
```typescript
logger.info('User data', {
  email: 'user@example.com',
  password: 'secret123',  // Will be '[REDACTED]'
  stripe_customer_id: 'cus_123'  // Will be '[REDACTED]'
})
```

## Context-Specific Methods

- `authLog()`: Authentication and user management
- `apiLog()`: API endpoint operations
- `dbLog()`: Database operations (debug level)
- `stripeLog()`: Stripe/payment operations
- `paymentLog()`: Payment processing events

## Migration from console.log

Replace existing console statements:

```typescript
// Before
console.log('User signed in:', userId)
console.error('Database error:', error)

// After
logger.authLog('User signed in successfully')
logger.error('Database operation failed', error)
```

## Best Practices

1. **Use appropriate log levels**
   - `debug` for detailed debugging info
   - `info` for normal application flow
   - `warn` for recoverable issues
   - `error` for exceptions and failures

2. **Provide context**
   ```typescript
   logger.error('Failed to create user', error, 'UserService')
   ```

3. **Don't log sensitive data directly**
   ```typescript
   // Bad
   logger.info('Processing payment', { creditCard: '4111111111111111' })
   
   // Good
   logger.paymentLog('Processing payment', { paymentMethod: 'card', last4: '1111' })
   ```

4. **Use structured data**
   ```typescript
   logger.info('API request completed', {
     endpoint: '/api/users',
     method: 'POST',
     statusCode: 201,
     duration: 150
   })
   ```

## Security Notes

- The logger automatically handles production vs development environments
- Sensitive data is sanitized before logging
- Stack traces are hidden in production
- Next.js compiler removes console.log statements in production builds
- All logs include timestamps and context for debugging
