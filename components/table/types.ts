export interface GenericEntity {
  id: string
  created_at: string
  updated_at?: string
  [key: string]: any
}

export interface TableFeatures {
  infiniteScroll?: boolean
  batchOperations?: boolean
  columnReordering?: boolean
  columnResizing?: boolean
  exportData?: boolean
  statusTracking?: boolean
  contextMenu?: boolean
  footerAggregations?: boolean
  summaryCards?: boolean
  search?: boolean
  filters?: boolean
  pagination?: boolean
}

export interface EntityActions<T extends GenericEntity> {
  onCreate?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onBatchDelete?: (items: T[]) => void
  onStatusChange?: (item: T, newStatus: string) => void
  onExport?: () => void
  customActions?: Record<string, (item: T) => void>
}

export interface DataHookReturn<T extends GenericEntity> {
  data: T[]
  totalCount: number
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error?: Error | null
  refetch: () => void
  
  // For infinite scroll
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  loadMore?: () => void
  
  // For mutations
  updateStatus?: (id: string, status: string) => void
  isUpdating?: boolean
  
  // For metrics
  metrics?: Record<string, any>
}

export interface ColumnConfig {
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  canResize?: boolean
  canReorder?: boolean
  canHide?: boolean
}

export interface GenericTableProps<T extends GenericEntity> {
  entityType: 'projects' | 'invoices' | 'clients'
  data: T[]
  columns: any[]
  totalCount: number
  metrics?: Record<string, any>
  features?: TableFeatures
  actions?: EntityActions<T>
  isLoading?: boolean
  isFetching?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  loadMore?: () => void
  updateStatus?: (id: string, status: string) => void
  refetch?: () => void
  forceRefresh?: () => void
  onResizeStart?: (columnId: string, startX: number, event: React.MouseEvent) => void
  preferencesLoading?: boolean
  preferencesLoaded?: boolean
} 