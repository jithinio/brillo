# Table Preferences Troubleshooting Guide

If you're experiencing issues with table preferences not saving at the account level, follow this guide.

## 🔍 **Step 1: Check Your Debug Info**

Go to the **Clients** page in your dashboard. You'll see a yellow debug card at the top with your current status.

### Debug Information Explained:

- **Supabase Status:** 
  - ✅ "Configured" = Real database connection
  - ❌ "Not Configured" = Using fallback mode

- **User Type:**
  - 🔵 "Real User" = Authenticated with Supabase
  - 🔘 "Mock User" = Using fallback authentication

- **User ID:** Shows your actual user ID from the database

## 🛠️ **Step 2: Based on Your Status**

### Scenario A: Mock User + Not Configured
**Status:** Using localStorage fallback (preferences won't persist across devices)
**Solution:** 
1. Set up your Supabase environment variables properly
2. Run the database migration (see MIGRATION_INSTRUCTIONS.md)

### Scenario B: Real User + Configured + Migration Not Run
**Status:** Database exists but missing `table_preferences` column
**Solution:** 
1. Go to your Supabase dashboard
2. Run the SQL migration from MIGRATION_INSTRUCTIONS.md

### Scenario C: Real User + Configured + Migration Run
**Status:** Everything should work!
**Test:** Click "Test Save Preference" in the debug panel

## 🔧 **Step 3: Test the Fix**

1. Click "Test Save Preference" in the debug panel
2. If you see "✅ Save successful!" - you're all set!
3. If you see "❌ Save failed" - continue troubleshooting

## 🚨 **Common Issues & Solutions**

### Issue: "Failed to save table preferences"
**Cause:** Column doesn't exist or profile missing
**Solution:** 
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS table_preferences JSONB DEFAULT '{}'::jsonb;
```

### Issue: Mock user but want real authentication
**Cause:** Supabase environment variables not set
**Solution:** Check your `.env.local` file has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Issue: Real user but no profile record
**Cause:** Profile wasn't created on signup
**Solution:** The system will auto-create profiles now, or run:
```sql
-- Replace 'your-user-id' with your actual user ID from debug panel
INSERT INTO profiles (id, full_name) 
VALUES ('your-user-id', 'Your Name')
ON CONFLICT (id) DO NOTHING;
```

## ✅ **Verification Steps**

After fixing:
1. Customize some table columns (hide/show columns)
2. Refresh the page
3. Check that your customizations are still there
4. Log out and log back in
5. Verify customizations persist

## 📱 **Fallback Behavior**

The system is designed to work even if the database isn't set up:
- **Database available:** Preferences sync across devices ✨
- **Database unavailable:** Preferences save to browser localStorage 💾
- **Nothing works:** System uses responsive defaults 📱

## 🆘 **Still Having Issues?**

Check the browser console (F12) for any error messages and share them along with your debug panel information. 