import {useCallback, useRef, useState} from 'react';
import Toast from 'react-native-toast-message';
import {apiErrorMessage} from '../helper/helperFunction';

/** The slice of a Laravel paginator the paged lists read. */
export interface PageResult<T> {
  data: T[] | null;
  last_page?: number;
  total?: number;
}

/** A focus refresh re-fetches what is on screen, up to this many pages. */
const MAX_REFRESH_PAGES = 5;

const dedupe = <T extends {id: number}>(rows: T[]): T[] => {
  const seen = new Set<number>();
  return rows.filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};

/**
 * "Load more" paging over a Laravel paginator.
 *
 * `queryKey` names the current filters. A reload under the same key (a screen
 * coming back into focus) re-fetches every page already shown so the list
 * doesn't jump back to the top; a new key starts again from page 1. Responses
 * that land after a newer request are dropped, so fast filter taps can't
 * paint stale rows.
 */
export function usePagedList<T extends {id: number}>(
  fetchPage: ((page: number) => Promise<PageResult<T>>) | null,
  queryKey: string,
  errorMessage: string,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [pages, setPages] = useState(0);
  /** Nothing loaded yet — the screen shows its full loader. */
  const [loading, setLoading] = useState(true);
  /** A filter change is in flight over rows already on screen. */
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0);
  const loadedRef = useRef({key: '', pages: 0});

  const reload = useCallback(
    async (mode: 'focus' | 'refresh' = 'focus') => {
      if (!fetchPage) {
        setLoading(false);
        return;
      }

      const request = ++requestRef.current;
      const sameQuery = loadedRef.current.key === queryKey;
      const count =
        mode === 'focus' && sameQuery
          ? Math.min(Math.max(1, loadedRef.current.pages), MAX_REFRESH_PAGES)
          : 1;

      if (mode === 'refresh') setRefreshing(true);
      else if (!sameQuery) setFetching(true);

      try {
        const results = await Promise.all(
          Array.from({length: count}, (_, index) => fetchPage(index + 1)),
        );
        if (request !== requestRef.current) return;

        const last = results[results.length - 1];
        const merged = dedupe(results.flatMap(result => result.data ?? []));
        setRows(merged);
        setTotal(last?.total ?? merged.length);
        setLastPage(last?.last_page ?? 1);
        setPages(count);
        setError(null);
        loadedRef.current = {key: queryKey, pages: count};
      } catch (err) {
        if (request !== requestRef.current) return;
        const message = apiErrorMessage(err, errorMessage);
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setFetching(false);
          setRefreshing(false);
        }
      }
    },
    [errorMessage, fetchPage, queryKey],
  );

  const loadMore = useCallback(async () => {
    if (!fetchPage || loadingMore) return;
    if (loadedRef.current.key !== queryKey) return;

    const request = requestRef.current;
    const next = loadedRef.current.pages + 1;
    setLoadingMore(true);

    try {
      const result = await fetchPage(next);
      // A reload started meanwhile owns the list now.
      if (
        request !== requestRef.current ||
        loadedRef.current.key !== queryKey
      ) {
        return;
      }
      setRows(prev => dedupe([...prev, ...(result.data ?? [])]));
      setTotal(prev => result.total ?? prev);
      setLastPage(result.last_page ?? next);
      setPages(next);
      loadedRef.current = {key: queryKey, pages: next};
    } catch (err) {
      Toast.show({type: 'error', text1: apiErrorMessage(err, errorMessage)});
    } finally {
      setLoadingMore(false);
    }
  }, [errorMessage, fetchPage, loadingMore, queryKey]);

  return {
    rows,
    setRows,
    total,
    hasMore: pages > 0 && pages < lastPage,
    loading,
    fetching,
    refreshing,
    loadingMore,
    error,
    reload,
    loadMore,
  };
}

export default usePagedList;
