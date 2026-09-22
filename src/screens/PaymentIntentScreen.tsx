import { useEffect, useRef, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { cancelPaymentIntent, fetchPaymentIntent } from '../api/paymentIntents';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, SPACING } from '../theme/tokens';
import { formatDate, formatPrice } from '../utils/format';
import { hapticAdd, hapticSuccess } from '../utils/haptics';
import Button from '../components/Button';
import PushedHeader from '../components/PushedHeader';
import { useToast } from '../context/ToastContext';
import type { AdminPaymentIntent } from '../types';
import type { CartStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<CartStackParamList, 'PaymentIntent'>;

const POLL_MS = 4000;

const BANNER: Record<
  AdminPaymentIntent['status'],
  { icon: keyof typeof Ionicons.glyphMap; text: string; fg: keyof Palette; bg: keyof Palette }
> = {
  pending: { icon: 'time-outline', text: 'Esperando el pago del cliente…', fg: 'warning', bg: 'warningSoft' },
  captured: { icon: 'checkmark-circle', text: 'Pago confirmado', fg: 'success', bg: 'successSoft' },
  failed: { icon: 'close-circle-outline', text: 'La tarjeta fue rechazada', fg: 'error', bg: 'errorSoft' },
  cancelled: { icon: 'ban-outline', text: 'Este cobro fue anulado', fg: 'error', bg: 'errorSoft' },
  expired: { icon: 'alert-circle-outline', text: 'Este link venció', fg: 'textSecondary', bg: 'fill' },
};

// Seller POS variant of the intent status screen: QR + URL + share while pending,
// polling every 4s. The customer pays on the server-hosted page; the app never
// touches Culqi. The sale itself is registered separately on the Checkout screen.
export default function PaymentIntentScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [intent, setIntent] = useState<AdminPaymentIntent>(route.params.intent);
  const [cancelling, setCancelling] = useState(false);
  const notifiedPaid = useRef(false);

  useEffect(() => {
    if (intent.status !== 'pending') return;
    const timer = setInterval(async () => {
      try {
        setIntent(await fetchPaymentIntent(intent.id));
      } catch {
        // Transient network hiccup — the next tick retries.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [intent.id, intent.status]);

  useEffect(() => {
    if (intent.status === 'captured' && !notifiedPaid.current) {
      notifiedPaid.current = true;
      hapticSuccess();
    }
  }, [intent.status]);

  async function copyUrl() {
    await Clipboard.setStringAsync(intent.url);
    hapticAdd();
    showToast('Enlace copiado', 'copy-outline');
  }

  async function share() {
    try {
      const label = intent.description ? `${intent.description} — ` : '';
      await Share.share({ message: `${label}${formatPrice(intent.amount)}\nPaga aquí: ${intent.url}` });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  function confirmCancel() {
    Alert.alert('Anular cobro', '¿Anular este cobro? El cliente ya no podrá pagar con este link.', [
      { text: 'No', style: 'cancel' },
      { text: 'Anular', style: 'destructive', onPress: doCancel },
    ]);
  }

  async function doCancel() {
    setCancelling(true);
    try {
      await cancelPaymentIntent(intent.id);
      setIntent((prev) => ({ ...prev, status: 'cancelled' }));
      showToast('Cobro anulado', 'ban-outline');
    } catch (e: any) {
      Alert.alert('No se pudo anular', e?.message ?? 'Puede que el cliente ya haya pagado.');
    } finally {
      setCancelling(false);
    }
  }

  const banner = BANNER[intent.status];
  const isPending = intent.status === 'pending';

  return (
    <View style={styles.container}>
      <PushedHeader
        title={intent.description || 'Cobro con link'}
        subtitle={formatPrice(intent.amount)}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.scroll}>
        <View style={[styles.banner, { backgroundColor: colors[banner.bg] }]}>
          <Ionicons name={banner.icon} size={18} color={colors[banner.fg]} />
          <Text style={[styles.bannerText, { color: colors[banner.fg] }]}>{banner.text}</Text>
        </View>

        {isPending && (
          <>
            <View style={styles.qrCard}>
              <QRCode value={intent.url} size={210} backgroundColor={colors.surface} color={colors.primary} />
              <Text style={styles.qrHint}>El cliente escanea y paga desde su teléfono</Text>
            </View>

            <TouchableOpacity style={styles.urlRow} onPress={copyUrl} accessibilityRole="button">
              <Text style={styles.urlText} numberOfLines={1}>
                {intent.url}
              </Text>
              <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {!!intent.expiresAt && <Text style={styles.expires}>Vence el {formatDate(intent.expiresAt)}</Text>}

            <Button label="Compartir enlace" icon="share-outline" onPress={share} />
            <Button
              label={cancelling ? 'Anulando…' : 'Anular cobro'}
              variant="danger"
              onPress={confirmCancel}
              disabled={cancelling}
            />
          </>
        )}

        {intent.status === 'captured' && (
          <View style={styles.resultCard}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            <Text style={styles.resultAmount}>{formatPrice(intent.amount)}</Text>
            {!!intent.paidAt && <Text style={styles.resultMeta}>{formatDate(intent.paidAt)}</Text>}
            <Text style={styles.resultNote}>
              Registra la venta en el checkout para que quede en tu historial.
            </Text>
            <Button label="Volver al checkout" onPress={() => navigation.goBack()} style={styles.doneButton} />
          </View>
        )}

        {(intent.status === 'failed' || intent.status === 'cancelled' || intent.status === 'expired') && (
          <>
            {intent.status === 'failed' && !!intent.errorMessage && (
              <View style={[styles.reason, { backgroundColor: colors.errorSoft }]}>
                <Text style={[styles.reasonText, { color: colors.error }]}>{intent.errorMessage}</Text>
              </View>
            )}
            <Button label="Volver al checkout" icon="arrow-back-outline" onPress={() => navigation.goBack()} />
          </>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: SPACING.xl, gap: SPACING.lg },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    bannerText: { fontFamily: FONT_FAMILY.bold, fontSize: 14, flexShrink: 1 },
    qrCard: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 28,
      paddingHorizontal: 20,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    qrHint: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, textAlign: 'center' },
    urlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 16,
    },
    urlText: { flex: 1, fontFamily: FONT_FAMILY.medium, fontSize: 13, color: colors.primary },
    expires: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, textAlign: 'center' },
    resultCard: {
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 32,
      paddingHorizontal: 20,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    resultAmount: { fontSize: 24, fontFamily: FONT_FAMILY.black, color: colors.primary, marginTop: 8 },
    resultMeta: { fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary },
    resultNote: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 17,
    },
    doneButton: { marginTop: 16, alignSelf: 'stretch' },
    reason: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
    reasonText: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, lineHeight: 19, textAlign: 'center' },
  });
