import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/ui/chips';
import { Card, Screen } from '@/components/ui/layout';
import { SearchField } from '@/components/ui/search-field';
import { AppText } from '@/components/ui/text';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/states';
import { listArchived, type ArchiveKind } from '@/features/archives/api';
import { ArchiveAction } from '@/features/archives/components/archive-action';
import { useResource } from '@/hooks/use-resource';
import { useDebouncedValue } from '@/hooks/use-paged-search';

export default function ArchivesScreen() {
  const [kind, setKind] = useState<ArchiveKind>('repair');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const term = useDebouncedValue(query.trim(), 250);
  return <Screen>
    <FilterChips options={[{ value: 'repair', label: 'Archived Repairs' }, { value: 'customer', label: 'Customers' }]} value={kind}
      onChange={(v) => { setKind(v); setQuery(''); setPage(0); }} accessibilityLabel="Archived record type" />
    <SearchField value={query} onChangeText={(v) => { setQuery(v); setPage(0); }}
      placeholder={kind === 'repair' ? 'Number, customer, or device' : 'Name or contact number'} accessibilityLabel="Search archived records" />
    <ArchivedResults key={kind + '/' + term + '/' + page} kind={kind} term={term} page={page} setPage={setPage} />
    <AppText variant="caption" tone="secondary">Records are archived, never deleted. Financial and repair history remain available in reports.</AppText>
  </Screen>;
}

function ArchivedResults({ kind, term, page, setPage }: { kind: ArchiveKind; term: string; page: number; setPage: (page: number) => void }) {
  const result = useResource(() => listArchived(kind, term, page * 25), [kind, term, page]);
  return <>    {result.loading ? <ListSkeleton rows={3} /> : result.error ? <ErrorState error={result.error} onRetry={result.reload} /> : !result.data?.length ?
      <EmptyState icon="archive-outline" title="No archived records" message={term ? 'Try another search.' : 'Records you archive will appear here.'} /> :
      result.data.map((r) => <Card key={r.id} style={{ gap: 8 }}>
        <AppText variant="bodyStrong">{r.title}</AppText><AppText variant="caption" tone="secondary">{r.detail}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="View details" variant="tonal" compact onPress={() => router.push(kind === 'repair' ? { pathname: '/repairs/[id]', params: { id: r.id } } : { pathname: '/customers/[id]', params: { id: r.id } })} />
          <ArchiveAction kind={kind} id={r.id} archived onDone={result.reload} />
        </View>
      </Card>)}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Button label="Previous" variant="outline" compact disabled={page === 0} onPress={() => setPage(page - 1)} />
      <Button label="Next" variant="outline" compact disabled={result.loading || (result.data?.length ?? 0) < 25} onPress={() => setPage(page + 1)} />
    </View>
</>;
}
