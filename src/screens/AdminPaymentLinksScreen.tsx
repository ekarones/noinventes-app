import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchPaymentLinks } from '../api/admin/paymentLinks';
import { usePagedList } from '../hooks/usePagedList';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice, formatRelative } from '../utils/format';
import Chip, { ChipRow } from '../components/Chip';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import PushedHeader from '../components/PushedHeader';
import type { AdminPaymentLink, PaymentLinkStatus } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminPaymentLinks'>;

const PER_PAGE = 20;

const STATUS_FILTERS: { value: PaymentLinkStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'cancelled', label: 'Anulados' },
];

const STATUS_META: Record<PaymentLinkStatus, { label: string; fg: keyof Palette; bg: keyof Palette }> = {
  pending: { label: 'Pendiente', fg: 'warning', bg: 'warningSoft' },
  paid: { label: 'Pagado', fg: 'success', bg: 'successSoft' },
  expired: { label: 'Vencido', fg: 'textSecondary', bg: 'fill' },
  cancelled: { label: 'Anulado', fg: 'error', bg: 'errorSoft' },
};

export default function AdminPaymentLinksScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [status, setStatus] = useState<PaymentLinkStatus | 'all'>('all');

  const fetchPage = useCallback(
    (page: number) => fetchPaymentLinks({ status, page, perPage: PER_PAGE }),
    [status]
  );
  const { items, meta, page, loading, refreshing, error, listRef, loadPage } =
    usePagedList<AdminPaymentLink>(fetchPage, 'No se pudieron cargar los cobros.');

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  const subtitle = useMemo(() => (meta ? `${meta.total} cobros generados` : undefined), [meta]);

  function renderItem({ item }: { item: AdminPaymentLink }) {
    const meta = STATUS_META[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminPaymentLinkStatus', { paymentLink: item })}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
      >
        <View style={styles.iconBox}>
          <Ionicons name="qr-code-outline" size={19} color="#8A6400" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatRelative(item.createdAt)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatPrice(item.amount)}</Text>
          <View style={[styles.badge, { backgroundColor: colors[meta.bg] }]}>
            <Text style={[styles.badgeText, { color: colors[meta.fg] }]}>{meta.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Cobros"
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
        addAction={{ label: 'Nuevo', onPress: () => navigation.navigate('AdminPaymentLinkForm') }}
      />

      <View style={styles.filters}>
        <ChipRow bare>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </ChipRow>
      </View>

      {loading && items.length === 0 ? (
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
          data={items}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
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
          ListEmptyComponent={
            <EmptyState
              icon="qr-code-outline"
              title="Sin cobros"
              message="Genera un link de pago con el botón +."
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
    filters: {
      backgroundColor: colors.surface,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    list: { padding: 18, gap: 10, flexGrow: 1 },
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
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: '#FFF3CF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, minWidth: 0 },
    title: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    meta: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, marginTop: 3 },
    right: { alignItems: 'flex-end', gap: 5 },
    amount: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black },
  });
