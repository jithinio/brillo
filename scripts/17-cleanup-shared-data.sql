-- Cleanup Script: Remove All Shared Data
-- Run this AFTER the user isolation migration to start fresh with private data

-- WARNING: This will delete ALL existing data!
-- Only run this if you want to start with a completely clean database

-- Step 1: Delete all invoice items first (due to foreign key constraints)
DELETE FROM invoice_items;
SELECT 'Deleted all invoice items' as status;

-- Step 2: Delete all invoices
DELETE FROM invoices;
SELECT 'Deleted all invoices' as status;

-- Step 3: Delete all projects
DELETE FROM projects;
SELECT 'Deleted all projects' as status;

-- Step 4: Delete all clients
DELETE FROM clients;
SELECT 'Deleted all clients' as status;

-- Step 5: Reset sequences if needed (optional)
-- This ensures new records start with clean IDs

-- Display completion message
SELECT 'All shared data has been cleared! Each user will now start with a private, empty workspace.' as message;
SELECT 'Users can now create their own clients, projects, and invoices that will be private to their account.' as note; 