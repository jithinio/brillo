#!/usr/bin/env node

/**
 * Polar Configuration Diagnostic Script
 * 
 * This script checks if all required environment variables for Polar integration
 * are properly configured. Run this to diagnose subscription management issues.
 * 
 * Usage: node scripts/check-polar-config.js
 */

// Load environment variables from .env.local
const fs = require('fs')
const path = require('path')

const envLocalPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=')
      }
    }
  })
  console.log('✅ Loaded .env.local file\n')
} else {
  console.log('⚠️  No .env.local file found\n')
}

console.log('🔍 Polar Configuration Diagnostic\n')

// Required environment variables
const requiredEnvVars = {
  'POLAR_ACCESS_TOKEN': process.env.POLAR_ACCESS_TOKEN,
  'NEXT_PUBLIC_POLAR_ORGANIZATION_ID': process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID,
  'POLAR_WEBHOOK_SECRET': process.env.POLAR_WEBHOOK_SECRET,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

// Optional but recommended
const optionalEnvVars = {
  'POLAR_PRO_MONTHLY_PRODUCT_ID': process.env.POLAR_PRO_MONTHLY_PRODUCT_ID,
  'POLAR_PRO_YEARLY_PRODUCT_ID': process.env.POLAR_PRO_YEARLY_PRODUCT_ID,
  'NODE_ENV': process.env.NODE_ENV,
}

let allGood = true

console.log('📋 Required Environment Variables:')
for (const [name, value] of Object.entries(requiredEnvVars)) {
  const status = value ? '✅' : '❌'
  const display = value ? (name.includes('TOKEN') || name.includes('KEY') ? 
    `${value.substring(0, 10)}...` : value) : 'NOT SET'
  
  console.log(`${status} ${name}: ${display}`)
  
  if (!value) {
    allGood = false
  }
}

console.log('\n📋 Optional Environment Variables:')
for (const [name, value] of Object.entries(optionalEnvVars)) {
  const status = value ? '✅' : '⚠️'
  const display = value ? (name.includes('TOKEN') || name.includes('KEY') ? 
    `${value.substring(0, 10)}...` : value) : 'NOT SET'
  
  console.log(`${status} ${name}: ${display}`)
}

console.log('\n🔧 Configuration Status:')
if (allGood) {
  console.log('✅ All required environment variables are configured!')
  
  // Additional checks
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'production') {
    console.log('✅ NODE_ENV is set to production (for production Polar tokens)')
  } else {
    console.log('ℹ️  NODE_ENV is not production (using sandbox mode)')
  }
  
} else {
  console.log('❌ Missing required environment variables!')
  console.log('\n💡 To fix this:')
  console.log('1. Create a .env.local file in your project root')
  console.log('2. Add the missing environment variables')
  console.log('3. Get values from:')
  console.log('   - Polar Dashboard: https://polar.sh/dashboard')
  console.log('   - Supabase Dashboard: https://supabase.com/dashboard')
  console.log('4. Restart your development server')
}

console.log('\n📚 For more help:')
console.log('- Polar Setup: https://docs.polar.sh/developers/webhooks/setup')
console.log('- Supabase Setup: https://supabase.com/docs/guides/getting-started')

process.exit(allGood ? 0 : 1)
