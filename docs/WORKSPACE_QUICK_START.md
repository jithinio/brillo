# Workspace Implementation Quick Start Guide

## 🚀 Quick Implementation Steps

### Step 1: Database Migration
```bash
# Create and run the migration file
supabase migration new add_workspace_support
```

Copy the schema from the implementation plan to create:
- `workspaces` table
- `workspace_members` table  
- `workspace_invitations` table
- Add `workspace_id` to existing tables

### Step 2: Update Supabase Types
```bash
# Generate new types after migration
supabase gen types typescript --local > lib/database.types.ts
```

### Step 3: Create Workspace Context
```typescript
// lib/contexts/workspace-context.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'

interface WorkspaceContextType {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  userRole: 'admin' | 'manager' | 'viewer' | null
  isLoading: boolean
  switchWorkspace: (workspaceId: string) => Promise<void>
  createWorkspace: (name: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadWorkspaces()
    }
  }, [user])

  const loadWorkspaces = async () => {
    // Implementation here
  }

  const switchWorkspace = async (workspaceId: string) => {
    // Implementation here
  }

  return (
    <WorkspaceContext.Provider value={{
      currentWorkspace,
      workspaces,
      userRole,
      isLoading,
      switchWorkspace,
      createWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
```

### Step 4: Update App Layout
```typescript
// app/layout.tsx
import { WorkspaceProvider } from '@/lib/contexts/workspace-context'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Step 5: Create Workspace Switcher
```typescript
// components/workspace-switcher.tsx
import { useWorkspace } from '@/lib/contexts/workspace-context'

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {currentWorkspace?.name || 'Select Workspace'}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {workspaces.map(workspace => (
          <DropdownMenuItem 
            key={workspace.id}
            onClick={() => switchWorkspace(workspace.id)}
          >
            {workspace.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Create New Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 6: Update Data Hooks
Example for projects:
```typescript
// hooks/use-projects.ts
export function useProjects() {
  const { currentWorkspace } = useWorkspace()
  
  // Update query to filter by workspace
  const { data, error } = useQuery({
    queryKey: ['projects', currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace?.id)
      return data
    },
    enabled: !!currentWorkspace
  })
  
  return { projects: data, error }
}
```

### Step 7: Add Team Management Page
```typescript
// app/dashboard/settings/team/page.tsx
export default function TeamManagementPage() {
  const { currentWorkspace, userRole } = useWorkspace()
  
  if (userRole !== 'admin') {
    return <div>You don't have permission to manage team members</div>
  }
  
  return (
    <div>
      <h1>Team Management</h1>
      <TeamMembersList workspaceId={currentWorkspace?.id} />
      <InviteTeamMember workspaceId={currentWorkspace?.id} />
    </div>
  )
}
```

## 🔑 Key Files to Update

1. **Database Types**: `lib/database.types.ts`
2. **Auth Provider**: `components/auth-provider.tsx`
3. **App Sidebar**: `components/app-sidebar.tsx` (add workspace switcher)
4. **All Data Hooks**: Update to filter by workspace_id
5. **API Routes**: Add workspace validation

## 🧪 Testing Checklist

- [ ] User can create a workspace
- [ ] User can switch between workspaces
- [ ] Data is properly isolated between workspaces
- [ ] Team invitations work correctly
- [ ] Role permissions are enforced
- [ ] Existing single users migrated successfully
- [ ] Performance is acceptable with workspace filtering

## 🎯 Migration Script for Existing Users

```sql
-- Run this after creating workspace tables
SELECT migrate_users_to_workspaces();

-- Verify migration
SELECT 
  u.email,
  w.name as workspace_name,
  wm.role
FROM auth.users u
JOIN workspace_members wm ON wm.user_id = u.id
JOIN workspaces w ON w.id = wm.workspace_id;
```

## 📝 Environment Variables
No new environment variables needed! The existing Supabase configuration will work.

## 🚨 Common Pitfalls to Avoid

1. **Don't forget to update RLS policies** - All tables need workspace-aware policies
2. **Handle null workspace_id** - During migration, some records might be null
3. **Cache workspace data** - Avoid fetching workspace on every request
4. **Test role permissions thoroughly** - Especially delete operations
5. **Update all data creation** - Ensure new records get workspace_id

## 🎉 Success Indicators

- Zero errors during migration
- All existing features work with workspaces
- Team members can collaborate on same data
- Performance remains fast (< 100ms queries)
- Users understand the new workspace concept
