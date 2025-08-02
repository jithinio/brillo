#!/usr/bin/env node

/**
 * Production Setup Verification Script
 * Run this to verify your production environment is configured correctly
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'POLAR_ACCESS_TOKEN',
  'POLAR_WEBHOOK_SECRET',
  'NEXT_PUBLIC_POLAR_ORGANIZATION_ID',
  'POLAR_PRO_MONTHLY_PRODUCT_ID',
  'POLAR_PRO_YEARLY_PRODUCT_ID',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET'
]

const optionalEnvVars = [
  'RESEND_API_KEY',
  'NEXT_PUBLIC_UNIRATEAPI_KEY'
]

console.log('🚀 Production Setup Verification\n')

// Check required environment variables
console.log('📋 Checking Required Environment Variables:')
let missingRequired = []

requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    const maskedValue = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('TOKEN') 
      ? value.substring(0, 8) + '...' 
      : value
    console.log(`  ✅ ${varName}: ${maskedValue}`)
  } else {
    console.log(`  ❌ ${varName}: MISSING`)
    missingRequired.push(varName)
  }
})

// Check optional environment variables
console.log('\n📋 Checking Optional Environment Variables:')
optionalEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    const maskedValue = varName.includes('KEY') 
      ? value.substring(0, 8) + '...' 
      : value
    console.log(`  ✅ ${varName}: ${maskedValue}`)
  } else {
    console.log(`  ⚠️  ${varName}: Not set (optional)`)
  }
})

// Check feature flags
console.log('\n🎛️  Checking Feature Flags:')
const featureFlags = [
  'NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS',
  'NEXT_PUBLIC_ENABLE_POLAR', 
  'NEXT_PUBLIC_ENABLE_USAGE_TRACKING',
  'NEXT_PUBLIC_ENABLE_PRO_FEATURES'
]

featureFlags.forEach(flag => {
  const value = process.env[flag]
  const status = value === 'true' ? '✅ ENABLED' : '❌ DISABLED'
  console.log(`  ${status} ${flag}`)
})

// Check NODE_ENV
console.log('\n🏗️  Environment Configuration:')
const nodeEnv = process.env.NODE_ENV
console.log(`  NODE_ENV: ${nodeEnv || 'development'}`)

if (nodeEnv === 'production') {
  console.log('  ✅ Production mode enabled')
} else {
  console.log('  ⚠️  Not in production mode - Polar will use sandbox')
}

// Validate specific values
console.log('\n🔍 Validation Checks:')

// Check Supabase URL format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('.supabase.co')) {
  console.log('  ✅ Supabase URL format looks correct')
} else {
  console.log('  ❌ Supabase URL format may be incorrect')
}

// Check Polar Organization ID format
const orgId = process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID
if (orgId && orgId.startsWith('org_')) {
  console.log('  ✅ Polar Organization ID format looks correct')
} else if (orgId) {
  console.log('  ❌ Polar Organization ID should start with "org_"')
}

// Check webhook secret format
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
if (webhookSecret && webhookSecret.startsWith('whsec_')) {
  console.log('  ✅ Webhook secret format looks correct')
} else if (webhookSecret) {
  console.log('  ❌ Webhook secret should start with "whsec_"')
}

// Check NEXTAUTH_SECRET length
const nextAuthSecret = process.env.NEXTAUTH_SECRET
if (nextAuthSecret && nextAuthSecret.length >= 32) {
  console.log('  ✅ NEXTAUTH_SECRET is sufficiently long')
} else if (nextAuthSecret) {
  console.log('  ❌ NEXTAUTH_SECRET should be at least 32 characters')
}

// Check URL format
const nextAuthUrl = process.env.NEXTAUTH_URL
if (nextAuthUrl && (nextAuthUrl.startsWith('https://') || nextAuthUrl.startsWith('http://localhost'))) {
  console.log('  ✅ NEXTAUTH_URL format looks correct')
} else if (nextAuthUrl) {
  console.log('  ❌ NEXTAUTH_URL should start with https:// (or http://localhost for dev)')
}

// Summary
console.log('\n📊 Summary:')
if (missingRequired.length === 0) {
  console.log('  ✅ All required environment variables are set!')
  
  if (nodeEnv === 'production') {
    console.log('  🚀 Ready for production deployment!')
  } else {
    console.log('  🧪 Ready for testing (set NODE_ENV=production for live mode)')
  }
} else {
  console.log(`  ❌ Missing ${missingRequired.length} required environment variables:`)
  missingRequired.forEach(varName => {
    console.log(`    - ${varName}`)
  })
  console.log('\n  Please add these to your .env.local file or deployment environment.')
}

console.log('\n🔗 Next Steps:')
console.log('  1. Fix any issues above')
console.log('  2. Deploy to your hosting platform') 
console.log('  3. Test the subscription flow end-to-end')
console.log('  4. Monitor webhook delivery in Polar dashboard')
console.log('  5. 🎉 Launch!')

console.log('\n💡 Need help? Check PRODUCTION_LAUNCH_CHECKLIST.md for detailed setup guide.')