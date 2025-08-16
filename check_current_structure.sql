-- Check current invoice items structure
SELECT 
  invoice_number,
  jsonb_array_length(items) as items_count,
  items
FROM invoices 
WHERE jsonb_array_length(items) > 0
LIMIT 3;

-- Check if items already have the new field structure
SELECT 
  invoice_number,
  item,
  item ? 'item_name' as has_item_name,
  item ? 'item_description' as has_item_description,
  item ? 'description' as has_old_description
FROM invoices,
LATERAL jsonb_array_elements(items) as item
WHERE jsonb_array_length(items) > 0
LIMIT 5;
