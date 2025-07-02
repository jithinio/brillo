const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedData() {
  console.log('🌱 Seeding Supabase with placeholder data...\n');

  try {
    // Step 1: Insert Clients
    console.log('👥 Inserting clients...');
    const clients = [
      {
        name: 'John Smith',
        email: 'john.smith@acmecorp.com',
        phone: '+1 (555) 123-4567',
        company: 'Acme Corporation',
        address: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        notes: 'Long-term client, prefers email communication'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@techstart.io',
        phone: '+1 (555) 234-5678',
        company: 'TechStart Inc.',
        address: '456 Innovation Dr',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94105',
        notes: 'Startup client, fast-paced projects'
      },
      {
        name: 'Michael Brown',
        email: 'mbrown@globalsolutions.com',
        phone: '+1 (555) 345-6789',
        company: 'Global Solutions LLC',
        address: '789 Enterprise Blvd',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60601',
        notes: 'Enterprise client, requires detailed reporting'
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@creativestudio.com',
        phone: '+1 (555) 456-7890',
        company: 'Creative Studio',
        address: '321 Design St',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
        notes: 'Creative agency, values innovative solutions'
      },
      {
        name: 'David Wilson',
        email: 'david@retailplus.com',
        phone: '+1 (555) 567-8901',
        company: 'Retail Plus',
        address: '654 Commerce Way',
        city: 'Miami',
        state: 'FL',
        zip_code: '33101',
        notes: 'Retail client, seasonal projects'
      }
    ];

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert(clients)
      .select();

    if (clientError) {
      console.log('❌ Error inserting clients:', clientError.message);
      return;
    }
    console.log('✅ Inserted', clientData.length, 'clients');

    // Step 2: Insert Projects
    console.log('\n📋 Inserting projects...');
    const projects = [
      {
        name: 'Website Redesign',
        description: 'Complete redesign of corporate website with modern UI/UX',
        client_id: clientData[0].id, // John Smith
        status: 'active',
        start_date: '2024-01-15',
        end_date: '2024-03-15',
        budget: 15000.00,
        hourly_rate: 125.00,
        estimated_hours: 120,
        actual_hours: 45,
        progress: 65,
        notes: 'Phase 1 completed, working on responsive design'
      },
      {
        name: 'Mobile App Development',
        description: 'Native iOS and Android app for customer engagement',
        client_id: clientData[1].id, // Sarah Johnson
        status: 'active',
        start_date: '2024-02-01',
        end_date: '2024-06-01',
        budget: 45000.00,
        hourly_rate: 150.00,
        estimated_hours: 300,
        actual_hours: 120,
        progress: 40,
        notes: 'Backend API development in progress'
      },
      {
        name: 'Brand Identity Package',
        description: 'Logo design, brand guidelines, and marketing materials',
        client_id: clientData[2].id, // Michael Brown
        status: 'completed',
        start_date: '2023-11-01',
        end_date: '2024-01-31',
        budget: 8500.00,
        hourly_rate: 100.00,
        estimated_hours: 85,
        actual_hours: 85,
        progress: 100,
        notes: 'Project completed successfully, client very satisfied'
      },
      {
        name: 'E-commerce Platform',
        description: 'Custom e-commerce solution with payment integration',
        client_id: clientData[3].id, // Emily Davis
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2024-04-30',
        budget: 25000.00,
        hourly_rate: 140.00,
        estimated_hours: 180,
        actual_hours: 60,
        progress: 35,
        notes: 'Payment gateway integration phase'
      },
      {
        name: 'Marketing Automation',
        description: 'Email marketing and CRM integration system',
        client_id: clientData[4].id, // David Wilson
        status: 'on_hold',
        start_date: '2024-02-15',
        end_date: '2024-05-15',
        budget: 12000.00,
        hourly_rate: 120.00,
        estimated_hours: 100,
        actual_hours: 25,
        progress: 25,
        notes: 'On hold pending client budget approval'
      }
    ];

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert(projects)
      .select();

    if (projectError) {
      console.log('❌ Error inserting projects:', projectError.message);
      return;
    }
    console.log('✅ Inserted', projectData.length, 'projects');

    // Step 3: Insert Invoices
    console.log('\n🧾 Inserting invoices...');
    const invoices = [
      {
        invoice_number: 'INV-2024-001',
        client_id: clientData[0].id,
        project_id: projectData[0].id,
        amount: 5000.00,
        tax_rate: 8.00,
        tax_amount: 400.00,
        total_amount: 5400.00,
        status: 'paid',
        issue_date: '2024-01-15',
        due_date: '2024-02-14',
        paid_date: '2024-02-10',
        notes: 'First milestone payment',
        terms: 'Net 30 days. Late payments subject to 1.5% monthly service charge.'
      },
      {
        invoice_number: 'INV-2024-002',
        client_id: clientData[1].id,
        project_id: projectData[1].id,
        amount: 15000.00,
        tax_rate: 8.00,
        tax_amount: 1200.00,
        total_amount: 16200.00,
        status: 'sent',
        issue_date: '2024-02-01',
        due_date: '2024-03-03',
        notes: 'Initial development phase',
        terms: 'Net 30 days. Late payments subject to 1.5% monthly service charge.'
      },
      {
        invoice_number: 'INV-2024-003',
        client_id: clientData[2].id,
        project_id: projectData[2].id,
        amount: 7500.00,
        tax_rate: 8.00,
        tax_amount: 600.00,
        total_amount: 8100.00,
        status: 'overdue',
        issue_date: '2024-01-01',
        due_date: '2024-01-31',
        notes: 'Final payment for brand identity',
        terms: 'Net 30 days. Late payments subject to 1.5% monthly service charge.'
      },
      {
        invoice_number: 'INV-2024-004',
        client_id: clientData[3].id,
        project_id: projectData[3].id,
        amount: 8750.00,
        tax_rate: 8.00,
        tax_amount: 700.00,
        total_amount: 9450.00,
        status: 'sent',
        issue_date: '2024-02-15',
        due_date: '2024-03-17',
        notes: 'E-commerce platform development',
        terms: 'Net 30 days. Late payments subject to 1.5% monthly service charge.'
      },
      {
        invoice_number: 'INV-2024-005',
        client_id: clientData[4].id,
        project_id: projectData[4].id,
        amount: 3000.00,
        tax_rate: 8.00,
        tax_amount: 240.00,
        total_amount: 3240.00,
        status: 'draft',
        issue_date: '2024-02-20',
        due_date: '2024-03-22',
        notes: 'Marketing automation setup',
        terms: 'Net 30 days. Late payments subject to 1.5% monthly service charge.'
      }
    ];

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoices)
      .select();

    if (invoiceError) {
      console.log('❌ Error inserting invoices:', invoiceError.message);
      return;
    }
    console.log('✅ Inserted', invoiceData.length, 'invoices');

    // Step 4: Insert Invoice Items
    console.log('\n📄 Inserting invoice items...');
    const invoiceItems = [
      // Items for INV-2024-001
      {
        invoice_id: invoiceData[0].id,
        description: 'UI/UX Design - Homepage and key pages',
        quantity: 1.00,
        rate: 2500.00,
        amount: 2500.00
      },
      {
        invoice_id: invoiceData[0].id,
        description: 'Frontend Development - Responsive layout',
        quantity: 1.00,
        rate: 2500.00,
        amount: 2500.00
      },
      // Items for INV-2024-002
      {
        invoice_id: invoiceData[1].id,
        description: 'Mobile App Architecture & Planning',
        quantity: 40.00,
        rate: 150.00,
        amount: 6000.00
      },
      {
        invoice_id: invoiceData[1].id,
        description: 'Backend API Development',
        quantity: 60.00,
        rate: 150.00,
        amount: 9000.00
      },
      // Items for INV-2024-003
      {
        invoice_id: invoiceData[2].id,
        description: 'Logo Design & Brand Identity',
        quantity: 1.00,
        rate: 3500.00,
        amount: 3500.00
      },
      {
        invoice_id: invoiceData[2].id,
        description: 'Brand Guidelines & Style Guide',
        quantity: 1.00,
        rate: 2000.00,
        amount: 2000.00
      },
      {
        invoice_id: invoiceData[2].id,
        description: 'Marketing Materials Design',
        quantity: 1.00,
        rate: 2000.00,
        amount: 2000.00
      },
      // Items for INV-2024-004
      {
        invoice_id: invoiceData[3].id,
        description: 'E-commerce Platform Setup',
        quantity: 1.00,
        rate: 4000.00,
        amount: 4000.00
      },
      {
        invoice_id: invoiceData[3].id,
        description: 'Product Catalog Development',
        quantity: 1.00,
        rate: 2750.00,
        amount: 2750.00
      },
      {
        invoice_id: invoiceData[3].id,
        description: 'Shopping Cart Integration',
        quantity: 1.00,
        rate: 2000.00,
        amount: 2000.00
      },
      // Items for INV-2024-005
      {
        invoice_id: invoiceData[4].id,
        description: 'Marketing Automation Consultation',
        quantity: 20.00,
        rate: 120.00,
        amount: 2400.00
      },
      {
        invoice_id: invoiceData[4].id,
        description: 'Initial System Setup',
        quantity: 5.00,
        rate: 120.00,
        amount: 600.00
      }
    ];

    const { data: itemData, error: itemError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)
      .select();

    if (itemError) {
      console.log('❌ Error inserting invoice items:', itemError.message);
      return;
    }
    console.log('✅ Inserted', itemData.length, 'invoice items');

    console.log('\n🎉 Database seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   • ${clientData.length} clients`);
    console.log(`   • ${projectData.length} projects`);
    console.log(`   • ${invoiceData.length} invoices`);
    console.log(`   • ${itemData.length} invoice items`);
    console.log('\n🔗 Your app now has real data from Supabase!');
    console.log('🌐 Visit http://localhost:3000 to see it in action');

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
    console.log('🔍 Full error:', error);
  }
}

seedData(); 