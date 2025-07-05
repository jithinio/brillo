-- First, create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;

-- Create upload policy
CREATE POLICY "Users can upload their own company assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Create view policy for own files
CREATE POLICY "Users can view their own company assets" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Create update policy
CREATE POLICY "Users can update their own company assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Create delete policy
CREATE POLICY "Users can delete their own company assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Create public view policy (so logos show in invoices)
CREATE POLICY "Public can view company assets" ON storage.objects
FOR SELECT USING (bucket_id = 'company-assets');

-- Verify setup
SELECT 'Bucket created:' as status, name FROM storage.buckets WHERE name = 'company-assets';
SELECT 'Policies created:' as status, count(*) as policy_count FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%company%'; 