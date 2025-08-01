-- Add 'Lost' pipeline stage for all existing users
-- Run this script in Supabase SQL Editor

-- First, let's add the Lost stage for all existing users
DO $$ 
DECLARE
    user_record RECORD;
    max_order INTEGER;
BEGIN
    -- Loop through all users who have pipeline stages
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM pipeline_stages 
    LOOP
        -- Check if Lost stage already exists for this user
        IF NOT EXISTS (
            SELECT 1 FROM pipeline_stages 
            WHERE user_id = user_record.user_id AND LOWER(name) = 'lost'
        ) THEN
            -- Get the current maximum order_index for this user
            SELECT COALESCE(MAX(order_index), 0) INTO max_order 
            FROM pipeline_stages 
            WHERE user_id = user_record.user_id;
            
            -- Insert the Lost stage
            INSERT INTO pipeline_stages (user_id, name, order_index, color, default_probability)
            VALUES (
                user_record.user_id, 
                'Lost', 
                max_order + 1, 
                '#EF4444', -- Red color for lost stage
                0 -- 0% probability for lost projects
            );
            
            RAISE NOTICE 'Added Lost stage for user: %', user_record.user_id;
        ELSE
            RAISE NOTICE 'Lost stage already exists for user: %', user_record.user_id;
        END IF;
    END LOOP;
    
    -- If no users have pipeline stages yet, that's okay - the default stages will be created when they first use the pipeline
    RAISE NOTICE 'Lost pipeline stage setup completed successfully';
END $$;