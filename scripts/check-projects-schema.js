const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProjectsSchema() {
  try {
    console.log('Checking projects table schema...')
    
    // Get table information
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'projects')
      .eq('table_schema', 'public')
      .order('ordinal_position')

    if (tableError) {
      console.error('Error fetching table schema:', tableError)
      return
    }

    console.log('\nProjects table columns:')
    tableInfo.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })

    // Get sample data
    const { data: sampleData, error: dataError } = await supabase
      .from('projects')
      .select('*')
      .limit(3)

    if (dataError) {
      console.error('Error fetching sample data:', dataError)
      return
    }

    console.log('\nSample project data:')
    sampleData.forEach((project, index) => {
      console.log(`\nProject ${index + 1}:`)
      Object.keys(project).forEach(key => {
        console.log(`  ${key}: ${project[key]}`)
      })
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

checkProjectsSchema() 