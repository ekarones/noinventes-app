import { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminSalesTrash } from '../api/admin/sales';
import { usePagedList } from '../hooks/usePagedList';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { formatDate, formatPrice } from '../utils/format';
import type { AdminSaleSummary } from '../types';
import type { AdminSalesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminSalesStackParamList, 'AdminSalesTrash'>;

const PER_PAGE = 20;

export default function AdminSalesTrashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
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
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </View>
        <View style={styles.info}>
          <Text style={styles.num}>Venta #{item.id}</Text>
          <Text style={styles.who} numberOfLines={1}>
            {item.customerName}
            {item.seller ? ` · ${item.seller.name}` : ''}
          </Text>
          {item.deletedAt && (
            <Text style={styles.voided}>Anulada {formatDate(item.deletedAt)}</Text>
          )}
        </View>
        <Text style={styles.total}>{formatPrice(item.total)}</Text>
        <Ionicons name="chevron-forward" size={16} color="rgba(22, 33, 58, 0.3)" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header (5a): navy panel + back + "Papelera" with the anulled count. */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerCircle} pointerEvents="none" />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color={colors.onChrome} />
          </TouchableOpacity>
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Papelera</Text>
            {meta && (
              <Text style={styles.headerSubtitle}>
                {meta.total} {meta.total === 1 ? 'venta anulada' : 'ventas anuladas'}
              </Text>
            )}
          </View>
        </View>
      </View>

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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ---- Header ----
    header: {
      paddingHorizontal: 18,
      paddingBottom: 16,
      backgroundColor: colors.chromeFill,
      overflow: 'hidden',
    },
    headerCircle: {
      position: 'absolute',
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.headerCircle,
      top: -152,
      right: -98,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.chromeButtonBg,
      borderWidth: 2,
      borderColor: colors.chromeButtonBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTexts: { flex: 1 },
    headerTitle: { fontSize: 24, letterSpacing: -0.6, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    headerSubtitle: { fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: colors.onChromeMuted, marginTop: 2 },

    // ---- List ----
    list: { padding: 18, paddingTop: 14, gap: 10, flexGrow: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.errorSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, minWidth: 0 },
    num: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.3 },
    who: { fontSize: 12.5, fontFamily: FONT_FAMILY.extrabold, color: 'rgba(22, 33, 58, 0.62)', marginTop: 3 },
    voided: { fontSize: 11.5, fontFamily: FONT_FAMILY.extrabold, color: colors.error, marginTop: 3 },
    total: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.black,
      color: 'rgba(22, 33, 58, 0.55)',
      letterSpacing: -0.3,
      textDecorationLine: 'line-through',
    },
  });
