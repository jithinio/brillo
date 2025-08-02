#!/usr/bin/env node

/**
 * Production Cleanup Verification Script
 * Run this after cleaning up test subscriptions to verify everything is ready
 */

const { createClient } = require('@supabase/supabase-js')

async function verifyCleanup() {
  console.log('🧹 Production Cleanup Verification\n')

  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Supabase environment variables not found')
    console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set')
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check subscription status distribution
    console.log('📊 Checking User Subscription Status:')
    const { data: statusCounts, error: statusError } = await supabase
      .from('profiles')
      .select('subscription_status')

    if (statusError) {
      console.error('❌ Error fetching subscription status:', statusError)
      return
    }

    const statusDistribution = statusCounts.reduce((acc, profile) => {
      acc[profile.subscription_status] = (acc[profile.subscription_status] || 0) + 1
      return acc
    }, {})

    Object.entries(statusDistribution).forEach(([status, count]) => {
      const icon = status === 'free' ? '✅' : '⚠️'
      console.log(`  ${icon} ${status}: ${count} users`)
    })

    // Check for any remaining test subscription data
    console.log('\n🔍 Checking for Remaining Test Data:')
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id, subscription_status, subscription_plan_id, polar_customer_id, polar_subscription_id')
      .or('subscription_status.neq.free,polar_subscription_id.not.is.null,polar_customer_id.not.is.null')

    if (testError) {
      console.error('❌ Error checking test data:', testError)
      return
    }

    if (testData.length === 0) {
      console.log('  ✅ No remaining test subscription data found')
    } else {
      console.log(`  ⚠️  Found ${testData.length} users with remaining test data:`)
      testData.forEach(user => {
        console.log(`    - User ${user.id}: ${user.subscription_status} plan, Polar ID: ${user.polar_subscription_id || 'none'}`)
      })
    }

    // Check recent subscription events
    console.log('\n📝 Recent Subscription Events:')
    const { data: events, error: eventsError } = await supabase
      .from('subscription_events')
      .select('event_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (eventsError) {
      console.log('  ⚠️  Could not fetch subscription events (table may not exist)')
    } else if (events.length === 0) {
      console.log('  ✅ No recent subscription events (clean slate)')
    } else {
      console.log(`  📋 Last ${events.length} events:`)
      events.forEach(event => {
        console.log(`    - ${event.event_type} at ${event.created_at}`)
      })
    }

    // Check usage data
    console.log('\n💾 Usage Data Status:')
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (usageError) {
      console.log('  ⚠️  Could not fetch usage data (table may not exist)')
    } else {
      console.log(`  📊 Found usage data for ${usageData.length} users`)
      if (usageData.length > 0) {
        console.log(`  🕒 Most recent update: ${usageData[0].created_at}`)
      }
    }

    // Final status
    console.log('\n📋 Cleanup Summary:')
    const freeUsers = statusDistribution.free || 0
    const totalUsers = statusCounts.length
    const hasTestData = testData.length > 0

    if (freeUsers === totalUsers && !hasTestData) {
      console.log('  ✅ Cleanup Complete! All users are on free plan with no test data')
      console.log('  🚀 Ready for production with clean user base')
    } else {
      console.log('  ⚠️  Cleanup may be incomplete:')
      if (freeUsers !== totalUsers) {
        console.log(`    - ${totalUsers - freeUsers} users still have non-free status`)
      }
      if (hasTestData) {
        console.log(`    - ${testData.length} users have remaining test subscription data`)
      }
      console.log('  💡 Consider running the cleanup script again')
    }

  } catch (error) {
    console.error('❌ Error during verification:', error)
  }
}

// Run verification
verifyCleanup().catch(console.error)