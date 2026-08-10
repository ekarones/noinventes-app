import { useState } from 'react';
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
import { updateProductStock, updateVariationStock } from '../api/admin/products';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PushedHeader from '../components/PushedHeader';
import { useToast } from '../context/ToastContext';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminStockEdit'>;

export default function AdminStockEditScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const styles = useThemedStyles(makeStyles);
  const { kind, id, title, subtitle, stock } = route.params;

  // Draft values keyed by branchId, as strings (so the field can be cleared).
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(stock.map((s) => [s.branchId, String(s.stock)]))
  );
  const [saving, setSaving] = useState(false);

  function setValue(branchId: number, text: string) {
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
  const changedCount = Object.keys(changed).length;
  const hasChanges = changedCount > 0;

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
      <PushedHeader
        title="Editar stock"
        subtitle={subtitle ? `${title} · ${subtitle}` : title}
        onBack={() => navigation.goBack()}
        titleSize={22}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {stock.length === 0 ? (
          <Text style={styles.muted}>Este producto no tiene sucursales configuradas.</Text>
        ) : (
          <View style={styles.card}>
            {stock.map((s, idx) => {
              const raw = values[s.branchId];
              const next = raw === '' || raw == null ? 0 : parseInt(raw, 10);
              const dirty = next !== s.stock;
              return (
                <View key={s.branchId} style={[styles.row, idx > 0 && styles.rowDivided]}>
                  <View style={styles.branchInfo}>
                    <Text style={styles.branchName} numberOfLines={1}>
                      {s.branchName}
                    </Text>
                    <Text style={[styles.branchHint, dirty && styles.branchHintDirty]}>
                      {dirty ? `Antes ${s.stock} uds. · se actualizará` : 'Sin cambios'}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, dirty && styles.inputDirty]}
                    value={values[s.branchId] ?? ''}
                    onChangeText={(t) => setValue(s.branchId, t)}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    placeholder="0"
                    placeholderTextColor="rgba(22, 33, 58, 0.35)"
                    selectTextOnFocus
                  />
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.noteBlock}>
          <Ionicons name="information-circle-outline" size={17} color="rgba(22, 33, 58, 0.5)" />
          <Text style={styles.noteText}>
            Solo se actualizan las sucursales que cambies; las demás conservan su stock.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !hasChanges && styles.ctaOff]}
          onPress={save}
          disabled={!hasChanges || saving}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, !hasChanges && styles.ctaTextOff]}>
            {saving
              ? 'Guardando…'
              : hasChanges
                ? `Guardar cambios (${changedCount})`
                : 'Sin cambios'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 12, paddingBottom: 24 },
    muted: { fontSize: 14, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, marginTop: 8 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    rowDivided: { borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    branchInfo: { flex: 1, minWidth: 0 },
    branchName: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    branchHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.extrabold, color: 'rgba(22, 33, 58, 0.4)', marginTop: 2 },
    branchHintDirty: { color: '#8A6400' },
    input: {
      width: 88,
      height: 48,
      paddingHorizontal: 12,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 14,
      backgroundColor: colors.surface,
      textAlign: 'center',
      fontSize: 17,
      fontFamily: FONT_FAMILY.black,
      color: colors.primary,
    },
    inputDirty: { borderColor: '#FFC20E' },
    noteBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      backgroundColor: '#F7F8FA',
      borderRadius: 16,
      padding: 12,
    },
    noteText: { flex: 1, fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.6)', lineHeight: 17 },
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
  });
