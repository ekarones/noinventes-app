import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  createPurchaseOrder,
  fetchPurchaseOrderOptions,
  updatePurchaseOrder,
  type PurchaseOrderPayload,
} from '../api/admin/purchaseOrders';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { useToast } from '../context/ToastContext';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import PushedHeader from '../components/PushedHeader';
import type { PurchaseOrderOptions, PurchaseOrderPickable } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminPurchaseOrderForm'>;

// One editable line. Quantity/cost are strings so the fields can be cleared.
type ItemLine = {
  key: string;
  productId: number | null;
  productVariationId: number | null;
  label: string;
  quantity: string;
  unitCost: string;
};

const pickableKey = (p: { productId: number | null; productVariationId: number | null }) =>
  p.productVariationId != null ? `v${p.productVariationId}` : `p${p.productId}`;

export default function AdminPurchaseOrderFormScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const editing = route.params?.order;

  const [options, setOptions] = useState<PurchaseOrderOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [supplierId, setSupplierId] = useState<number | null>(editing?.supplier.id ?? null);
  const [branchId, setBranchId] = useState<number | null>(editing?.branch.id ?? null);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [items, setItems] = useState<ItemLine[]>(
    editing
      ? editing.items.map((it) => ({
          key: pickableKey(it),
          productId: it.productId,
          productVariationId: it.productVariationId,
          label: it.label,
          quantity: String(it.quantity),
          unitCost: it.unitCost.toFixed(2),
        }))
      : []
  );

  const [supplierSheet, setSupplierSheet] = useState(false);
  const [branchSheet, setBranchSheet] = useState(false);
  const [itemSheet, setItemSheet] = useState(false);
  const [itemFilter, setItemFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOptions = () => {
    setLoadingOptions(true);
    setOptionsError(null);
    fetchPurchaseOrderOptions()
      .then(setOptions)
      .catch((e) => setOptionsError(e?.message ?? 'No se pudieron cargar las opciones.'))
      .finally(() => setLoadingOptions(false));
  };
  useEffect(loadOptions, []);

  const supplierName =
    supplierId == null ? null : options?.suppliers.find((s) => s.id === supplierId)?.displayName ?? '—';
  const branchName =
    branchId == null ? null : options?.branches.find((b) => b.id === branchId)?.name ?? '—';

  const filteredPickables = useMemo(() => {
    const q = itemFilter.trim().toLowerCase();
    const list = options?.pickables ?? [];
    if (!q) return list;
    return list.filter((p) => p.label.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [options, itemFilter]);

  function addItem(p: PurchaseOrderPickable) {
    const key = pickableKey(p);
    if (items.some((it) => it.key === key)) {
      showToast('Ese producto ya está en la orden', 'alert-circle');
      return;
    }
    setItems((prev) => [
      ...prev,
      { key, productId: p.productId, productVariationId: p.productVariationId, label: p.label, quantity: '1', unitCost: '' },
    ]);
    setItemSheet(false);
    setItemFilter('');
  }

  function setLine(key: string, patch: Partial<ItemLine>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeLine(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function lineTotal(it: ItemLine): number {
    const q = parseInt(it.quantity, 10);
    const c = parseFloat(it.unitCost);
    if (!Number.isFinite(q) || !Number.isFinite(c)) return 0;
    return q * c;
  }
  const total = items.reduce((sum, it) => sum + lineTotal(it), 0);

  const itemsValid =
    items.length > 0 &&
    items.every((it) => {
      const q = parseInt(it.quantity, 10);
      const c = parseFloat(it.unitCost);
      return Number.isFinite(q) && q >= 1 && Number.isFinite(c) && c >= 0;
    });
  const canSubmit = supplierId != null && branchId != null && itemsValid && !saving;

  async function save() {
    if (!canSubmit || supplierId == null || branchId == null) return;
    setSaving(true);
    try {
      const payload: PurchaseOrderPayload = {
        supplierId,
        branchId,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          productId: it.productId,
          productVariationId: it.productVariationId,
          quantity: parseInt(it.quantity, 10),
          unitCost: parseFloat(it.unitCost),
        })),
      };
      if (editing) {
        await updatePurchaseOrder(editing.id, payload);
        showToast('Orden actualizada', 'checkmark-circle');
      } else {
        await createPurchaseOrder(payload);
        showToast('Borrador creado', 'checkmark-circle');
      }
      navigation.goBack();
    } catch (e: any) {
      // 422: cross-tenant supplier/branch, item con ambos IDs, quantity < 1…
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingOptions) {
    return (
      <View style={styles.container}>
        <PushedHeader title={editing ? 'Editar orden' : 'Nueva orden'} onBack={() => navigation.goBack()} titleSize={22} />
        <LoadingState />
      </View>
    );
  }
  if (optionsError || !options) {
    return (
      <View style={styles.container}>
        <PushedHeader title={editing ? 'Editar orden' : 'Nueva orden'} onBack={() => navigation.goBack()} titleSize={22} />
        <EmptyState
          icon="cloud-offline-outline"
          message={optionsError ?? 'No se pudieron cargar las opciones.'}
          action={{ label: 'Reintentar', onPress: loadOptions }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PushedHeader
        title={editing ? `Editar ${editing.code}` : 'Nueva orden'}
        subtitle={editing ? undefined : 'Compra a un proveedor'}
        onBack={() => navigation.goBack()}
        titleSize={22}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Proveedor + sucursal */}
        <View style={styles.card}>
          <View>
            <Text style={styles.label}>Proveedor</Text>
            <TouchableOpacity style={styles.select} onPress={() => setSupplierSheet(true)} activeOpacity={ROW_PRESS_OPACITY}>
              <Text style={[styles.selectText, !supplierName && styles.selectPlaceholder]} numberOfLines={1}>
                {supplierName ?? 'Elegir proveedor'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="rgba(22, 33, 58, 0.45)" />
            </TouchableOpacity>
          </View>
          <View>
            <Text style={styles.label}>Sucursal (destino del stock)</Text>
            <TouchableOpacity style={styles.select} onPress={() => setBranchSheet(true)} activeOpacity={ROW_PRESS_OPACITY}>
              <Text style={[styles.selectText, !branchName && styles.selectPlaceholder]} numberOfLines={1}>
                {branchName ?? 'Elegir sucursal'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="rgba(22, 33, 58, 0.45)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ítems */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.cardTitle}>Productos</Text>
            <TouchableOpacity style={styles.addItemBtn} onPress={() => setItemSheet(true)} activeOpacity={ROW_PRESS_OPACITY}>
              <Text style={styles.addItemPlus}>+</Text>
              <Text style={styles.addItemText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <Text style={styles.emptyItems}>Aún no agregaste productos. Toca “Agregar”.</Text>
          ) : (
            items.map((it) => (
              <View key={it.key} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemLabel} numberOfLines={2}>
                    {it.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeLine(it.key)}
                    style={styles.itemRemove}
                    activeOpacity={ROW_PRESS_OPACITY}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar producto"
                  >
                    <Ionicons name="close" size={14} color="rgba(22, 33, 58, 0.6)" />
                  </TouchableOpacity>
                </View>
                <View style={styles.itemControls}>
                  <View style={styles.qtyField}>
                    <Text style={styles.miniLabel}>Cantidad</Text>
                    <TextInput
                      style={styles.qtyInput}
                      value={it.quantity}
                      onChangeText={(t) => setLine(it.key, { quantity: t.replace(/[^0-9]/g, '') })}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(22, 33, 58, 0.35)"
                    />
                  </View>
                  <View style={styles.costField}>
                    <Text style={styles.miniLabel}>Costo unit.</Text>
                    <View style={styles.costInputWrap}>
                      <Text style={styles.costPrefix}>S/</Text>
                      <TextInput
                        style={styles.costInput}
                        value={it.unitCost}
                        onChangeText={(t) => setLine(it.key, { unitCost: t.replace(/[^0-9.]/g, '') })}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="rgba(22, 33, 58, 0.35)"
                      />
                    </View>
                  </View>
                  <View style={styles.lineTotalField}>
                    <Text style={styles.miniLabel}>Subtotal</Text>
                    <Text style={styles.lineTotal}>{formatPrice(lineTotal(it))}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {items.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          )}
        </View>

        {/* Notas */}
        <View style={styles.card}>
          <Text style={styles.label}>Notas (opcional)</Text>
          <TextInput
            style={styles.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Referencia interna, condiciones de pago…"
            placeholderTextColor="rgba(22, 33, 58, 0.35)"
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaOff]}
          onPress={save}
          disabled={!canSubmit}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear borrador'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Supplier picker */}
      <BottomSheet visible={supplierSheet} onClose={() => setSupplierSheet(false)} title="Proveedor" scrollable>
        {options.suppliers.length === 0 ? (
          <Text style={styles.sheetEmpty}>No hay proveedores activos. Crea uno primero.</Text>
        ) : (
          options.suppliers.map((s) => (
            <SheetOption
              key={s.id}
              label={s.displayName}
              hint={`RUC ${s.ruc}`}
              active={supplierId === s.id}
              onPress={() => {
                setSupplierId(s.id);
                setSupplierSheet(false);
              }}
            />
          ))
        )}
      </BottomSheet>

      {/* Branch picker */}
      <BottomSheet visible={branchSheet} onClose={() => setBranchSheet(false)} title="Sucursal" scrollable>
        {options.branches.length === 0 ? (
          <Text style={styles.sheetEmpty}>No hay sucursales activas.</Text>
        ) : (
          options.branches.map((b) => (
            <SheetOption
              key={b.id}
              label={b.name}
              active={branchId === b.id}
              onPress={() => {
                setBranchId(b.id);
                setBranchSheet(false);
              }}
            />
          ))
        )}
      </BottomSheet>

      {/* Item picker (with filter) */}
      <BottomSheet visible={itemSheet} onClose={() => setItemSheet(false)} title="Agregar producto" keyboardAware>
        <TextInput
          style={styles.pickFilter}
          value={itemFilter}
          onChangeText={setItemFilter}
          placeholder="Buscar por nombre o código…"
          placeholderTextColor="rgba(22, 33, 58, 0.4)"
          autoCorrect={false}
        />
        <ScrollView style={styles.pickList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {filteredPickables.length === 0 ? (
            <Text style={styles.sheetEmpty}>Sin coincidencias.</Text>
          ) : (
            filteredPickables.map((p) => {
              const already = items.some((it) => it.key === pickableKey(p));
              return (
                <TouchableOpacity
                  key={pickableKey(p)}
                  style={styles.pickRow}
                  onPress={() => addItem(p)}
                  disabled={already}
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Text style={[styles.pickLabel, already && styles.pickLabelUsed]} numberOfLines={1}>
                    {p.label}
                  </Text>
                  {already ? (
                    <Ionicons name="checkmark-circle" size={18} color="#2e7d4f" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 12, paddingBottom: 24 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 13,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardTitle: { fontSize: 11.5, fontFamily: FONT_FAMILY.black, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(22, 33, 58, 0.45)' },
    label: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      marginBottom: 6,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    select: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      backgroundColor: colors.surface,
    },
    selectText: { flex: 1, fontSize: 15, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    selectPlaceholder: { color: 'rgba(22, 33, 58, 0.45)' },

    addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primary },
    addItemPlus: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: '#fff', lineHeight: 19 },
    addItemText: { fontSize: 13, fontFamily: FONT_FAMILY.black, color: '#fff' },
    emptyItems: { fontSize: 13, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.45)', paddingVertical: 4 },

    itemCard: { borderWidth: 1.5, borderColor: colors.controlBorder, borderRadius: 15, padding: 12, gap: 11 },
    itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    itemLabel: { flex: 1, fontSize: 14, fontFamily: FONT_FAMILY.black, color: colors.primary, lineHeight: 19 },
    itemRemove: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
    itemControls: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    miniLabel: { fontSize: 10, fontFamily: FONT_FAMILY.black, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(22, 33, 58, 0.4)', marginBottom: 5 },
    qtyField: { width: 66 },
    qtyInput: { height: 44, borderWidth: 1.5, borderColor: colors.controlBorder, borderRadius: 12, textAlign: 'center', fontSize: 16, fontFamily: FONT_FAMILY.black, color: colors.primary },
    costField: { flex: 1 },
    costInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 11, borderWidth: 1.5, borderColor: colors.controlBorder, borderRadius: 12 },
    costPrefix: { fontSize: 13, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.45)' },
    costInput: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary, padding: 0 },
    lineTotalField: { alignItems: 'flex-end', minWidth: 74 },
    lineTotal: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary, height: 44, textAlignVertical: 'center', lineHeight: 44 },

    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF0F4', paddingTop: 13 },
    totalLabel: { fontSize: 13, fontFamily: FONT_FAMILY.black, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(22, 33, 58, 0.5)' },
    totalValue: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.4 },

    textarea: {
      minHeight: 70,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 14.5,
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
      lineHeight: 20,
    },

    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: '#E9EBF0',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
    },
    cta: { height: 58, borderRadius: 18, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    ctaOff: { backgroundColor: '#EDEFF3' },
    ctaText: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    ctaTextOff: { color: 'rgba(22, 33, 58, 0.35)' },

    // Item picker sheet
    sheetEmpty: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', paddingVertical: 12, textAlign: 'center' },
    pickFilter: {
      height: 48,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 14,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
      marginBottom: 8,
    },
    pickList: { maxHeight: 320 },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    pickLabel: { flex: 1, fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    pickLabelUsed: { color: 'rgba(22, 33, 58, 0.4)' },
  });
