import { useState, useEffect } from 'react'

interface UseVirtualizedTableProps {
  rowCount: number
  rowHeight: number
  containerHeight: number
  buffer?: number
}

export function useVirtualizedTable({
  rowCount,
  rowHeight,
  containerHeight,
  buffer = 5
}: UseVirtualizedTableProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })

  useEffect(() => {
    const visibleStart = Math.floor(scrollTop / rowHeight)
    const visibleEnd = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight)
    )

    const startWithBuffer = Math.max(0, visibleStart - buffer)
    const endWithBuffer = Math.min(rowCount - 1, visibleEnd + buffer)

    setVisibleRange({ start: startWithBuffer, end: endWithBuffer })
  }, [scrollTop, rowHeight, containerHeight, rowCount, buffer])

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }

  const totalHeight = rowCount * rowHeight
  const offsetY = visibleRange.start * rowHeight

  return {
    visibleRange,
    handleScroll,
    totalHeight,
    offsetY,
    scrollTop
  }
}

interface UseTableFiltersProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    filter?: (value: unknown, filterValue: string) => boolean
  }>
}

export function useTableFilters<T>({ data, columns }: UseTableFiltersProps<T>) {
  const [filters, setFilters] = useState<Record<string, string>>({})

  const filteredData = data.filter(item => {
    return columns.every(column => {
      const filterValue = filters[String(column.key)]
      if (!filterValue) return true

      const cellValue = item[column.key]
      if (column.filter) {
        return column.filter(cellValue, filterValue)
      }

      // Default string-based filtering
      return String(cellValue).toLowerCase().includes(filterValue.toLowerCase())
    })
  })

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  return {
    filteredData,
    filters,
    updateFilter,
    clearFilters
  }
}
