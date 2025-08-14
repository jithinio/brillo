-- CLEANUP SCRIPT: Remove old invoice_items table
-- ⚠️  WARNING: Only run this AFTER thorough testing!
-- ⚠️  Make sure everything works perfectly with JSON items first!

-- Step 1: Final verification before cleanup
DO $$
DECLARE
    original_count INTEGER;
    json_count INTEGER;
BEGIN
    -- Count original items
    SELECT COUNT(*) INTO original_count FROM invoice_items;
    
    -- Count JSON items
    SELECT SUM(jsonb_array_length(items)) INTO json_count FROM invoices;
    
    -- Check if counts match
    IF original_count != json_count THEN
        RAISE EXCEPTION 'Item counts do not match! Original: %, JSON: %. Aborting cleanup.', original_count, json_count;
    END IF;
    
    RAISE NOTICE 'Verification passed. Original items: %, JSON items: %', original_count, json_count;
END
$$;

-- Step 2: Create final backup (optional but recommended)
CREATE TABLE invoice_items_final_backup AS 
SELECT * FROM invoice_items;

-- Step 3: Drop the original table
-- Uncomment the line below only when you're 100% sure everything works
-- DROP TABLE invoice_items;

-- Step 4: Drop the backup compatibility view (optional)
-- DROP VIEW IF EXISTS invoice_items_view;

-- Step 5: Add final comment
COMMENT ON COLUMN invoices.items IS 'JSON array containing invoice line items. Migrated from invoice_items table for better performance.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration to JSON items completed successfully!';
    RAISE NOTICE '📄 PDF generation will now be faster with single queries';
    RAISE NOTICE '📧 Email templates will have simpler data access';
    RAISE NOTICE '🔢 Invoice numbering will have atomic operations';
END
$$;
