import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FilterChips, type ChipOption } from '@/components/ui/chips';
import { ListScreen } from '@/components/ui/list-screen';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { REPAIR_PAGE_SIZE, searchRepairs } from '@/features/repairs/api';
import { RepairRow } from '@/features/repairs/components/repair-row';
import { REPAIR_STATUSES, STATUS_LABEL, type RepairStatus } from '@/features/repairs/status';
import { useDebouncedValue, usePagedSearch } from '@/hooks/use-paged-search';

type Filter = RepairStatus | 'all';

const FILTERS: readonly ChipOption<Filter>[] = [
  { value: 'all', label: 'All' },
  ...REPAIR_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

const isStatus = (v: unknown): v is RepairStatus => typeof v === 'string' && (REPAIR_STATUSES as readonly string[]).includes(v);

export default function RepairsScreen() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [filter, setFilter] = useState<Filter>(isStatus(params.status) ? params.status : 'all');
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);

  // Dashboard stage taps arrive as a status param; adopt it when it changes.
  const [seenParam, setSeenParam] = useState(params.status);
  if (params.status !== seenParam) {
    setSeenParam(params.status);
    if (isStatus(params.status)) setFilter(params.status);
  }

  const list = usePagedSearch(
    (offset, limit) => searchRepairs({ query: debounced, status: filter === 'all' ? null : filter, offset, limit }),
    `${filter}|${debounced}`,
    REPAIR_PAGE_SIZE,
  );

  const changeFilter = (next: Filter) => {
    setFilter(next);
    router.setParams({ status: next === 'all' ? undefined : next });
  };

  const filtered = debounced !== '' || filter !== 'all';

  return (
    <ListScreen
      header={
        <>
          <AppText variant="display" accessibilityRole="header">
            Repairs
          </AppText>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Repair number, customer, device"
            accessibilityLabel="Search repairs"
          />
          <FilterChips options={FILTERS} value={filter} onChange={changeFilter} accessibilityLabel="Filter by status" />
        </>
      }
      items={list.items}
      keyOf={(r) => r.id ?? r.transaction_number ?? ''}
      renderItem={({ item }) => <RepairRow repair={item} />}
      loading={list.loading}
      loadingMore={list.loadingMore}
      refreshing={list.refreshing}
      error={list.error}
      hasMore={list.hasMore}
      onRetry={list.retry}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      empty={
        filtered ? (
          <EmptyState
            icon="search-outline"
            title="No matching repairs"
            message={
              debounced
                ? `Nothing matches “${debounced}”${filter !== 'all' ? ` in ${STATUS_LABEL[filter]}` : ''}.`
                : `No ${STATUS_LABEL[filter as RepairStatus].toLowerCase()} repairs right now.`
            }
            actionLabel="Clear filters"
            onAction={() => {
              setQuery('');
              changeFilter('all');
            }}
          />
        ) : (
          <EmptyState
            icon="construct-outline"
            title="No repairs yet"
            message="Every device you take in shows up here with its status and balance."
            actionLabel="Start a repair"
            onAction={() => router.push('/repairs/new')}
          />
        )
      }
    />
  );
}
