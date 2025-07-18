const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runFinancialMigration() {
  try {
    console.log('Running financial migration...')
    
    // First, let's check what fields currently exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.error('Error checking current schema:', sampleError)
      return
    }

    if (sampleData && sampleData.length > 0) {
      console.log('\nCurrent project fields:')
      Object.keys(sampleData[0]).forEach(key => {
        console.log(`- ${key}`)
      })
    }

    // Check if financial fields exist
    const hasRevenue = sampleData && sampleData[0] && 'revenue' in sampleData[0]
    const hasExpenses = sampleData && sampleData[0] && 'expenses' in sampleData[0]
    const hasPaymentReceived = sampleData && sampleData[0] && 'payment_received' in sampleData[0]
    const hasPaymentPending = sampleData && sampleData[0] && 'payment_pending' in sampleData[0]

    console.log('\nFinancial fields status:')
    console.log(`- revenue: ${hasRevenue ? 'EXISTS' : 'MISSING'}`)
    console.log(`- expenses: ${hasExpenses ? 'EXISTS' : 'MISSING'}`)
    console.log(`- payment_received: ${hasPaymentReceived ? 'EXISTS' : 'MISSING'}`)
    console.log(`- payment_pending: ${hasPaymentPending ? 'EXISTS' : 'MISSING'}`)

    if (hasRevenue && hasExpenses && hasPaymentReceived && hasPaymentPending) {
      console.log('\n✅ All financial fields already exist!')
      return
    }

    console.log('\n⚠️ Some financial fields are missing. You need to run the migration in Supabase SQL Editor.')
    console.log('\nPlease run the following SQL in your Supabase SQL Editor:')
    console.log('\n--- START SQL ---')
    console.log(`
-- Add financial tracking fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS expenses DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_received DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_pending DECIMAL(10,2) DEFAULT 0;

-- Update existing records to set sensible defaults
UPDATE projects 
SET 
    expenses = 0,
    revenue = COALESCE(budget, 0),
    currency = 'USD',
    payment_status = 'pending',
    invoice_amount = COALESCE(budget, 0),
    payment_received = 0,
    payment_pending = COALESCE(budget, 0)
WHERE expenses IS NULL;
    `)
    console.log('--- END SQL ---')

  } catch (error) {
    console.error('Error:', error)
  }
}

runFinancialMigration() 