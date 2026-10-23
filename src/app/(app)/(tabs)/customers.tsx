import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ListScreen } from '@/components/ui/list-screen';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { PAGE_SIZE, searchCustomers } from '@/features/customers/api';
import { CustomerRow } from '@/features/customers/components/customer-row';
import { useDebouncedValue, usePagedSearch } from '@/hooks/use-paged-search';

export default function CustomersScreen() {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);
  const list = usePagedSearch((offset, limit) => searchCustomers(debounced, offset, limit), debounced, PAGE_SIZE);

  return (
    <ListScreen
      header={
        <>
          <View style={styles.titleRow}>
            <AppText variant="display" accessibilityRole="header" style={styles.flex}>
              Customers
            </AppText>
            <Button label="Add" icon="person-add-outline" variant="tonal" compact onPress={() => router.push('/customers/new')} accessibilityLabel="Add customer" />
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Name or contact number" accessibilityLabel="Search customers" />
        </>
      }
      items={list.items}
      keyOf={(c) => c.id}
      renderItem={({ item }) => (
        <CustomerRow customer={item} onPress={() => router.push({ pathname: '/customers/[id]', params: { id: item.id } })} />
      )}
      loading={list.loading}
      loadingMore={list.loadingMore}
      refreshing={list.refreshing}
      error={list.error}
      hasMore={list.hasMore}
      onRetry={list.retry}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      empty={
        debounced ? (
          <EmptyState
            icon="search-outline"
            title="No matching customers"
            message={`Nobody matches “${debounced}”. Check the spelling or add them as a new customer.`}
            actionLabel="Add customer"
            onAction={() => router.push('/customers/new')}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No customers yet"
            message="Customers you add keep their devices and full repair history together."
            actionLabel="Add customer"
            onAction={() => router.push('/customers/new')}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
