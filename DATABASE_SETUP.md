# Database Setup Instructions

## Issue Found ❌

Your company settings are only saving to localStorage because **Supabase is not configured**.

## Root Cause

The environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.

## Solution ✅

### Step 1: Create Environment File

Create a file called `.env.local` in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Email service for invoices
RESEND_API_KEY=your-resend-api-key-here
```

### Step 2: Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or open an existing one
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **anon/public key**

### Step 3: Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'Brillo',
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_website TEXT,
  company_logo TEXT,
  company_registration TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.0,
  tax_name TEXT NOT NULL DEFAULT 'Sales Tax',
  tax_id TEXT,
  tax_jurisdiction TEXT,
  tax_address TEXT,
  include_tax_in_prices BOOLEAN NOT NULL DEFAULT false,
  auto_calculate_tax BOOLEAN NOT NULL DEFAULT true,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  invoice_template JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Add policies for user access
CREATE POLICY "Users can view their own company settings" ON company_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings" ON company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings" ON company_settings
  FOR UPDATE USING (auth.uid() = user_id);
```

### Step 4: Test Connection

After setting up the environment variables, run:

```bash
node test-db-connection.js
```

You should see:
- ✅ Database connection successful!
- ✅ Table exists and accessible

### Step 5: Restart Development Server

```bash
npm run dev
```

## What This Fixes

Once Supabase is properly configured:

1. ✅ **Tax information** will save to database
2. ✅ **Company settings** will persist across browsers/devices  
3. ✅ **Settings sync** between localStorage and database
4. ✅ **User authentication** will work properly
5. ✅ **Multi-user support** with proper data isolation

## Current Behavior (Without Supabase)

- Settings only save to localStorage ❌
- Data doesn't persist across devices ❌
- No user authentication ❌
- Tax fields appear to save but don't persist ❌

## Expected Behavior (With Supabase)

- Settings save to both localStorage AND database ✅
- Data persists across all devices ✅  
- Proper user authentication ✅
- Tax information fully functional ✅

---

**The tax information saving fix I implemented earlier is correct - you just need to configure Supabase to activate the database functionality!**
