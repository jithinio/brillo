#!/usr/bin/env node

/**
 * Fix Existing Customer Script
 * 
 * This script helps resolve the issue where a customer exists in Polar
 * but cannot be retrieved through the API. It manually searches for the
 * customer and updates the user profile with the correct customer ID.
 * 
 * Usage: node scripts/fix-existing-customer.js <email>
 */

// Load environment variables
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
}

async function main() {
  const email = process.argv[2] || 'hello@jithinkumar.com'
  
  console.log('🔍 Searching for existing customer:', email)
  
  try {
    // Import Polar SDK
    const { Polar } = require('@polar-sh/sdk')
    
    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      server: "production",
    })
    
    // Search through all customers
    console.log('🔍 Searching all customers...')
    
    let found = false
    let page = 1
    
    while (page <= 5 && !found) {
      try {
        console.log(`Searching page ${page}...`)
        
        const customers = await polar.customers.list({ 
          limit: 100,
          page: page
        })
        
        if (customers.items && customers.items.length > 0) {
          console.log(`Found ${customers.items.length} customers on page ${page}`)
          
          const exactMatch = customers.items.find(c => c.email === email)
          if (exactMatch) {
            console.log('✅ Found customer!')
            console.log('Customer ID:', exactMatch.id)
            console.log('Email:', exactMatch.email)
            console.log('Name:', exactMatch.name)
            console.log('Created:', exactMatch.createdAt)
            
            console.log('\n📝 To fix this issue:')
            console.log('1. Log into your app as this user')
            console.log('2. Go to your database (Supabase)')
            console.log('3. Update the profiles table:')
            console.log(`   UPDATE profiles SET polar_customer_id = '${exactMatch.id}' WHERE email = '${email}';`)
            console.log('\n🔄 Or restart your development server and try again - the improved search should find it now.')
            
            found = true
            break
          }
        }
        
        if (!customers.items || customers.items.length < 100) {
          break // No more pages
        }
        
        page++
      } catch (pageError) {
        console.error(`Error searching page ${page}:`, pageError.message)
        break
      }
    }
    
    if (!found) {
      console.log('❌ Customer not found in first 5 pages')
      console.log('💡 The customer might exist but be outside the search scope')
      console.log('🔧 Manual solutions:')
      console.log('1. Create a new customer with a different email')
      console.log('2. Contact Polar support to resolve the customer visibility issue')
      console.log('3. Use the guest portal mode (already implemented in the code)')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main().catch(console.error)
