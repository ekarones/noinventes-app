import { useCallback, useEffect, useState } from 'react';
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
import { createPaymentIntent, fetchPaymentIntentConfig } from '../api/admin/paymentIntents';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import PushedHeader from '../components/PushedHeader';
import Segmented from '../components/Segmented';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { PaymentIntentConfig, PaymentIntentMethod } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminPaymentForm'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ExpirationOption = '24' | '72' | '168';
const EXPIRATION_OPTIONS: { id: ExpirationOption; label: string }[] = [
  { id: '24', label: '24 horas' },
  { id: '72', label: '3 días' },
  { id: '168', label: '7 días' },
];

// The method the customer will use on the payment page. "both" leaves the page's
// card/Yape selector as-is; the others preopen straight into that one.
type MethodOption = 'both' | PaymentIntentMethod;
const METHOD_OPTIONS: { id: MethodOption; label: string }[] = [
  { id: 'both', label: 'Ambos' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'yape', label: 'Yape' },
];

export default function AdminPaymentFormScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const { tenant } = useAuth();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Plan gate (defense-in-depth): the entry point is hidden when the plan lacks
  // Culqi, but a live downgrade could land someone here.
  const hasCulqi = tenant?.features?.culqi === true;

  const [config, setConfig] = useState<PaymentIntentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [expiration, setExpiration] = useState<ExpirationOption>('24');
  const [method, setMethod] = useState<MethodOption>('both');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchPaymentIntentConfig()
      .then(setConfig)
      .catch((e: any) => setLoadError(e?.message ?? 'No se pudo cargar la configuración de cobros.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (hasCulqi) load();
    else setLoading(false);
  }, [hasCulqi, load]);

  const amountValue = parseFloat(amount);
  const minAmount = (config?.minAmountCents ?? 0) / 100;
  const amountValid = Number.isFinite(amountValue) && amountValue >= minAmount;
  // Email is optional; if typed, it must be valid (the customer can also enter it
  // on the payment page).
  const emailValid = email.trim().length === 0 || EMAIL_RE.test(email.trim());
  const canSubmit = !!config?.configured && amountValid && emailValid && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const intent = await createPaymentIntent({
        amount: amountValue,
        email: email.trim() || null,
        description: description.trim() || null,
        method: method === 'both' ? null : method,
        expiresHours: Number(expiration),
      });
      showToast('Cobro generado', 'checkmark-circle');
      navigation.replace('AdminPaymentIntent', { intent });
    } catch (e: any) {
      // 422: monto debajo del mínimo, email inválido — mensaje ya accionable.
      Alert.alert('No se pudo generar el cobro', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  if (!hasCulqi) {
    return (
      <View style={styles.container}>
        <PushedHeader title="Nuevo cobro" titleSize={22} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title="Función del plan Pro"
          message="Los cobros con tarjeta (Culqi) no están incluidos en tu plan actual. Pedile al administrador de la plataforma que active el plan Pro."
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PushedHeader title="Nuevo cobro" titleSize={22} onBack={() => navigation.goBack()} />
        <LoadingState />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <PushedHeader title="Nuevo cobro" titleSize={22} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="cloud-offline-outline"
          message={loadError}
          action={{ label: 'Reintentar', onPress: load }}
        />
      </View>
    );
  }

  if (!config?.configured) {
    return (
      <View style={styles.container}>
        <PushedHeader title="Nuevo cobro" titleSize={22} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="card-outline"
          title="Culqi no configurado"
          message="Esta tienda aún no tiene cuenta de Culqi. Pídele al administrador de la plataforma que cargue las credenciales."
        />
      </View>
    );
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
          <Text style={styles.hint}>Mínimo {formatPrice(minAmount)}. El cliente paga este monto en la página de Culqi.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalle</Text>
          <View>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Cobro mostrador"
              placeholderTextColor={colors.textSecondary}
              maxLength={80}
            />
          </View>
          <View>
            <Text style={styles.label}>Email del cliente (opcional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="cliente@correo.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldHint}>Si lo dejas vacío, el cliente lo ingresa al pagar.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Método del cliente</Text>
          <Segmented options={METHOD_OPTIONS} value={method} onChange={setMethod} />
          <Text style={styles.hint}>
            "Ambos" deja que el cliente elija en la página. Preselecciona uno si ya sabes cómo va a pagar.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vigencia del link</Text>
          <Segmented options={EXPIRATION_OPTIONS} value={expiration} onChange={setExpiration} />
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.note}>
            El cliente paga en la página segura de Culqi desde su propio teléfono. La app nunca ve los datos de la tarjeta.
          </Text>
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
            {saving ? 'Generando…' : amountValid ? `Generar cobro ${formatPrice(amountValue)}` : 'Generar cobro'}
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
    fieldHint: { fontSize: 11, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, marginTop: 6 },
    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, marginTop: 2 },
    note: { flex: 1, fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, lineHeight: 16 },

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
