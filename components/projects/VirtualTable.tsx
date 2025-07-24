"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

interface VirtualTableProps {
  items: any[]
  columns: any[]
  rowHeight?: number
  overscan?: number
  onRenderRow: (item: any, index: number, style: React.CSSProperties) => React.ReactNode
  containerRef: React.RefObject<HTMLDivElement>
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export function VirtualTable({
  items,
  columns,
  rowHeight = 44,
  overscan = 5,
  onRenderRow,
  containerRef,
  isLoading,
  hasMore,
  onLoadMore
}: VirtualTableProps) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalHeight = virtualizer.getTotalSize()

  // Detect when we're near the bottom
  React.useEffect(() => {
    if (!containerRef.current || !hasMore || isLoading) return

    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return

      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      // Load more when we're 200px from the bottom
      if (scrollHeight - scrollTop - clientHeight < 200) {
        onLoadMore?.()
      }
    }

    const container = containerRef.current
    container.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, hasMore, isLoading, onLoadMore])

  return (
    <div
      style={{
        height: totalHeight,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index]
        return onRenderRow(
          item,
          virtualRow.index,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }
        )
      })}
    </div>
  )
} 