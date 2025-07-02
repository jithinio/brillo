const { createClient } = require('@supabase/supabase-js')

// Read environment variables
const supabaseUrl = 'https://hirrwwzrixpypdnhrwvc.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateTablePreferences() {
  try {
    console.log('Adding table_preferences column to profiles table...')
    
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add table preferences column to profiles table
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS table_preferences JSONB DEFAULT '{}'::jsonb;
        
        -- Add comment for documentation
        COMMENT ON COLUMN profiles.table_preferences IS 'Stores user preferences for table column visibility and other table settings';
      `
    })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('Column table_preferences added to profiles table')
    
  } catch (error) {
    console.error('Error during migration:', error)
    process.exit(1)
  }
}

// Run the migration
migrateTablePreferences() 