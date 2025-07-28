-- Fix storage policies for avatar uploads
-- Run this in your Supabase SQL Editor

-- First, ensure RLS is enabled on storage.objects (it should be by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads to avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to company_assets bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to company_assets bucket" ON storage.objects;

-- Create policies for avatars bucket
CREATE POLICY "Allow authenticated uploads to avatars bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow public read access to avatars bucket" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Create policies for company_assets bucket
CREATE POLICY "Allow authenticated uploads to company_assets bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company_assets');

CREATE POLICY "Allow public read access to company_assets bucket" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'company_assets');

-- Optional: Allow authenticated users to update/delete their own uploads
CREATE POLICY "Allow authenticated users to update avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to delete avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to update company_assets" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'company_assets');

CREATE POLICY "Allow authenticated users to delete company_assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'company_assets');
