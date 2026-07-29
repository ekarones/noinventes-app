import type { ReactElement } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { usePagedList } from '../hooks/usePagedList';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import Pagination from './Pagination';

type Props<T> = {
  /** The state from `usePagedList` — the screen keeps the hook so it can drive
   *  loads on focus / filter change and read `meta`. */
  list: ReturnType<typeof usePagedList<T>>;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  /** A grid (e.g. the catalogue) passes 2 + its row style; a list passes neither. */
  numColumns?: number;
  columnWrapperStyle?: StyleProp<ViewStyle>;
  /** Padding/gap for the rows — the one thing that differs per screen. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Rendered when the fetch succeeded but returned nothing. */
  empty: ReactElement;
};

// The load / refresh / paginate shell every numbered list shares: a full-screen
// spinner on the very first load, a full-screen error with retry, otherwise the
// FlatList with pull-to-refresh and a Pagination footer. This lived copy-pasted
// verbatim in all four list screens (catalogue, admin products, orders, admin
// sales); only renderItem, the column count, the padding and the empty state
// ever differed.
export default function PagedList<T>({
  list,
  renderItem,
  keyExtractor,
  numColumns,
  columnWrapperStyle,
  contentContainerStyle,
  empty,
}: Props<T>) {
  const { items, meta, page, loading, refreshing, error, listRef, loadPage } = list;

  // Only the very first load takes over the screen. Once there's a list,
  // changing page keeps it on screen and just disables the controls.
  if (loading && items.length === 0) return <LoadingState />;
  if (error) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        message={error}
        action={{ label: 'Reintentar', onPress: () => loadPage(1) }}
      />
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={numColumns}
      columnWrapperStyle={columnWrapperStyle}
      // flexGrow when empty so the empty state fills the page instead of hugging
      // the top.
      contentContainerStyle={items.length ? contentContainerStyle : styles.empty}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadPage(page, true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListFooterComponent={
        <Pagination page={page} lastPage={meta?.lastPage ?? 1} onChange={loadPage} loading={loading} />
      }
      ListEmptyComponent={empty}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flexGrow: 1 },
});
