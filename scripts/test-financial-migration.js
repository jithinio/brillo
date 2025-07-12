// Test the financial migration script
const { createClient } = require('@supabase/supabase-js')

// Use the same hardcoded credentials as the app
const supabaseUrl = "https://hirrwwzrixpypdnhrwvc.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcnJ3d3pyaXhweXBkbmhyd3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjc1NTQsImV4cCI6MjA2Njg0MzU1NH0.0XfgudzrXsi1vwjEoZ6pSbJSbQrrId9mYOmzYKEJcJo"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testFinancialMigration() {
  console.log('🧪 Testing financial migration...\n')
  
  // Test 1: Check if new fields exist
  console.log('📝 Test 1: Query existing projects to check new fields')
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Query failed:', error.message)
    } else if (data && data.length > 0) {
      console.log('✅ Sample project with new fields:')
      Object.keys(data[0]).forEach(key => {
        console.log(`  ✓ ${key}: ${typeof data[0][key]} = ${data[0][key]}`)
      })
    } else {
      console.log('📝 No existing projects found')
    }
  } catch (error) {
    console.error('❌ Test 1 error:', error.message)
  }
  
  // Test 2: Insert a financial-focused project
  console.log('\n📝 Test 2: Insert project with financial fields')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name: 'TEST_FINANCIAL_PROJECT',
        budget: 50000,
        expenses: 15000,
        revenue: 45000,
        currency: 'USD',
        payment_status: 'partial',
        invoice_amount: 45000,
        payment_received: 30000,
        description: 'Test project with financial tracking'
      }])
      .select()
    
    if (error) {
      console.log('❌ Financial insert failed:', error.message)
    } else {
      console.log('✅ Financial insert succeeded:')
      console.log('  💰 Budget:', data[0].budget)
      console.log('  📉 Expenses:', data[0].expenses)
      console.log('  📈 Revenue:', data[0].revenue)
      console.log('  📊 Profit Margin:', data[0].profit_margin + '%')
      console.log('  💵 Currency:', data[0].currency)
      console.log('  🔄 Payment Status:', data[0].payment_status)
      console.log('  📋 Invoice Amount:', data[0].invoice_amount)
      console.log('  ✅ Payment Received:', data[0].payment_received)
      console.log('  ⏳ Payment Pending:', data[0].payment_pending)
      
      // Clean up
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 2 error:', error.message)
  }
  
  // Test 3: Test profit margin calculation trigger
  console.log('\n📝 Test 3: Test profit margin auto-calculation')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name: 'TEST_PROFIT_CALCULATION',
        budget: 10000,
        expenses: 3000,
        revenue: 8000,
        currency: 'USD',
        payment_status: 'pending',
        invoice_amount: 8000,
        payment_received: 4000
      }])
      .select()
    
    if (error) {
      console.log('❌ Profit calculation test failed:', error.message)
    } else {
      console.log('✅ Profit calculation test succeeded:')
      console.log('  📈 Revenue: $8,000')
      console.log('  📉 Expenses: $3,000')
      console.log('  📊 Auto-calculated Profit Margin:', data[0].profit_margin + '%')
      console.log('  💸 Expected: 62.5% | Actual:', data[0].profit_margin + '%')
      console.log('  ✅ Payment Received: $4,000')
      console.log('  ⏳ Auto-calculated Payment Pending:', data[0].payment_pending)
      
      // Verify calculations
      const expectedProfitMargin = Math.round(((8000 - 3000) / 8000 * 100) * 100) / 100
      const expectedPaymentPending = 8000 - 4000
      
      if (data[0].profit_margin === expectedProfitMargin) {
        console.log('  ✅ Profit margin calculation is correct!')
      } else {
        console.log('  ❌ Profit margin calculation is wrong')
      }
      
      if (data[0].payment_pending === expectedPaymentPending) {
        console.log('  ✅ Payment pending calculation is correct!')
      } else {
        console.log('  ❌ Payment pending calculation is wrong')
      }
      
      // Clean up
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 3 error:', error.message)
  }
  
  // Test 4: Test currency validation
  console.log('\n📝 Test 4: Test currency validation')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name: 'TEST_INVALID_CURRENCY',
        budget: 1000,
        currency: 'INVALID'
      }])
      .select()
    
    if (error) {
      console.log('✅ Currency validation working:', error.message)
    } else {
      console.log('❌ Currency validation failed - invalid currency was accepted')
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 4 error:', error.message)
  }
  
  // Test 5: Test payment status validation
  console.log('\n📝 Test 5: Test payment status validation')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name: 'TEST_INVALID_STATUS',
        budget: 1000,
        payment_status: 'invalid_status'
      }])
      .select()
    
    if (error) {
      console.log('✅ Payment status validation working:', error.message)
    } else {
      console.log('❌ Payment status validation failed - invalid status was accepted')
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 5 error:', error.message)
  }
  
  console.log('\n🎉 Financial migration tests completed!')
}

testFinancialMigration().catch(console.error) 