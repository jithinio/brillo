-- Sample Data Script for Supabase
-- Run this after the setup-database.sql script to populate with sample data

-- Clear existing sample data to prevent conflicts
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE invoice_number LIKE 'INV-2024-%');
DELETE FROM invoices WHERE invoice_number LIKE 'INV-2024-%';
DELETE FROM projects WHERE name IN ('Website Redesign', 'Mobile App Development', 'Brand Identity Package', 'E-commerce Platform', 'Marketing Automation');
DELETE FROM clients WHERE email IN ('john.smith@acmecorp.com', 'sarah@techstart.io', 'mbrown@globalsolutions.com', 'emily.davis@creativestudio.com', 'david@retailplus.com', 'lisa@healthtech.org', 'robert@financeapp.com', 'jennifer@edutech.edu');

-- Insert sample clients
INSERT INTO clients (name, email, phone, company, address, city, state, zip_code, country, notes) VALUES
('John Smith', 'john.smith@acmecorp.com', '+1 (555) 123-4567', 'Acme Corporation', '123 Business Ave', 'New York', 'NY', '10001', 'United States', 'Long-term client, prefers email communication'),
('Sarah Johnson', 'sarah@techstart.io', '+1 (555) 234-5678', 'TechStart Inc.', '456 Innovation Dr', 'San Francisco', 'CA', '94105', 'United States', 'Startup client, fast-paced projects'),
('Michael Brown', 'mbrown@globalsolutions.com', '+1 (555) 345-6789', 'Global Solutions LLC', '789 Enterprise Blvd', 'Chicago', 'IL', '60601', 'United States', 'Enterprise client, requires detailed reporting'),
('Emily Davis', 'emily.davis@creativestudio.com', '+1 (555) 456-7890', 'Creative Studio', '321 Design St', 'Los Angeles', 'CA', '90210', 'United States', 'Creative agency, values innovative solutions'),
('David Wilson', 'david@retailplus.com', '+1 (555) 567-8901', 'Retail Plus', '654 Commerce Way', 'Miami', 'FL', '33101', 'United States', 'Retail client, seasonal projects'),
('Lisa Anderson', 'lisa@healthtech.org', '+1 (555) 678-9012', 'HealthTech Solutions', '987 Medical Plaza', 'Boston', 'MA', '02101', 'United States', 'Healthcare technology focus'),
('Robert Martinez', 'robert@financeapp.com', '+1 (555) 789-0123', 'Finance App Co.', '147 Fintech Lane', 'Austin', 'TX', '73301', 'United States', 'Fintech startup, compliance focused'),
('Jennifer Lee', 'jennifer@edutech.edu', '+1 (555) 890-1234', 'EduTech Institute', '258 Learning Blvd', 'Seattle', 'WA', '98101', 'United States', 'Education technology, non-profit sector');

-- Insert sample projects and invoices
DO $$
DECLARE
    client_1 UUID;
    client_2 UUID;
    client_3 UUID;
    client_4 UUID;
    client_5 UUID;
    project_1 UUID;
    project_2 UUID;
    project_3 UUID;
    project_4 UUID;
    project_5 UUID;
    invoice_1 UUID;
    invoice_2 UUID;
    invoice_3 UUID;
    invoice_4 UUID;
    invoice_5 UUID;
    invoice_6 UUID;
    invoice_7 UUID;
    invoice_8 UUID;
BEGIN
    -- Get client IDs
    SELECT id INTO client_1 FROM clients WHERE email = 'john.smith@acmecorp.com' LIMIT 1;
    SELECT id INTO client_2 FROM clients WHERE email = 'sarah@techstart.io' LIMIT 1;
    SELECT id INTO client_3 FROM clients WHERE email = 'mbrown@globalsolutions.com' LIMIT 1;
    SELECT id INTO client_4 FROM clients WHERE email = 'emily.davis@creativestudio.com' LIMIT 1;
    SELECT id INTO client_5 FROM clients WHERE email = 'david@retailplus.com' LIMIT 1;

    -- Insert projects one by one
    INSERT INTO projects (name, description, client_id, status, start_date, end_date, budget, hourly_rate, estimated_hours, actual_hours, progress, notes)
    VALUES ('Website Redesign', 'Complete overhaul of company website with modern design and improved UX', client_1, 'active', '2024-01-15', '2024-03-15', 25000.00, 125.00, 200, 120, 60, 'Project is progressing well, client very satisfied')
    RETURNING id INTO project_1;

    INSERT INTO projects (name, description, client_id, status, start_date, end_date, budget, hourly_rate, estimated_hours, actual_hours, progress, notes)
    VALUES ('Mobile App Development', 'iOS and Android app for customer engagement', client_2, 'active', '2024-02-01', '2024-06-01', 75000.00, 150.00, 500, 200, 40, 'Complex project with multiple integrations')
    RETURNING id INTO project_2;

    INSERT INTO projects (name, description, client_id, status, start_date, end_date, budget, hourly_rate, estimated_hours, actual_hours, progress, notes)
    VALUES ('Brand Identity Package', 'Logo design, brand guidelines, and marketing materials', client_3, 'completed', '2023-11-01', '2024-01-31', 15000.00, 100.00, 150, 155, 100, 'Successfully completed, client very happy')
    RETURNING id INTO project_3;

    INSERT INTO projects (name, description, client_id, status, start_date, end_date, budget, hourly_rate, estimated_hours, actual_hours, progress, notes)
    VALUES ('E-commerce Platform', 'Custom e-commerce solution with inventory management', client_4, 'active', '2024-01-20', '2024-05-20', 45000.00, 140.00, 320, 180, 56, 'On track, regular client meetings')
    RETURNING id INTO project_4;

    INSERT INTO projects (name, description, client_id, status, start_date, end_date, budget, hourly_rate, estimated_hours, actual_hours, progress, notes)
    VALUES ('Marketing Automation', 'Email marketing and automation system setup', client_5, 'on_hold', '2024-02-15', '2024-04-15', 12000.00, 110.00, 109, 40, 37, 'Waiting for client approval on campaign strategy')
    RETURNING id INTO project_5;

    -- Insert invoices one by one
    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-001', client_1, project_1, 15000.00, 8.00, 1200.00, 16200.00, 'paid', '2024-01-15', '2024-02-14', '2024-02-10', 'First milestone payment for website redesign', 'Payment due within 30 days')
    RETURNING id INTO invoice_1;

    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-002', client_2, project_2, 30000.00, 8.00, 2400.00, 32400.00, 'sent', '2024-02-01', '2024-03-03', NULL, 'Initial development phase payment', 'Payment due within 30 days')
    RETURNING id INTO invoice_2;

    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-003', client_3, project_3, 15000.00, 8.00, 1200.00, 16200.00, 'paid', '2024-01-01', '2024-01-31', '2024-01-28', 'Final payment for brand identity project', 'Payment due within 30 days')
    RETURNING id INTO invoice_3;

    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-004', client_4, project_4, 22500.00, 8.00, 1800.00, 24300.00, 'sent', '2024-02-15', '2024-03-17', NULL, 'E-commerce platform development - Phase 1', 'Payment due within 30 days')
    RETURNING id INTO invoice_4;

    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-005', client_5, project_5, 4400.00, 8.00, 352.00, 4752.00, 'draft', '2024-02-20', '2024-03-22', NULL, 'Marketing automation setup - partial payment', 'Payment due within 30 days')
    RETURNING id INTO invoice_5;

    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-006', client_1, project_1, 10000.00, 8.00, 800.00, 10800.00, 'overdue', '2024-01-01', '2024-01-31', NULL, 'Website redesign - second milestone', 'Payment due within 30 days')
    RETURNING id INTO invoice_6;

    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-007', client_2, NULL, 5000.00, 8.00, 400.00, 5400.00, 'sent', '2024-02-25', '2024-03-27', NULL, 'Consultation services', 'Payment due within 30 days')
    RETURNING id INTO invoice_7;

    INSERT INTO invoices (invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms)
    VALUES ('INV-2024-008', client_4, project_4, 22500.00, 8.00, 1800.00, 24300.00, 'draft', '2024-03-01', '2024-03-31', NULL, 'E-commerce platform - Phase 2', 'Payment due within 30 days')
    RETURNING id INTO invoice_8;

    -- Insert sample invoice items
    INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES
    -- Invoice 1 items
    (invoice_1, 'Website Design and Development', 80.0, 125.00, 10000.00),
    (invoice_1, 'Content Migration', 20.0, 125.00, 2500.00),
    (invoice_1, 'SEO Optimization', 20.0, 125.00, 2500.00),
    
    -- Invoice 2 items
    (invoice_2, 'Mobile App Architecture', 40.0, 150.00, 6000.00),
    (invoice_2, 'iOS Development', 80.0, 150.00, 12000.00),
    (invoice_2, 'Android Development', 80.0, 150.00, 12000.00),
    
    -- Invoice 3 items
    (invoice_3, 'Logo Design', 30.0, 100.00, 3000.00),
    (invoice_3, 'Brand Guidelines', 40.0, 100.00, 4000.00),
    (invoice_3, 'Marketing Materials', 80.0, 100.00, 8000.00),
    
    -- Invoice 4 items
    (invoice_4, 'E-commerce Platform Setup', 60.0, 140.00, 8400.00),
    (invoice_4, 'Custom Features Development', 100.0, 140.00, 14000.00),
    
    -- Invoice 5 items
    (invoice_5, 'Email System Configuration', 20.0, 110.00, 2200.00),
    (invoice_5, 'Automation Workflows', 20.0, 110.00, 2200.00);

END $$;

-- Display summary of inserted data
SELECT 
    'Data Summary' as info,
    (SELECT COUNT(*) FROM clients) as total_clients,
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM invoices) as total_invoices,
    (SELECT COUNT(*) FROM invoice_items) as total_invoice_items; 