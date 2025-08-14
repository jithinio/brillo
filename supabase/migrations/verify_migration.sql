-- Verification script to check the migration was successful
-- Run this after applying migrate_to_json_items.sql

-- 1. Check if items column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'items';

-- 2. Count invoices with items
SELECT 
  COUNT(*) as total_invoices,
  COUNT(CASE WHEN jsonb_array_length(items) > 0 THEN 1 END) as invoices_with_items,
  COUNT(CASE WHEN jsonb_array_length(items) = 0 THEN 1 END) as invoices_without_items
FROM invoices;

-- 3. Sample of migrated data
SELECT 
  invoice_number,
  jsonb_array_length(items) as items_count,
  items
FROM invoices 
WHERE jsonb_array_length(items) > 0
ORDER BY created_at DESC
LIMIT 5;

-- 4. Compare totals (should match before migration)
-- Count original items
SELECT COUNT(*) as original_items_count FROM invoice_items;

-- Count JSON items
SELECT SUM(jsonb_array_length(items)) as json_items_count FROM invoices;

-- 5. Check specific invoice structure
SELECT 
  invoice_number,
  items->>0 as first_item_json,
  (items->0->>'description') as first_item_description,
  (items->0->>'quantity') as first_item_quantity,
  (items->0->>'rate') as first_item_rate
FROM invoices 
WHERE jsonb_array_length(items) > 0
LIMIT 3;

-- 6. Test the backward compatibility view
SELECT * FROM invoice_items_view LIMIT 5;
