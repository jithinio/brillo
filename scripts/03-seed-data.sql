-- Insert sample clients
INSERT INTO clients (id, name, email, phone, company, address, city, state, zip_code, notes) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john.smith@acmecorp.com', '+1 (555) 123-4567', 'Acme Corporation', '123 Business Ave', 'New York', 'NY', '10001', 'Long-term client, prefers email communication'),
('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah@techstart.io', '+1 (555) 234-5678', 'TechStart Inc.', '456 Innovation Dr', 'San Francisco', 'CA', '94105', 'Startup client, fast-paced projects'),
('550e8400-e29b-41d4-a716-446655440003', 'Michael Brown', 'mbrown@globalsolutions.com', '+1 (555) 345-6789', 'Global Solutions LLC', '789 Enterprise Blvd', 'Chicago', 'IL', '60601', 'Enterprise client, requires detailed reporting'),
('550e8400-e29b-41d4-a716-446655440004', 'Emily Davis', 'emily.davis@creativestudio.com', '+1 (555) 456-7890', 'Creative Studio', '321 Design St', 'Los Angeles', 'CA', '90210', 'Creative agency, values innovative solutions'),
('550e8400-e29b-41d4-a716-446655440005', 'David Wilson', 'david@retailplus.com', '+1 (555) 567-8901', 'Retail Plus', '654 Commerce Way', 'Miami', 'FL', '33101', 'Retail client, seasonal projects')
ON CONFLICT (id) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (id, name, description, client_id, status, start_date, end_date, budget, hourly_rate, estimated_hours, actual_hours, progress, notes) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Website Redesign', 'Complete redesign of corporate website with modern UI/UX', '550e8400-e29b-41d4-a716-446655440001', 'active', '2024-01-15', '2024-03-15', 15000.00, 125.00, 120, 45, 65, 'Phase 1 completed, working on responsive design'),
('660e8400-e29b-41d4-a716-446655440002', 'Mobile App Development', 'Native iOS and Android app for customer engagement', '550e8400-e29b-41d4-a716-446655440002', 'active', '2024-02-01', '2024-06-01', 45000.00, 150.00, 300, 120, 40, 'Backend API development in progress'),
('660e8400-e29b-41d4-a716-446655440003', 'Brand Identity Package', 'Logo design, brand guidelines, and marketing materials', '550e8400-e29b-41d4-a716-446655440003', 'completed', '2023-11-01', '2024-01-31', 8500.00, 100.00, 85, 85, 100, 'Project completed successfully, client very satisfied'),
('660e8400-e29b-41d4-a716-446655440004', 'E-commerce Platform', 'Custom e-commerce solution with payment integration', '550e8400-e29b-41d4-a716-446655440004', 'active', '2024-01-01', '2024-04-30', 25000.00, 140.00, 180, 60, 35, 'Payment gateway integration phase'),
('660e8400-e29b-41d4-a716-446655440005', 'Marketing Automation', 'Email marketing and CRM integration system', '550e8400-e29b-41d4-a716-446655440005', 'on_hold', '2024-02-15', '2024-05-15', 12000.00, 120.00, 100, 25, 25, 'On hold pending client budget approval')
ON CONFLICT (id) DO NOTHING;

-- Insert sample invoices
INSERT INTO invoices (id, invoice_number, client_id, project_id, amount, tax_rate, tax_amount, total_amount, status, issue_date, due_date, paid_date, notes, terms) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'INV-2024-001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 5000.00, 8.00, 400.00, 5400.00, 'paid', '2024-01-15', '2024-02-14', '2024-02-10', 'First milestone payment for website redesign', 'Net 30 days. Late payments subject to 1.5% monthly service charge.'),
('770e8400-e29b-41d4-a716-446655440002', 'INV-2024-002', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 15000.00, 8.00, 1200.00, 16200.00, 'sent', '2024-02-01', '2024-03-03', NULL, 'Initial development phase - mobile app', 'Net 30 days. Late payments subject to 1.5% monthly service charge.'),
('770e8400-e29b-41d4-a716-446655440003', 'INV-2024-003', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 7500.00, 8.00, 600.00, 8100.00, 'overdue', '2024-01-01', '2024-01-31', NULL, 'Final payment for brand identity package', 'Net 30 days. Late payments subject to 1.5% monthly service charge.'),
('770e8400-e29b-41d4-a716-446655440004', 'INV-2024-004', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 8750.00, 8.00, 700.00, 9450.00, 'sent', '2024-02-15', '2024-03-17', NULL, 'E-commerce platform development - Phase 1', 'Net 30 days. Late payments subject to 1.5% monthly service charge.'),
('770e8400-e29b-41d4-a716-446655440005', 'INV-2024-005', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005', 3000.00, 8.00, 240.00, 3240.00, 'draft', '2024-02-20', '2024-03-22', NULL, 'Marketing automation setup - initial consultation', 'Net 30 days. Late payments subject to 1.5% monthly service charge.')
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert sample invoice items
INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount) VALUES
-- Items for INV-2024-001
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'UI/UX Design - Homepage and key pages', 1.00, 2500.00, 2500.00),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'Frontend Development - Responsive layout', 1.00, 2500.00, 2500.00),

-- Items for INV-2024-002
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'Mobile App Architecture & Planning', 40.00, 150.00, 6000.00),
('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'Backend API Development', 60.00, 150.00, 9000.00),

-- Items for INV-2024-003
('880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440003', 'Logo Design & Brand Identity', 1.00, 3500.00, 3500.00),
('880e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440003', 'Brand Guidelines & Style Guide', 1.00, 2000.00, 2000.00),
('880e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440003', 'Marketing Materials Design', 1.00, 2000.00, 2000.00),

-- Items for INV-2024-004
('880e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440004', 'E-commerce Platform Setup', 1.00, 4000.00, 4000.00),
('880e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440004', 'Product Catalog Development', 1.00, 2750.00, 2750.00),
('880e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440004', 'Shopping Cart Integration', 1.00, 2000.00, 2000.00),

-- Items for INV-2024-005
('880e8400-e29b-41d4-a716-446655440011', '770e8400-e29b-41d4-a716-446655440005', 'Marketing Automation Consultation', 20.00, 120.00, 2400.00),
('880e8400-e29b-41d4-a716-446655440012', '770e8400-e29b-41d4-a716-446655440005', 'Initial System Setup', 5.00, 120.00, 600.00)
ON CONFLICT (id) DO NOTHING;
