import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toAppError, type AppError } from '@/lib/errors';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Server-side search with offset pagination. A new key (query/filter) resets
 * the list; stale responses are discarded.
 */
export function usePagedSearch<T>(
  fetchPage: (offset: number, limit: number) => Promise<T[]>,
  key: string,
  pageSize = 25,
) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const fetchRef = useRef(fetchPage);
  const seq = useRef(0);
  const itemsRef = useRef<T[]>([]);
  const hasFocusedOnce = useRef(false);

  // State is only set from promise callbacks, so effects can start a fetch safely.
  const fetchFirst = useCallback(
    (keepWindow: boolean): Promise<void> => {
      const id = ++seq.current;
      // Silent refresh keeps the already-loaded window size.
      const limit = keepWindow ? Math.max(pageSize, itemsRef.current.length) : pageSize;
      const settle = () => {
        if (id !== seq.current) return false;
        setLoading(false);
        setRefreshing(false);
        return true;
      };
      return fetchRef.current(0, limit).then(
        (page) => {
          if (!settle()) return;
          setItems(page);
          setHasMore(page.length === limit);
          setError(null);
        },
        (err: unknown) => {
          if (settle()) setError(toAppError(err));
        },
      );
    },
    [pageSize],
  );

  const loadFirst = useCallback(
    (mode: 'load' | 'refresh') => {
      if (mode === 'load') setLoading(true);
      else setRefreshing(true);
      return fetchFirst(false);
    },
    [fetchFirst],
  );

  useEffect(() => {
    fetchRef.current = fetchPage;
    itemsRef.current = items;
  });

  // A new query/filter replaces the list once its first page arrives.
  useEffect(() => {
    void fetchFirst(false);
  }, [key, fetchFirst]);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) void fetchFirst(true);
      hasFocusedOnce.current = true;
    }, [fetchFirst]),
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || error) return;
    const id = seq.current;
    setLoadingMore(true);
    try {
      const page = await fetchRef.current(itemsRef.current.length, pageSize);
      if (id !== seq.current) return;
      setItems((prev) => [...prev, ...page]);
      setHasMore(page.length === pageSize);
    } catch (err) {
      if (id === seq.current) setError(toAppError(err));
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, error, pageSize]);

  return {
    items,
    error,
    loading: loading && items.length === 0,
    loadingMore,
    refreshing,
    hasMore,
    loadMore,
    refresh: () => loadFirst('refresh'),
    retry: () => loadFirst('load'),
  };
}
