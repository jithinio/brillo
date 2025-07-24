-- Reset invoice sequences to match actual invoices
-- This fixes the issue where sequences got ahead due to page-load generation

DO $$
DECLARE
    r RECORD;
    actual_max INTEGER;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
    -- For each user, reset their sequence to match actual invoices
    FOR r IN 
        SELECT DISTINCT user_id 
        FROM invoices 
        WHERE invoice_number IS NOT NULL
    LOOP
        -- Find the actual maximum invoice number for this user in current year
        SELECT COALESCE(
            MAX(
                CAST(
                    SPLIT_PART(
                        SPLIT_PART(invoice_number, '-', 3), 
                        '-', 1
                    ) AS INTEGER
                )
            ), 0
        ) INTO actual_max
        FROM invoices 
        WHERE user_id = r.user_id 
        AND invoice_number LIKE '%' || current_year || '%'
        AND invoice_number ~ '.*-[0-9]+$'; -- Only count properly formatted numbers
        
        -- Update or insert the correct sequence
        INSERT INTO invoice_sequences (user_id, year, last_number)
        VALUES (r.user_id, current_year, actual_max)
        ON CONFLICT (user_id, year) 
        DO UPDATE SET 
            last_number = actual_max,
            updated_at = NOW();
            
        RAISE NOTICE 'Reset sequence for user % to %', r.user_id, actual_max;
    END LOOP;
    
    -- Also reset sequences for users who have sequences but no invoices
    FOR r IN 
        SELECT user_id, year, last_number
        FROM invoice_sequences 
        WHERE year = current_year
        AND user_id NOT IN (
            SELECT DISTINCT user_id 
            FROM invoices 
            WHERE invoice_number IS NOT NULL
            AND invoice_number LIKE '%' || current_year || '%'
        )
    LOOP
        -- Reset to 0 since they have no actual invoices
        UPDATE invoice_sequences 
        SET last_number = 0, updated_at = NOW()
        WHERE user_id = r.user_id AND year = r.year;
        
        RAISE NOTICE 'Reset empty sequence for user % to 0', r.user_id;
    END LOOP;
    
END $$;

-- Verify the results
SELECT 
    s.user_id,
    s.year,
    s.last_number as sequence_number,
    COUNT(i.id) as actual_invoices,
    MAX(
        CASE 
            WHEN i.invoice_number ~ '.*-[0-9]+$' THEN
                CAST(
                    SPLIT_PART(
                        SPLIT_PART(i.invoice_number, '-', 3), 
                        '-', 1
                    ) AS INTEGER
                )
            ELSE 0
        END
    ) as max_invoice_number
FROM invoice_sequences s
LEFT JOIN invoices i ON s.user_id = i.user_id 
    AND i.invoice_number LIKE '%' || s.year || '%'
WHERE s.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
GROUP BY s.user_id, s.year, s.last_number
ORDER BY s.user_id; 