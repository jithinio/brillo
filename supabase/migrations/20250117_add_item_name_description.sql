-- Migration: Add item_name and item_description fields to invoice items
-- This migration adds support for separate item name and description fields

-- Update existing invoices to use new structure
-- Convert description to item_name and add empty item_description
UPDATE invoices 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'item_name' THEN item
      ELSE item || jsonb_build_object(
        'item_name', COALESCE(item->>'description', item->>'item_name', ''),
        'item_description', COALESCE(item->>'item_description', '')
      ) - 'description'
    END
  )
  FROM jsonb_array_elements(items) as item
)
WHERE items IS NOT NULL 
AND jsonb_array_length(items) > 0
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(items) as item 
  WHERE item ? 'description' AND NOT (item ? 'item_name')
);

-- Update the view to include new fields
DROP VIEW IF EXISTS invoice_items_view;
CREATE OR REPLACE VIEW invoice_items_view AS
SELECT 
  i.id as invoice_id,
  i.invoice_number,
  (item->>'id')::uuid as id,
  COALESCE(item->>'item_name', item->>'description') as item_name,
  COALESCE(item->>'item_description', '') as item_description,
  (item->>'quantity')::numeric as quantity,
  (item->>'rate')::numeric as rate,
  (item->>'amount')::numeric as amount
FROM invoices i
CROSS JOIN jsonb_array_elements(i.items) as item;

-- Verify the migration worked correctly
-- Uncomment to check results:
-- SELECT 
--   invoice_number,
--   jsonb_array_length(items) as items_count,
--   items
-- FROM invoices 
-- WHERE jsonb_array_length(items) > 0
-- LIMIT 5;
