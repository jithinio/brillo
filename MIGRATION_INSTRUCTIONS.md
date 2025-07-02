# Database Migration Instructions

To enable persistent table preferences, you need to add a column to your Supabase database.

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Create a new query and paste this SQL:

```sql
-- Add table preferences column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS table_preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.table_preferences IS 'Stores user preferences for table column visibility and other table settings';
```

5. Click **Run** to execute the migration

## Option 2: Check if Migration is Needed

If you're not sure whether you need this migration, run this query first:

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'table_preferences';
```

- If it returns no rows, you need to run the migration above
- If it returns a row, the migration is already complete

## Verification

After running the migration, verify it worked:

```sql
-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'table_preferences';
```

You should see:
- column_name: `table_preferences`
- data_type: `jsonb`
- is_nullable: `YES`
- column_default: `'{}'::jsonb`

## What This Enables

Once the migration is complete:
- ✅ Column preferences persist after logout/login
- ✅ Preferences sync across devices
- ✅ No more "Failed to save table preferences" errors
- ✅ Automatic migration from localStorage to database 