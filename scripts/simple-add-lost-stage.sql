-- Simple script to add Lost stage for the current user
-- Run this in Supabase SQL Editor

-- Insert Lost stage for current user (only if it doesn't exist)
INSERT INTO pipeline_stages (name, order_index, color, default_probability)
SELECT 'Lost', COALESCE(MAX(order_index), 0) + 1, '#EF4444', 0
FROM pipeline_stages
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages WHERE LOWER(name) = 'lost'
);