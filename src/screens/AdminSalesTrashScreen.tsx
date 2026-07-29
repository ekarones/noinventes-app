import { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminSalesTrash } from '../api/admin/sales';
import { usePagedList } from '../hooks/usePagedList';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ScreenHeader from '../components/ScreenHeader';
import { formatDate, formatPrice } from '../utils/format';
import type { AdminSaleSummary } from '../types';
import type { AdminSalesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminSalesStackParamList, 'AdminSalesTrash'>;

const PER_PAGE = 20;

export default function AdminSalesTrashScreen({ navigation }: Props) {
  const fetchPage = useCallback(
    (page: number) => fetchAdminSalesTrash({ page, perPage: PER_PAGE }),
    []
  );
  const {
    items: sales,
    meta,
    page,
    loading,
    refreshing,
    error,
    listRef,
    loadPage,
  } = usePagedList<AdminSaleSummary>(fetchPage, 'No se pudo cargar la papelera.');

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  function renderItem({ item }: { item: AdminSaleSummary }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={ROW_PRESS_OPACITY}
        onPress={() => navigation.navigate('AdminSaleDetail', { sale: item, trashed: true })}
      >
        <View style={styles.iconBox}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.orderId}>Venta #{item.id}</Text>
          <Text style={styles.count} numberOfLines={1}>
            {item.customerName}
            {item.seller ? ` · ${item.seller.name}` : ''}
          </Text>
          {item.deletedAt && (
            <Text style={styles.deleted}>Anulada · {formatDate(item.deletedAt)}</Text>
          )}
        </View>
        <Text style={styles.total}>{formatPrice(item.total)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Papelera" onBack={() => navigation.goBack()} />

      {/* Only the very first load takes over the screen; changing page keeps the
          list visible and just disables the controls. */}
      {loading && sales.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadPage(1) }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={sales}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
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
          ListEmptyComponent={
            <EmptyState
              icon="trash-outline"
              title="Papelera vacía"
              message="Las ventas anuladas aparecerán aquí."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: SPACING.sm, paddingTop: SPACING.xs, gap: SPACING.sm, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: RADIUS.card, padding: SPACING.md, gap: SPACING.md },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.control,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: SPACING.hairline },
  orderId: { fontSize: FONT_SIZE.subheading, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  count: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.caption, color: colors.textSecondary },
  deleted: { fontSize: FONT_SIZE.micro, color: colors.error, fontFamily: FONT_FAMILY.medium },
  total: { fontSize: FONT_SIZE.heading, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
});
