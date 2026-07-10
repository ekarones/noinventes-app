import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { updateProductStock, updateVariationStock } from '../api/admin/products';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminStockEdit'>;

export default function AdminStockEditScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { kind, id, title, subtitle, stock } = route.params;

  // Draft values keyed by branchId, as strings (so the field can be cleared).
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(stock.map((s) => [s.branchId, String(s.stock)]))
  );
  const [saving, setSaving] = useState(false);

  function setValue(branchId: number, text: string) {
    // Digits only (stock is a non-negative integer).
    const clean = text.replace(/[^0-9]/g, '');
    setValues((prev) => ({ ...prev, [branchId]: clean }));
  }

  // Only send branches whose value actually changed (merge = untouched stay put).
  function changedMap(): Record<number, number> {
    const out: Record<number, number> = {};
    for (const s of stock) {
      const raw = values[s.branchId];
      const next = raw === '' || raw == null ? 0 : parseInt(raw, 10);
      if (next !== s.stock) out[s.branchId] = next;
    }
    return out;
  }

  const changed = changedMap();
  const hasChanges = Object.keys(changed).length > 0;

  async function save() {
    if (saving || !hasChanges) return;
    setSaving(true);
    try {
      if (kind === 'product') {
        await updateProductStock(id, changed);
      } else {
        await updateVariationStock(id, changed);
      }
      showToast('Stock actualizado', 'checkmark-circle');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar stock</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.productName}>{title}</Text>
        {!!subtitle && <Text style={styles.productSub}>{subtitle}</Text>}

        {stock.length === 0 ? (
          <Text style={styles.muted}>Este producto no tiene sucursales configuradas.</Text>
        ) : (
          <View style={styles.box}>
            {stock.map((s, idx) => (
              <View key={s.branchId} style={[styles.row, idx > 0 && styles.rowBorder]}>
                <View style={styles.branchInfo}>
                  <Ionicons name="storefront-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.branchName} numberOfLines={1}>
                    {s.branchName}
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={values[s.branchId] ?? ''}
                  onChangeText={(t) => setValue(s.branchId, t)}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.hint}>
          Solo se actualizan las sucursales que cambies; las demás conservan su stock.
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={save}
          disabled={!hasChanges || saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.saveText}>
              {hasChanges ? 'Guardar cambios' : 'Sin cambios'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  productName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  productSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  muted: { fontSize: 14, color: colors.textSecondary, marginTop: 20 },
  box: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginTop: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  branchInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  branchName: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  input: {
    width: 84,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 14, lineHeight: 17 },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.6 },
  saveText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
