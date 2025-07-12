"use client"

import { ClientAvatar } from "@/components/ui/client-avatar"
import { useSettings } from "@/components/settings-provider"

export function RecentSales() {
  const { formatCurrency } = useSettings()

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <ClientAvatar 
          name="Olivia Martin" 
          avatarUrl={null}
          size="md"
        />
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Olivia Martin</p>
          <p className="text-sm text-muted-foreground">olivia.martin@email.com</p>
        </div>
        <div className="ml-auto font-medium">+{formatCurrency(1999.0)}</div>
      </div>
      <div className="flex items-center">
        <ClientAvatar 
          name="Jackson Lee" 
          avatarUrl={null}
          size="md"
        />
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Jackson Lee</p>
          <p className="text-sm text-muted-foreground">jackson.lee@email.com</p>
        </div>
        <div className="ml-auto font-medium">+{formatCurrency(39.0)}</div>
      </div>
      <div className="flex items-center">
        <ClientAvatar 
          name="Isabella Nguyen" 
          avatarUrl={null}
          size="md"
        />
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Isabella Nguyen</p>
          <p className="text-sm text-muted-foreground">isabella.nguyen@email.com</p>
        </div>
        <div className="ml-auto font-medium">+{formatCurrency(299.0)}</div>
      </div>
      <div className="flex items-center">
        <ClientAvatar 
          name="William Kim" 
          avatarUrl={null}
          size="md"
        />
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">William Kim</p>
          <p className="text-sm text-muted-foreground">will@email.com</p>
        </div>
        <div className="ml-auto font-medium">+{formatCurrency(99.0)}</div>
      </div>
      <div className="flex items-center">
        <ClientAvatar 
          name="Sofia Davis" 
          avatarUrl={null}
          size="md"
        />
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Sofia Davis</p>
          <p className="text-sm text-muted-foreground">sofia.davis@email.com</p>
        </div>
        <div className="ml-auto font-medium">+{formatCurrency(39.0)}</div>
      </div>
    </div>
  )
}
