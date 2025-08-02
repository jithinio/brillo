# 🔒 Polar Integration Setup Guide

## Security-First Implementation Approach

This guide ensures we implement Polar integration without breaking existing functionality.

## 📋 Step 1: Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# Existing Supabase Configuration (keep your existing values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Existing Exchange Rate API (keep your existing values)
NEXT_PUBLIC_UNIRATEAPI_KEY=your_unirateapi_key

# Polar Integration (NEW - Add these for subscription functionality)
# Get these from your Polar dashboard: https://polar.sh
NEXT_PUBLIC_POLAR_PUBLISHABLE_KEY=pk_test_...
POLAR_SECRET_KEY=sk_test_...
POLAR_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_POLAR_ORGANIZATION_ID=org_...

# Security Settings (NEW)
NEXTAUTH_SECRET=your_super_secure_random_string_here
NEXTAUTH_URL=http://localhost:3000

# Feature Flags (NEW - Start with everything disabled for safety)
NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS=false
NEXT_PUBLIC_ENABLE_POLAR=false
NEXT_PUBLIC_ENABLE_USAGE_TRACKING=false
```

## 🔐 Security Best Practices

### 1. Environment Variable Security
- **Never commit** `.env.local` to git
- Use **test keys** during development
- Rotate keys regularly in production
- Use different keys for staging/production

### 2. Polar API Key Security
```bash
# Development (use test keys)
NEXT_PUBLIC_POLAR_PUBLISHABLE_KEY=pk_test_...
POLAR_SECRET_KEY=sk_test_...

# Production (use live keys)
NEXT_PUBLIC_POLAR_PUBLISHABLE_KEY=pk_live_...
POLAR_SECRET_KEY=sk_live_...
```

### 3. Webhook Security
- Validate all webhook signatures
- Use HTTPS endpoints only
- Implement idempotency checks
- Log all webhook events for audit

## 🚀 Polar Account Setup

### Step 1: Create Polar Account
1. Go to [https://polar.sh](https://polar.sh)
2. Sign up for a new account
3. Complete account verification

### Step 2: Create Organization
1. Create a new organization
2. Note your Organization ID
3. Configure tax settings if needed

### Step 3: Get API Keys
1. Go to Settings → API Keys
2. Create test API keys first
3. Copy Publishable Key (starts with `pk_test_`)
4. Copy Secret Key (starts with `sk_test_`)

### Step 4: Create Products in Polar
```json
// Pro Monthly Product
{
  "name": "Suitebase Pro Monthly",
  "price": 1000, // $10.00 in cents
  "interval": "month",
  "description": "Full access to Suitebase Pro features"
}

// Pro Yearly Product  
{
  "name": "Suitebase Pro Yearly",
  "price": 9600, // $96.00 in cents (8/month * 12)
  "interval": "year", 
  "description": "Full access to Suitebase Pro features - Save 2 months!"
}
```

### Step 5: Setup Webhooks
1. Go to Settings → Webhooks
2. Add webhook endpoint: `https://yourdomain.com/api/webhooks/polar`
3. Select events:
   - `subscription.created`
   - `subscription.updated` 
   - `subscription.cancelled`
   - `payment.succeeded`
   - `payment.failed`
4. Copy webhook secret

## 🛡️ Implementation Safety Checklist

- [ ] Environment variables are properly configured
- [ ] Feature flags start as `false`
- [ ] Existing functionality is unaffected
- [ ] Test keys are used for development
- [ ] Webhook endpoints are secured
- [ ] Error handling is comprehensive
- [ ] Logging is in place for audit trail

## 📞 Next Steps

After completing this setup, we'll proceed with:
1. Creating the subscription context (disabled by default)
2. Adding Polar client configuration
3. Implementing secure webhook handling
4. Creating the pricing page (hidden behind feature flag)
5. Adding feature gates (defaulting to allow access)

This approach ensures zero risk to existing functionality while building the foundation for subscriptions.