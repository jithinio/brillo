#!/usr/bin/env node

/**
 * Environment Variable Checker
 * Verify that your .env.local file is being read correctly
 */

console.log('\n🔍 Checking Environment Variables...\n');

const requiredVars = [
  'POLAR_ACCESS_TOKEN',
  'POLAR_WEBHOOK_SECRET', 
  'NEXT_PUBLIC_POLAR_ORGANIZATION_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let allGood = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const hasValue = !!value;
  const displayValue = hasValue ? 
    (value.length > 20 ? value.substring(0, 20) + '...' : value) : 
    'NOT SET';
  
  console.log(`${hasValue ? '✅' : '❌'} ${varName}: ${displayValue}`);
  
  if (!hasValue) {
    allGood = false;
  }
});

console.log('\n📂 Environment File Check:');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

console.log(`${envExists ? '✅' : '❌'} .env.local file exists: ${envExists}`);

if (envExists) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`📄 .env.local has ${lines.length} non-comment lines`);
    
    // Check if POLAR_ACCESS_TOKEN exists in file
    const hasPolarToken = lines.some(line => line.startsWith('POLAR_ACCESS_TOKEN='));
    console.log(`${hasPolarToken ? '✅' : '❌'} POLAR_ACCESS_TOKEN found in .env.local`);
    
    if (hasPolarToken) {
      const tokenLine = lines.find(line => line.startsWith('POLAR_ACCESS_TOKEN='));
      const tokenValue = tokenLine.split('=')[1];
      console.log(`🔑 Token in file: ${tokenValue?.substring(0, 20)}...`);
      
      // Compare with loaded env var
      const loadedToken = process.env.POLAR_ACCESS_TOKEN;
      const matches = tokenValue === loadedToken;
      console.log(`${matches ? '✅' : '❌'} File token matches loaded env var: ${matches}`);
      
      if (!matches) {
        console.log('\n🚨 TOKEN MISMATCH DETECTED!');
        console.log('File token:', tokenValue?.substring(0, 20) + '...');
        console.log('Loaded token:', loadedToken?.substring(0, 20) + '...');
        console.log('\n💡 Solution: Restart your development server completely');
      }
    }
  } catch (error) {
    console.log('❌ Error reading .env.local:', error.message);
  }
}

console.log('\n📋 Summary:');
if (allGood && envExists) {
  console.log('✅ All environment variables are properly loaded!');
  console.log('\nIf you still get 401 errors, the issue is likely:');
  console.log('1. Token is expired/revoked in Polar dashboard');
  console.log('2. Token doesn\'t have the right permissions');
  console.log('3. Wrong environment (sandbox vs production)');
} else {
  console.log('❌ Environment setup issues detected');
  console.log('\n🔧 Next steps:');
  console.log('1. Ensure .env.local exists in project root');
  console.log('2. Add all required environment variables');
  console.log('3. Restart your development server completely');
  console.log('4. Run this script again to verify');
}

console.log('');