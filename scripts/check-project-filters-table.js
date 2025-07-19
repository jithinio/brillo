const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndCreateTable() {
  try {
    console.log('Checking if project_filter_preferences table exists...')
    
    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('project_filter_preferences')
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.log('Table does not exist. Creating it...')
        await createTable()
      } else {
        console.error('Error checking table:', error)
        process.exit(1)
      }
    } else {
      console.log('✅ Table project_filter_preferences exists')
    }
    
    // Test inserting a sample record
    console.log('Testing table functionality...')
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      filter_name: 'test_filter',
      filter_value: { status: ['active'], client: [] },
      updated_at: new Date().toISOString()
    }
    
    const { error: insertError } = await supabase
      .from('project_filter_preferences')
      .upsert(testData)
    
    if (insertError) {
      console.error('❌ Error testing table insert:', insertError)
    } else {
      console.log('✅ Table insert test successful')
      
      // Clean up test data
      await supabase
        .from('project_filter_preferences')
        .delete()
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

async function createTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS project_filter_preferences (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      filter_name TEXT NOT NULL,
      filter_value JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, filter_name)
    );
  `
  
  const createRLSSQL = `
    ALTER TABLE project_filter_preferences ENABLE ROW LEVEL SECURITY;
  `
  
  const createPoliciesSQL = `
    CREATE POLICY "Users can view their own filter preferences" ON project_filter_preferences
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own filter preferences" ON project_filter_preferences
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own filter preferences" ON project_filter_preferences
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own filter preferences" ON project_filter_preferences
      FOR DELETE USING (auth.uid() = user_id);
  `
  
  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_user_id ON project_filter_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_filter_name ON project_filter_preferences(filter_name);
  `
  
  try {
    console.log('Creating table...')
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    if (tableError) {
      console.error('Error creating table:', tableError)
      return
    }
    
    console.log('Enabling RLS...')
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: createRLSSQL })
    if (rlsError) {
      console.error('Error enabling RLS:', rlsError)
      return
    }
    
    console.log('Creating policies...')
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL })
    if (policiesError) {
      console.error('Error creating policies:', policiesError)
      return
    }
    
    console.log('Creating indexes...')
    const { error: indexesError } = await supabase.rpc('exec_sql', { sql: createIndexesSQL })
    if (indexesError) {
      console.error('Error creating indexes:', indexesError)
      return
    }
    
    console.log('✅ Table project_filter_preferences created successfully')
  } catch (error) {
    console.error('Error creating table:', error)
  }
}

checkAndCreateTable()
  .then(() => {
    console.log('✅ Setup complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }) 