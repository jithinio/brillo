#!/usr/bin/env node

/**
 * Polar Configuration Verification Script
 * Run this to verify your Polar integration is set up correctly
 */

const { Polar } = require('@polar-sh/sdk');

async function verifyPolarSetup() {
  console.log('\n🔍 Verifying Polar Configuration...\n');
  
  // Check environment variables
  console.log('1️⃣ Checking environment variables...');
  
  const token = process.env.POLAR_ACCESS_TOKEN;
  const orgId = process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID;
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  
  if (!token) {
    console.log('❌ POLAR_ACCESS_TOKEN is missing');
    console.log('   Add this to your .env.local file:');
    console.log('   POLAR_ACCESS_TOKEN=your_token_here\n');
    process.exit(1);
  }
  
  if (!orgId) {
    console.log('❌ NEXT_PUBLIC_POLAR_ORGANIZATION_ID is missing');
    console.log('   Add this to your .env.local file:');
    console.log('   NEXT_PUBLIC_POLAR_ORGANIZATION_ID=org_your_id_here\n');
    process.exit(1);
  }
  
  console.log('✅ Environment variables found');
  console.log(`   Token: ${token.substring(0, 20)}...`);
  console.log(`   Org ID: ${orgId}`);
  console.log(`   Webhook Secret: ${webhookSecret ? 'Set' : 'Missing (optional for testing)'}\n`);
  
  // Check token format
  console.log('2️⃣ Checking token format...');
  
  if (!token.startsWith('polar_oat_') && !token.startsWith('polar_at_')) {
    console.log('❌ Token format appears incorrect');
    console.log('   Expected format: polar_oat_... or polar_at_...');
    console.log(`   Your token starts with: ${token.substring(0, 10)}...\n`);
    process.exit(1);
  }
  
  console.log('✅ Token format looks correct\n');
  
  // Test Polar connection
  console.log('3️⃣ Testing Polar API connection...');
  
  try {
    const serverMode = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    console.log(`   Using ${serverMode} server mode`);
    
    const polar = new Polar({
      accessToken: token.trim(),
      server: serverMode
    });
    
    // Test organization access
    console.log('   Testing organization access...');
    const org = await polar.organizations.get({ id: orgId });
    console.log(`✅ Organization found: ${org.name}`);
    
    // Test customer permissions
    console.log('   Testing customer permissions...');
    const customers = await polar.customers.list({ limit: 1 });
    console.log('✅ Customer read permission verified');
    
    console.log('\n🎉 All checks passed! Your Polar integration is working correctly.\n');
    console.log('Next steps:');
    console.log('- Test the billing portal in your app');
    console.log('- Create products in your Polar dashboard if needed');
    console.log('- Update POLAR_PRO_MONTHLY_PRODUCT_ID and POLAR_PRO_YEARLY_PRODUCT_ID\n');
    
  } catch (error) {
    console.log('❌ Polar API test failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.statusCode === 401) {
      console.log('\n🔧 Token Authentication Failed:');
      console.log('   1. Go to https://polar.sh');
      console.log('   2. Navigate to Settings → Access Tokens');
      console.log('   3. Create a new Organization Access Token');
      console.log('   4. Ensure it has these permissions:');
      console.log('      - customers:read');
      console.log('      - customers:write');
      console.log('      - customer_sessions:write');
      console.log('   5. Copy the new token to POLAR_ACCESS_TOKEN in .env.local');
      console.log('   6. Restart your development server\n');
    } else if (error.statusCode === 404) {
      console.log('\n🔧 Organization Not Found:');
      console.log('   1. Check your NEXT_PUBLIC_POLAR_ORGANIZATION_ID');
      console.log('   2. Verify the organization exists in your Polar dashboard');
      console.log('   3. Make sure you are using the correct environment (sandbox/production)\n');
    } else {
      console.log(`\n🔧 Unexpected Error (Status: ${error.statusCode}):`, error.body);
    }
    
    process.exit(1);
  }
}

// Run the verification
verifyPolarSetup().catch(console.error);