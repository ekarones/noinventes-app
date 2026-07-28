import { useCallback, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import type { PaginationMeta } from '../api/products';

export type PagedResult<T> = { items: T[]; meta: PaginationMeta };

/**
 * The state behind every numbered-pagination list in the app.
 *
 * A page **replaces** the list rather than growing it, so the caller only ever
 * holds one page. `fetchPage` must be memoised (`useCallback` over the filters):
 * its identity is what tells the screen the result set changed and it should go
 * back to page 1.
 *
 * This lived copy-pasted in nine screens; the copies had already drifted (only
 * two of them recovered from a page that vanished).
 */
export function usePagedList<T>(
  fetchPage: (page: number) => Promise<PagedResult<T>>,
  errorMessage: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<T>>(null);

  const loadPage = useCallback(
    async (target: number, isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        let result = await fetchPage(target);

        // The page can disappear between loads — its last row was restored,
        // deleted or cancelled, here or by someone else. Fall back to the new
        // last page instead of showing an empty list under a page number that
        // no longer exists.
        if (result.items.length === 0 && result.meta.total > 0 && target > result.meta.lastPage) {
          result = await fetchPage(result.meta.lastPage);
        }

        setItems(result.items);
        setMeta(result.meta);
        // The server decides the page it actually served, not the tap.
        setPage(result.meta.currentPage);
        // A new page starts at the top; keeping the offset lands you mid-list.
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      } catch (e: any) {
        setError(e?.message ?? errorMessage);
        setItems([]);
        setMeta(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchPage, errorMessage]
  );

  return { items, meta, page, loading, refreshing, error, listRef, loadPage };
}
