# Invoice Numbering System

## Overview

The invoice numbering system has been designed to support multi-tenant scenarios where each user maintains their own sequential invoice numbers. This ensures clean, sequential numbering for accounting purposes without conflicts between users.

## How It Works

### Per-User Sequences

- Each user has their own invoice number sequence
- Sequences restart at 001 for each calendar year
- Format: `PREFIX-YEAR-NUMBER` (e.g., `INV-2024-001`)

### Example Scenario

```
User A: INV-2024-001, INV-2024-002, INV-2024-003...
User B: INV-2024-001, INV-2024-002, INV-2024-003...
User C: INV-2024-001, INV-2024-002, INV-2024-003...
```

Each user sees their own clean sequence starting from 001.

## Database Implementation

### 1. Invoice Table Structure

The `invoices` table has a composite unique constraint on `(user_id, invoice_number)` instead of a global unique constraint on `invoice_number` alone.

```sql
-- Composite unique constraint
ALTER TABLE invoices ADD CONSTRAINT invoices_user_invoice_number_unique 
  UNIQUE (user_id, invoice_number);
```

### 2. Invoice Sequences Table

A dedicated table tracks the last used number for each user per year:

```sql
CREATE TABLE invoice_sequences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    year INTEGER,
    last_number INTEGER DEFAULT 0,
    UNIQUE(user_id, year)
);
```

### 3. Sequence Generation Function

The `get_next_invoice_number()` function generates the next number atomically:

```sql
SELECT get_next_invoice_number(auth.uid(), 'INV', 2024);
-- Returns: 'INV-2024-001' (or next available number)
```

## Benefits

1. **Clean Sequences**: Each user sees sequential numbers (001, 002, 003...)
2. **No Conflicts**: Users can create invoices simultaneously without errors
3. **Year-Based**: Sequences reset each year for cleaner accounting
4. **Customizable Prefix**: Each user can have their own prefix (set in settings)

## Migration Steps

If you're upgrading an existing system:

1. Run the migration script: `scripts/22-fix-invoice-numbering.sql`
2. This will:
   - Remove the global unique constraint
   - Add the per-user constraint
   - Create the sequences table
   - Install the generation function

## Usage in Application

The invoice generation page automatically uses this system:

```typescript
// Automatic generation when creating new invoice
const { data: invoiceNumber } = await supabase
  .rpc('get_next_invoice_number', {
    p_user_id: userId,
    p_prefix: settings.invoicePrefix || 'INV',
    p_year: new Date().getFullYear()
  })
```

## Fallback Mechanism

If the database function fails, the system falls back to timestamp-based generation to ensure invoice creation is never blocked:

```
INV-2024-123456 (where 123456 is from timestamp)
```

## Settings Integration

Users can customize their invoice prefix in Settings:
- Default: `INV`
- Examples: `ACME`, `CORP`, `2024`

The prefix is combined with the year and sequence number to create the full invoice number.

## Best Practices

1. **Don't Skip Numbers**: The system ensures no gaps in sequences
2. **Don't Reuse Numbers**: Even deleted invoices keep their numbers reserved
3. **Yearly Archives**: Consider archiving old invoices at year-end
4. **Prefix Convention**: Keep prefixes short (3-5 characters) for readability

## Troubleshooting

### Duplicate Invoice Number Error

If you see this error, it means:
1. The migration hasn't been run yet
2. There's a conflict with existing data

Solution: Run the migration script and ensure all users have unique invoice numbers.

### Missing Sequences

If invoice numbers aren't generating:
1. Check if the user is authenticated
2. Verify the database function exists
3. Check RLS policies on `invoice_sequences` table

## Future Enhancements

Potential improvements for consideration:
1. Monthly sequences (e.g., INV-2024-01-001 for January)
2. Department-based sequences
3. Custom number formats per user
4. Sequence reservation for draft invoices 