const { createClient } = require('@supabase/supabase-js')

async function migrateAvatarColumn() {
  // Initialize Supabase client
  const supabase = createClient(
    'https://hirrwwzrixpypdnhrwvc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcnJ3d3pyaXhweXBkbmhyd3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDg3MDQwNywiZXhwIjoyMDUwNDQ2NDA3fQ.B49I0qJpOUpVhJMOLk7QFYPH1KsP9keDJmWjB2dHJjE' // Service role key
  )

  try {
    console.log('Adding avatar_url column to clients table...')
    
    // Add avatar_url column
    const { error } = await supabase
      .rpc('sql', {
        query: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;'
      })

    if (error) {
      console.error('Error adding column:', error)
      return
    }

    console.log('✅ Successfully added avatar_url column to clients table')
    
    // Verify the column was added
    const { data, error: verifyError } = await supabase
      .from('clients')
      .select('*')
      .limit(1)

    if (verifyError) {
      console.error('Error verifying column:', verifyError)
      return
    }

    console.log('✅ Migration completed successfully')
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrateAvatarColumn() 