-- Migration: Move invoice items to JSON column for better PDF/email performance
-- This migration consolidates invoice_items into a JSON column in the invoices table

-- Step 1: Add items column to invoices table
ALTER TABLE invoices 
ADD COLUMN items jsonb DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing data from invoice_items to JSON
UPDATE invoices 
SET items = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', item.id::text,
      'item_name', COALESCE(item.item_name, item.description),
      'item_description', COALESCE(item.item_description, ''),
      'quantity', item.quantity,
      'rate', item.rate,
      'amount', item.amount
    ) ORDER BY item.created_at
  ), '[]'::jsonb)
  FROM invoice_items item 
  WHERE item.invoice_id = invoices.id
);

-- Step 3: Add constraints and indexes
ALTER TABLE invoices 
ALTER COLUMN items SET NOT NULL;

-- Add useful indexes for JSON queries
CREATE INDEX IF NOT EXISTS idx_invoices_items_gin ON invoices USING gin (items);
CREATE INDEX IF NOT EXISTS idx_invoices_items_count ON invoices ((jsonb_array_length(items)));

-- Step 4: Create view for backward compatibility (optional)
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

-- Step 5: Verify migration (run this to check)
-- SELECT 
--   invoice_number,
--   jsonb_array_length(items) as items_count,
--   items
-- FROM invoices 
-- WHERE jsonb_array_length(items) > 0
-- LIMIT 5;

-- Step 6: After verification, optionally drop old table
-- WARNING: Only run this after thorough testing!
-- DROP TABLE invoice_items;
