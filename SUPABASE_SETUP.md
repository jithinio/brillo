# Supabase Integration Setup Guide

This guide will help you set up Supabase properly to make your application work with a real database instead of mock data.

## 🚀 Quick Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `suitebase-app` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait for the project to be created (2-3 minutes)

### 2. Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 3. Update Your Environment Variables

#### For Local Development:
Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key
```

#### For Vercel Deployment:
1. Go to your Vercel dashboard
2. Select your project → Settings → Environment Variables
3. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key`
4. Redeploy your application

### 4. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `scripts/setup-database.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the script
5. Wait for it to complete (should see "Success" message)

### 5. Add Sample Data (Optional)

1. Still in the **SQL Editor**
2. Copy the entire contents of `scripts/seed-sample-data.sql`
3. Paste it into the SQL Editor and run it
4. This will populate your database with sample clients, projects, and invoices

### 6. Enable Authentication

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Configure your authentication settings:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add your production domain when ready
3. Optionally enable OAuth providers (Google, GitHub, etc.)

### 7. Test Your Setup

1. Restart your development server: `npm run dev`
2. Go to `/login` and create a new account
3. You should be able to sign up and access the dashboard
4. All data should now be stored in your Supabase database

## 🔧 Troubleshooting

### Common Issues:

#### 1. "Failed to fetch" errors
- Check that your environment variables are correct
- Make sure your Supabase project is not paused
- Verify the URLs don't have trailing slashes

#### 2. RLS (Row Level Security) errors
- The setup script includes public policies for testing
- In production, you may want to implement user-specific policies

#### 3. Storage issues (avatar uploads)
- Make sure the `avatars` bucket was created
- Check storage policies in **Storage** → **Policies**

#### 4. Authentication not working
- Verify your Site URL in Authentication settings
- Check that email confirmation is properly configured

### Verification Checklist:

- [ ] Supabase project created and active
- [ ] Environment variables set correctly
- [ ] Database setup script executed successfully
- [ ] Can create new user account
- [ ] Can access dashboard pages
- [ ] Data persists between sessions
- [ ] Avatar uploads work (if testing)

## 📊 Database Schema

Your database includes these main tables:

- **clients** - Customer information
- **projects** - Project details and progress
- **invoices** - Invoice data with status tracking
- **invoice_items** - Line items for invoices
- **profiles** - User profile information

## 🔒 Security Notes

The current setup uses **public policies** for all tables to make it easy to test. For production use, you should:

1. Implement user-specific Row Level Security policies
2. Set up proper authentication flows
3. Consider data access patterns for your use case

## 🚀 Production Deployment

When deploying to production:

1. Update environment variables in your hosting platform
2. Configure proper authentication redirect URLs
3. Review and tighten RLS policies
4. Set up database backups
5. Monitor usage and performance

## 📞 Support

If you encounter issues:

1. Check the Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
2. Verify your setup against this guide
3. Check the browser console for error messages
4. Review the Supabase dashboard logs

Your application should now be fully integrated with Supabase! 🎉 