import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toAppError, type AppError } from '@/lib/errors';

export type Resource<T> = {
  data: T | undefined;
  error: AppError | null;
  /** First load with no data yet. */
  loading: boolean;
  /** Pull-to-refresh in progress. */
  refreshing: boolean;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Loads data for a screen, keeps the last good data on refetch errors, and
 * silently refetches when the screen regains focus.
 */
export function useResource<T>(loader: () => Promise<T>, deps: readonly unknown[]): Resource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  const seq = useRef(0);
  const hasFocusedOnce = useRef(false);

  // State is only set from promise callbacks, so effects can start a fetch safely.
  const fetchLatest = useCallback((): Promise<void> => {
    const id = ++seq.current;
    const settle = () => {
      if (id !== seq.current) return false;
      setLoading(false);
      setRefreshing(false);
      return true;
    };
    return loaderRef.current().then(
      (next) => {
        if (!settle()) return;
        setData(next);
        setError(null);
      },
      (err: unknown) => {
        if (settle()) setError(toAppError(err));
      },
    );
  }, []);

  const run = useCallback(
    (mode: 'load' | 'refresh') => {
      if (mode === 'load') setLoading(true);
      else setRefreshing(true);
      return fetchLatest();
    },
    [fetchLatest],
  );

  // Keep the latest loader without re-running the load effect.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    void fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) void fetchLatest();
      hasFocusedOnce.current = true;
    }, [fetchLatest]),
  );

  const reload = useCallback(() => run('load'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  return { data, error, loading: loading && data === undefined, refreshing, reload, refresh };
}
