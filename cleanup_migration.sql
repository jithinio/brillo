-- Safe cleanup migration for your existing invoice items
-- This will remove the redundant 'description' field since you already have 'item_name'

-- Update existing invoices to remove the redundant 'description' field
UPDATE invoices 
SET items = (
  SELECT jsonb_agg(
    item - 'description'  -- Remove the 'description' key since item_name already exists
  )
  FROM jsonb_array_elements(items) as item
)
WHERE items IS NOT NULL 
AND jsonb_array_length(items) > 0
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(items) as item 
  WHERE item ? 'description' AND item ? 'item_name'  -- Only if both exist
);

-- Update the view to use the clean structure
DROP VIEW IF EXISTS invoice_items_view;
CREATE OR REPLACE VIEW invoice_items_view AS
SELECT 
  i.id as invoice_id,
  i.invoice_number,
  (item->>'id')::uuid as id,
  item->>'item_name' as item_name,
  item->>'item_description' as item_description,
  (item->>'quantity')::numeric as quantity,
  (item->>'rate')::numeric as rate,
  (item->>'amount')::numeric as amount
FROM invoices i
CROSS JOIN jsonb_array_elements(i.items) as item;

-- Verify the cleanup worked
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
