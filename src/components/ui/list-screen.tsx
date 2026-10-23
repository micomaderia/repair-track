import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import type { AppError } from '@/lib/errors';

import { TAB_BAR_SPACE } from './layout';
import { ErrorState, ListSkeleton } from './states';
import { AppText } from './text';

type Props<T> = {
  header: ReactNode;
  items: T[];
  keyOf: (item: T) => string;
  renderItem: ListRenderItem<T>;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: AppError | null;
  hasMore: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  onEndReached: () => void;
  empty: ReactElement;
};

/** Paginated tab list with loading, empty, error, and load-more states. */
export function ListScreen<T>({
  header,
  items,
  keyOf,
  renderItem,
  loading,
  loadingMore,
  refreshing,
  error,
  hasMore,
  onRetry,
  onRefresh,
  onEndReached,
  empty,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const showError = error && items.length === 0;

  return (
    <FlatList
      style={styles.flex}
      data={showError || loading ? [] : items}
      keyExtractor={keyOf}
      renderItem={(info) => <View style={styles.constrain}>{renderItem(info)}</View>}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={<View style={styles.header}>{header}</View>}
      ListHeaderComponentStyle={styles.constrain}
      ListEmptyComponent={
        <View style={styles.constrain}>
          {loading ? <ListSkeleton /> : showError ? <ErrorState error={error} onRetry={onRetry} /> : empty}
        </View>
      }
      ListFooterComponent={
        <View style={[styles.constrain, styles.footer]}>
          {loadingMore ? <ActivityIndicator color={Colors.primary} accessibilityLabel="Loading more" /> : null}
          {error && items.length > 0 ? (
            <AppText variant="caption" tone="danger" onPress={onRetry} accessibilityRole="button">
              {error.message} Tap to retry.
            </AppText>
          ) : null}
          {!hasMore && items.length > 0 && !error ? (
            <AppText variant="caption" tone="tertiary">
              {items.length === 1 ? '1 result' : `All ${items.length} results shown`}
            </AppText>
          ) : null}
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
    />
  );
}

function Separator() {
  return <View style={{ height: Spacing.md }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg },
  constrain: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { gap: Spacing.md, marginBottom: Spacing.lg },
  footer: { alignItems: 'center', paddingVertical: Spacing.lg, minHeight: 48 },
});
