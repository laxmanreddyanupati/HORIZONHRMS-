import { useEffect, useMemo, useState } from 'react'

/**
 * Client-side pagination for already-fetched API collections.
 */
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )

  const setPageSize = (size: number) => {
    setPageSizeState(size)
    setPage(1)
  }

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    pageItems,
  }
}
