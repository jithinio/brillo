# Multi-Project Types System Guide

## Overview

The Multi-Project Types system extends Suitebase to support three distinct project types:

- **Fixed Projects**: One-time projects with a fixed budget (existing behavior)
- **Recurring Projects**: Projects with recurring billing cycles (weekly, monthly, quarterly, yearly)  
- **Hourly Projects**: Time-based projects with automatic total calculation from hourly rate × logged hours

## 🚀 Key Features

### ✅ Backwards Compatibility
- All existing projects continue to work without any changes
- Existing code and queries remain functional
- Gradual migration path without disruption

### 🔄 Auto-Calculation Engine  
- Recurring projects automatically calculate total budget based on frequency and duration
- Hourly projects automatically update total budget as hours are logged
- Real-time calculations with enterprise-level performance

### 📊 Enhanced Analytics
- Project type filtering and metrics
- Type-specific financial tracking
- Improved reporting capabilities

### 🎛️ Flexible Configuration
- Choose auto-calculation or manual override per project
- Type-specific fields and validation
- Currency support across all project types

## 📋 Database Schema Changes

### New Fields Added to `projects` Table

```sql
-- Project type system
project_type VARCHAR(20) DEFAULT 'fixed' CHECK (project_type IN ('fixed', 'recurring', 'hourly'))
total_budget DECIMAL(12,2)  -- Replaces budget in new system
auto_calculate_total BOOLEAN DEFAULT false

-- Recurring project fields
recurring_frequency VARCHAR(20) CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly'))
recurring_amount DECIMAL(12,2)
recurring_end_date DATE
last_recurring_calculation TIMESTAMP WITH TIME ZONE

-- Hourly project fields  
hourly_rate_new DECIMAL(10,2)  -- Separate from legacy hourly_rate
total_hours_logged DECIMAL(10,2) DEFAULT 0
```

### Migration Safety
- All new fields have safe defaults
- Existing `budget` field preserved for backwards compatibility
- All existing projects automatically assigned `project_type = 'fixed'`
- Zero data loss guaranteed

## 🎨 UI Components

### Enhanced AddProjectDialog
Located: `components/projects/EnhancedAddProjectDialog.tsx`

```tsx
import { EnhancedAddProjectDialog } from "@/components/projects/EnhancedAddProjectDialog"

// Usage
<EnhancedAddProjectDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onProjectUpdate={refreshProjects}
  defaultType="fixed" // or "recurring" or "hourly"
/>
```

**Features:**
- Tabbed interface for each project type
- Real-time budget calculations
- Type-specific form validation
- Auto-calculation previews

### Enhanced Project Columns
Located: `components/projects/enhanced-columns.tsx`

```tsx
import { enhancedProjectColumns } from "@/components/projects/enhanced-columns"

// For new implementations
const columns = enhancedProjectColumns

// For backwards compatibility
import { compatibleProjectColumns } from "@/components/projects/enhanced-columns"
const columns = compatibleProjectColumns
```

**Features:**
- Project type indicators with icons
- Budget display with calculation details
- Type-specific additional information
- Filtering by project type

## 🔧 API Integration

### Enhanced Project Hooks
Located: `hooks/use-enhanced-projects.ts`

```tsx
import { 
  useEnhancedProjects, 
  useCreateEnhancedProject,
  useUpdateEnhancedProject 
} from "@/hooks/use-enhanced-projects"

// Get projects with enhanced filtering
const { data, isLoading } = useEnhancedProjects({
  projectType: ['recurring', 'hourly'],
  status: ['active'],
  budgetRange: { min: 1000, max: 10000 }
})

// Create project
const createProject = useCreateEnhancedProject()
await createProject.mutateAsync({
  name: "My Recurring Project",
  project_type: "recurring",
  recurring_frequency: "monthly",
  recurring_amount: 2500,
  start_date: "2024-01-01",
  auto_calculate_total: true
})
```

### Backwards Compatibility
```tsx
import { useCompatibleProjects } from "@/hooks/use-enhanced-projects"

// Returns data in legacy format for existing components
const { data } = useCompatibleProjects(filters)
```

## 💼 Project Types Guide

### Fixed Projects
Traditional one-time projects with manually set budgets.

```tsx
const fixedProject = {
  project_type: 'fixed',
  total_budget: 5000,
  auto_calculate_total: false
}
```

**Use Cases:**
- One-time website builds
- Consulting projects
- Fixed-price contracts

### Recurring Projects  
Projects with repeating billing cycles.

```tsx
const recurringProject = {
  project_type: 'recurring',
  recurring_frequency: 'monthly', // weekly, monthly, quarterly, yearly
  recurring_amount: 2500,
  start_date: '2024-01-01',
  recurring_end_date: '2024-12-31', // optional
  auto_calculate_total: true
}
```

**Auto-Calculation:**
- Weekly: `recurring_amount × number_of_weeks`
- Monthly: `recurring_amount × number_of_months`  
- Quarterly: `recurring_amount × number_of_quarters`
- Yearly: `recurring_amount × number_of_years`

**Use Cases:**
- Monthly retainers
- Subscription services
- Ongoing support contracts

### Hourly Projects
Time-based projects with automatic budget calculation.

```tsx
const hourlyProject = {
  project_type: 'hourly',
  hourly_rate_new: 150,
  total_hours_logged: 40,
  auto_calculate_total: true
  // total_budget automatically calculated as 150 × 40 = 6000
}
```

**Auto-Calculation:**
- `total_budget = hourly_rate_new × total_hours_logged`
- Updates in real-time as hours are logged

**Use Cases:**
- Development projects
- Consulting work  
- Support services

## ⚡ Calculation Engine

### Automatic Calculations
Located: `lib/project-calculation-engine.ts`

```tsx
import { projectCalculationEngine } from "@/lib/project-calculation-engine"

// Queue project for background calculation
projectCalculationEngine.queueCalculation(projectId)

// Batch update multiple projects
await projectCalculationEngine.updateProjectTotalsBatch([id1, id2, id3])

// Manual calculation
const result = projectCalculationEngine.calculateRecurringTotal(
  1000, // amount
  'monthly', // frequency
  new Date('2024-01-01'), // start
  new Date('2024-12-31')  // end
)
```

### Performance Features
- **Caching**: Results cached for 5 minutes
- **Batch Processing**: Updates processed in optimized batches
- **Background Queue**: Non-blocking calculation updates
- **Database Triggers**: Automatic calculations on data changes

## 🔄 Migration Guide

### Phase 1: Database Migration
```bash
# Run the migration script
psql -f scripts/31-add-multi-project-types.sql

# Test the migration
node scripts/test-multi-project-migration.js
```

### Phase 2: Code Integration
```tsx
// Option 1: Gradual migration using compatibility layer
import { useCompatibleProjects } from "@/hooks/use-enhanced-projects"

// Option 2: Full migration to enhanced system
import { useEnhancedProjects } from "@/hooks/use-enhanced-projects"
```

### Phase 3: UI Updates
```tsx
// Replace existing AddProjectDialog
import { EnhancedAddProjectDialog } from "@/components/projects/EnhancedAddProjectDialog"

// Update project tables
import { enhancedProjectColumns } from "@/components/projects/enhanced-columns"
```

## 🧪 Testing

### Automated Testing
```bash
# Run migration tests
node scripts/test-multi-project-migration.js

# Test specific functionality
npm test -- --testNamePattern="multi-project"
```

### Manual Testing Checklist
- [ ] Create fixed project - verify manual budget setting
- [ ] Create recurring project - verify auto-calculation
- [ ] Create hourly project - verify hour-based calculation  
- [ ] Update existing project - verify backwards compatibility
- [ ] Test project filtering by type
- [ ] Verify legacy queries still work
- [ ] Test performance with large datasets

## 📈 Performance Optimizations

### Database Level
- Optimized indexes for project type queries
- Batch calculation functions
- Efficient foreign key relationships

### Application Level  
- React Query caching with optimized invalidation
- Background calculation processing
- Virtualized tables for large datasets
- Debounced calculation updates

### Monitoring
```tsx
// Check calculation engine performance
const stats = projectCalculationEngine.getCacheStats()
console.log(`Cache entries: ${stats.entries}, Memory: ${stats.memoryUsage}`)
```

## 🔒 Security & Validation

### Database Constraints
- Project type validation at database level
- Currency code validation
- Positive amount validation
- Date range validation

### Application Validation
```tsx
// Type-specific validation
const validation = projectCalculationEngine.validateProjectForCalculation(project)
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors)
}
```

## 🚨 Troubleshooting

### Common Issues

**Q: Existing projects showing wrong budget**
A: Run migration script to ensure `total_budget` is populated from legacy `budget` field.

**Q: Auto-calculation not working**
A: Check that `auto_calculate_total = true` and required fields are set for project type.

**Q: Performance issues with large datasets**
A: Ensure new indexes are created and consider using infinite query for pagination.

**Q: Backwards compatibility broken**  
A: Use `useCompatibleProjects` hook and `compatibleProjectColumns` for gradual migration.

### Debug Mode
```tsx
// Enable calculation debug logging
localStorage.setItem('debug_calculations', 'true')
```

## 🔗 Related Files

### Core Files
- `lib/types/enhanced-project.ts` - Type definitions
- `lib/project-calculation-engine.ts` - Calculation logic
- `lib/project-compatibility.ts` - Backwards compatibility
- `scripts/31-add-multi-project-types.sql` - Database migration

### UI Components  
- `components/projects/EnhancedAddProjectDialog.tsx` - Project creation
- `components/projects/enhanced-columns.tsx` - Table columns
- `hooks/use-enhanced-projects.ts` - Data fetching

### Testing
- `scripts/test-multi-project-migration.js` - Migration tests

## 📞 Support

For issues or questions about the multi-project types system:

1. Check this guide first
2. Run the automated tests
3. Review the troubleshooting section
4. Check the related files for implementation details

The system is designed for zero-downtime migration with full backwards compatibility. All existing functionality continues to work while new features are gradually adopted.