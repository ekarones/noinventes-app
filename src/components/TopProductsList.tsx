import { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { usePagedList, type PagedResult } from '../hooks/usePagedList';
import type { DashboardTopProduct } from '../types';
import { colors } from '../theme/colors';
import { RADIUS, SPACING } from '../theme/tokens';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import Pagination from './Pagination';
import ScreenHeader from './ScreenHeader';
import TopProductRow, { topProductKey } from './TopProductRow';

type Props = {
  onBack: () => void;
  /** Fetches one page of the ranking (1-based). Must be memoised — its identity
   *  is what tells the list the period (or branch) changed. */
  fetchPage: (page: number) => Promise<PagedResult<DashboardTopProduct>>;
  /** Resolves the product behind a row and navigates; owned by the caller
   *  because seller and admin open different details. */
  onOpenProduct: (tp: DashboardTopProduct) => void;
  /** Key of the row being opened right now, so it can show its spinner. */
  openingKey: string | null;
};

// The full best-sellers ranking behind the dashboards' "Ver todas". Both roles
// rank the same way and open the same row, so the list lives here once; each
// screen only supplies its endpoint and what a tap should open.
export default function TopProductsList({ onBack, fetchPage, onOpenProduct, openingKey }: Props) {
  const { items, meta, page, loading, refreshing, error, listRef, loadPage } =
    usePagedList<DashboardTopProduct>(fetchPage, 'No se pudo cargar el ranking.');

  // The period (and the admin's branch) live in `fetchPage`'s identity, so a
  // change there reloads from page 1.
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  // How many rows the earlier pages already took, so the rank keeps counting.
  const rankOffset = meta ? (meta.currentPage - 1) * meta.perPage : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Más vendidos" onBack={onBack} />

      {/* Only the very first load takes over the screen. Once there's a list,
          changing page keeps it on screen and just disables the controls. */}
      {loading && items.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadPage(1) }}
        />
      ) : items.length === 0 ? (
        <EmptyState icon="trophy-outline" message="Aún no hay ventas en este período." />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={topProductKey}
          renderItem={({ item, index }) => (
            <TopProductRow
              // Position in the WHOLE ranking, not in the page: on page 2 this
              // has to read 21, 22… and not restart at 1.
              rank={rankOffset + index + 1}
              name={item.name}
              variationLabel={item.variationLabel}
              imageUri={item.imageThumbUrl}
              quantitySold={item.quantitySold}
              total={item.total}
              onPress={() => onOpenProduct(item)}
              loading={openingKey === topProductKey(item)}
              disabled={openingKey !== null}
              divided={index > 0}
            />
          )}
          // The rows read as one continuous card, like the dashboard block they
          // come from — the content container IS the card.
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            <Pagination
              page={page}
              lastPage={meta?.lastPage ?? 1}
              onChange={loadPage}
              loading={loading}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: {
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING['2xl'],
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
});
