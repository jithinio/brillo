-- Create company-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Set up RLS policies for the company-assets bucket
CREATE POLICY "Users can upload their own company assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can view their own company assets" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update their own company assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete their own company assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow public access to company assets (for viewing logos in invoices)
CREATE POLICY "Public can view company assets" ON storage.objects
FOR SELECT USING (bucket_id = 'company-assets'); 