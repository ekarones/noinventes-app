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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createPaymentLink } from '../api/admin/paymentLinks';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PushedHeader from '../components/PushedHeader';
import Segmented from '../components/Segmented';
import { useToast } from '../context/ToastContext';
import type { PaymentLinkMethod } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminPaymentLinkForm'>;

type ExpirationOption = '24' | '72' | '168';
const EXPIRATION_OPTIONS: { id: ExpirationOption; label: string }[] = [
  { id: '24', label: '24 horas' },
  { id: '72', label: '3 días' },
  { id: '168', label: '7 días' },
];

const METHODS: { value: PaymentLinkMethod; label: string; icon: string }[] = [
  { value: 'tarjeta', label: 'Tarjeta', icon: 'card-outline' },
  { value: 'yape', label: 'Yape', icon: 'phone-portrait-outline' },
];

export default function AdminPaymentLinkFormScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [methods, setMethods] = useState<PaymentLinkMethod[]>(['tarjeta', 'yape']);
  const [expiration, setExpiration] = useState<ExpirationOption>('24');
  const [saving, setSaving] = useState(false);

  const amountValue = parseFloat(amount);
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;
  const canSubmit = amountValid && title.trim().length > 0 && methods.length > 0 && !saving;

  function toggleMethod(m: PaymentLinkMethod) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const paymentLink = await createPaymentLink({
        amount: amountValue,
        title: title.trim(),
        description: description.trim() || null,
        methods,
        expirationHours: Number(expiration),
      });
      showToast('Link de pago generado', 'checkmark-circle');
      navigation.replace('AdminPaymentLinkStatus', { paymentLink });
    } catch (e: any) {
      // 422: monto debajo del mínimo de Culqi, título vacío, etc. — mensaje del
      // servidor ya es accionable.
      Alert.alert('No se pudo generar el link', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PushedHeader title="Nuevo cobro" titleSize={22} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monto a cobrar</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>S/</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.hint}>El cliente paga este monto exacto en la página de Culqi.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalle</Text>
          <View>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Cobro mostrador"
              placeholderTextColor={colors.textSecondary}
              maxLength={50}
            />
          </View>
          <View>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalle del cobro"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Métodos de pago</Text>
          <View style={styles.methodsRow}>
            {METHODS.map((m) => {
              const active = methods.includes(m.value);
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.methodChip, active && styles.methodChipActive]}
                  onPress={() => toggleMethod(m.value)}
                  activeOpacity={ROW_PRESS_OPACITY}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.methodText, active && styles.methodTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {methods.length === 0 && <Text style={styles.errorHint}>Elige al menos un método.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vigencia</Text>
          <Segmented options={EXPIRATION_OPTIONS} value={expiration} onChange={setExpiration} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaOff]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
            {saving ? 'Generando…' : 'Generar link'}
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
    cardTitle: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.textSecondary,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 58,
      paddingHorizontal: 16,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 16,
    },
    amountPrefix: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: colors.textSecondary },
    amountInput: { flex: 1, fontSize: 26, fontFamily: FONT_FAMILY.black, color: colors.primary },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, lineHeight: 16 },
    label: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 15,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
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
    methodsRow: { flexDirection: 'row', gap: 8 },
    methodChip: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    methodChipActive: { backgroundColor: colors.chromeFill, borderColor: colors.chromeFill },
    methodText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.textSecondary },
    methodTextActive: { color: colors.onChrome },
    errorHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.error },

    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
    },
    cta: {
      height: 58,
      borderRadius: 18,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaOff: { backgroundColor: colors.fill },
    ctaText: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    ctaTextOff: { color: colors.textSecondary },
  });
