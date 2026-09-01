import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  cancelPurchaseOrder,
  deletePurchaseOrder,
  fetchPurchaseOrder,
  receivePurchaseOrder,
  sendPurchaseOrder,
} from '../api/admin/purchaseOrders';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice, formatDate } from '../utils/format';
import { poStatusMeta } from '../utils/purchaseOrder';
import { useToast } from '../context/ToastContext';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import PushedHeader from '../components/PushedHeader';
import type { AdminPurchaseOrderDetail } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminPurchaseOrderDetail'>;

export default function AdminPurchaseOrderDetailScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const seed = route.params.order;

  const [order, setOrder] = useState<AdminPurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await fetchPurchaseOrder(seed.id));
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar la orden.');
    } finally {
      setLoading(false);
    }
  }, [seed.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Runs a lifecycle action then refetches (or leaves, for delete).
  async function run(
    fn: () => Promise<void>,
    okMsg: string,
    { leave = false }: { leave?: boolean } = {}
  ) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, 'checkmark-circle');
      if (leave) navigation.goBack();
      else load();
    } catch (e: any) {
      Alert.alert('No se pudo completar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function confirmSend(o: AdminPurchaseOrderDetail) {
    Alert.alert(
      'Enviar al proveedor',
      `La orden ${o.code} pasará a "Enviada" y quedará congelada (no se podrá editar ni eliminar). ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar', onPress: () => run(() => sendPurchaseOrder(o.id), 'Orden enviada') },
      ]
    );
  }

  function confirmReceive(o: AdminPurchaseOrderDetail) {
    Alert.alert(
      'Marcar recibida',
      `Se sumará el stock de esta orden a "${o.branch.name}" y quedará registrado en Movimientos. Esta acción es irreversible. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Recibir', onPress: () => run(() => receivePurchaseOrder(o.id), 'Stock recibido') },
      ]
    );
  }

  function confirmCancel(o: AdminPurchaseOrderDetail) {
    Alert.alert('Cancelar orden', `¿Cancelar la orden ${o.code}? No afecta el stock.`, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar orden',
        style: 'destructive',
        onPress: () => run(() => cancelPurchaseOrder(o.id), 'Orden cancelada'),
      },
    ]);
  }

  function confirmDelete(o: AdminPurchaseOrderDetail) {
    Alert.alert('Eliminar borrador', `¿Eliminar la orden ${o.code}? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => run(() => deletePurchaseOrder(o.id), 'Orden eliminada', { leave: true }),
      },
    ]);
  }

  const st = poStatusMeta(order?.status ?? seed.status);

  return (
    <View style={styles.container}>
      <PushedHeader
        title={order?.code ?? seed.code}
        subtitle={(order ?? seed).supplier.displayName}
        onBack={() => navigation.goBack()}
        titleSize={22}
      />

      {loading && !order ? (
        <LoadingState />
      ) : error && !order ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: load }}
        />
      ) : order ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Status + parties */}
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
              </View>
              <Text style={styles.createdAt}>{formatDate(order.createdAt)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={16} color="rgba(22, 33, 58, 0.5)" />
              <View style={styles.infoTexts}>
                <Text style={styles.infoValue}>{order.supplier.displayName}</Text>
                <Text style={styles.infoSub}>
                  RUC {order.supplier.ruc}
                  {order.supplier.phone ? ` · ${order.supplier.phone}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="storefront-outline" size={16} color="rgba(22, 33, 58, 0.5)" />
              <Text style={styles.infoValue}>{order.branch.name}</Text>
            </View>
            {order.orderedAt && (
              <View style={styles.infoRow}>
                <Ionicons name="paper-plane-outline" size={16} color="rgba(22, 33, 58, 0.5)" />
                <Text style={styles.infoMuted}>Enviada {formatDate(order.orderedAt)}</Text>
              </View>
            )}
            {order.receivedAt && (
              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={16} color="#2e7d4f" />
                <Text style={styles.infoMuted}>Recibida {formatDate(order.receivedAt)}</Text>
              </View>
            )}
          </View>

          {/* Items */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Productos ({order.items.length})</Text>
            {order.items.map((it, idx) => (
              <View key={it.id} style={[styles.itemRow, idx > 0 && styles.itemDivided]}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel} numberOfLines={2}>
                    {it.label}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {it.quantity} × {formatPrice(it.unitCost)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>{formatPrice(it.subtotal)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
            </View>
          </View>

          {/* Notes */}
          {!!order.notes && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notas</Text>
              <Text style={styles.notes}>{order.notes}</Text>
            </View>
          )}

          {/* Actions (driven by can_*) */}
          {(order.can.receive ||
            order.can.send ||
            order.can.edit ||
            order.can.cancel ||
            order.can.delete) && (
            <View style={styles.actions}>
              {order.can.receive && (
                <TouchableOpacity
                  style={[styles.actionPrimary, busy && styles.actionBusy]}
                  onPress={() => confirmReceive(order)}
                  disabled={busy}
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Ionicons name="cube-outline" size={18} color="#16213A" />
                  <Text style={styles.actionPrimaryText}>Marcar recibida (suma stock)</Text>
                </TouchableOpacity>
              )}
              {order.can.send && (
                <TouchableOpacity
                  style={[styles.actionPrimary, busy && styles.actionBusy]}
                  onPress={() => confirmSend(order)}
                  disabled={busy}
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Ionicons name="paper-plane-outline" size={17} color="#16213A" />
                  <Text style={styles.actionPrimaryText}>Enviar al proveedor</Text>
                </TouchableOpacity>
              )}
              {order.can.edit && (
                <TouchableOpacity
                  style={styles.actionSecondary}
                  onPress={() => navigation.navigate('AdminPurchaseOrderForm', { order })}
                  disabled={busy}
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Ionicons name="create-outline" size={17} color={colors.primary} />
                  <Text style={styles.actionSecondaryText}>Editar</Text>
                </TouchableOpacity>
              )}
              {order.can.cancel && (
                <TouchableOpacity
                  style={styles.actionDanger}
                  onPress={() => confirmCancel(order)}
                  disabled={busy}
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Text style={styles.actionDangerText}>Cancelar orden</Text>
                </TouchableOpacity>
              )}
              {order.can.delete && (
                <TouchableOpacity
                  style={styles.actionDanger}
                  onPress={() => confirmDelete(order)}
                  disabled={busy}
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Text style={styles.actionDangerText}>Eliminar borrador</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 12, paddingBottom: 28 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11.5, fontFamily: FONT_FAMILY.black },
    createdAt: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.45)' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoTexts: { flex: 1, minWidth: 0 },
    infoValue: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary, flex: 1 },
    infoSub: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    infoMuted: { fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)' },

    itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 12 },
    itemDivided: { borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    itemInfo: { flex: 1, minWidth: 0 },
    itemLabel: { fontSize: 14, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, lineHeight: 19 },
    itemMeta: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 3 },
    itemSubtotal: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: colors.primary },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF0F4', paddingTop: 12 },
    totalLabel: { fontSize: 13, fontFamily: FONT_FAMILY.black, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(22, 33, 58, 0.5)' },
    totalValue: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.4 },
    notes: { fontSize: 14, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.7)', lineHeight: 20 },

    actions: { gap: 10 },
    actionPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 54, borderRadius: 17, backgroundColor: '#FFC20E' },
    actionBusy: { opacity: 0.6 },
    actionPrimaryText: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    actionSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 17, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface },
    actionSecondaryText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    actionDanger: { height: 52, borderRadius: 17, borderWidth: 1.5, borderColor: '#F3CFC6', backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center' },
    actionDangerText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.error },
  });
