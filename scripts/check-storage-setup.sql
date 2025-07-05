-- Check if company-assets bucket exists
SELECT * FROM storage.buckets WHERE name = 'company-assets';

-- Check storage policies
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%company%';

-- If bucket doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'company-assets') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);
    RAISE NOTICE 'Created company-assets bucket';
  ELSE
    RAISE NOTICE 'Company-assets bucket already exists';
  END IF;
END $$;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Check and create upload policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own company assets') THEN
    EXECUTE 'CREATE POLICY "Users can upload their own company assets" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = ''company-assets'' AND
      auth.uid()::text = (string_to_array(name, ''/''))[1]
    )';
    RAISE NOTICE 'Created upload policy';
  END IF;

  -- Check and create view policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own company assets') THEN
    EXECUTE 'CREATE POLICY "Users can view their own company assets" ON storage.objects
    FOR SELECT USING (
      bucket_id = ''company-assets'' AND
      auth.uid()::text = (string_to_array(name, ''/''))[1]
    )';
    RAISE NOTICE 'Created view policy';
  END IF;

  -- Check and create update policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own company assets') THEN
    EXECUTE 'CREATE POLICY "Users can update their own company assets" ON storage.objects
    FOR UPDATE USING (
      bucket_id = ''company-assets'' AND
      auth.uid()::text = (string_to_array(name, ''/''))[1]
    )';
    RAISE NOTICE 'Created update policy';
  END IF;

  -- Check and create delete policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own company assets') THEN
    EXECUTE 'CREATE POLICY "Users can delete their own company assets" ON storage.objects
    FOR DELETE USING (
      bucket_id = ''company-assets'' AND
      auth.uid()::text = (string_to_array(name, ''/''))[1]
    )';
    RAISE NOTICE 'Created delete policy';
  END IF;

  -- Check and create public view policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view company assets') THEN
    EXECUTE 'CREATE POLICY "Public can view company assets" ON storage.objects
    FOR SELECT USING (bucket_id = ''company-assets'')';
    RAISE NOTICE 'Created public view policy';
  END IF;

  RAISE NOTICE 'All storage policies checked and created if needed';
END $$; 