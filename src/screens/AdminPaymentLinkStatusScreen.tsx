import { useEffect, useRef, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { cancelPaymentLink, fetchPaymentLink } from '../api/admin/paymentLinks';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, SPACING } from '../theme/tokens';
import { formatDate, formatPrice } from '../utils/format';
import { hapticAdd, hapticSuccess } from '../utils/haptics';
import Button from '../components/Button';
import PushedHeader from '../components/PushedHeader';
import { useToast } from '../context/ToastContext';
import type { AdminPaymentLink, PaymentLinkStatus } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminPaymentLinkStatus'>;

const POLL_MS = 4000;

const STATUS_INFO: Record<
  PaymentLinkStatus,
  { icon: keyof typeof Ionicons.glyphMap; text: string; fg: keyof Palette; bg: keyof Palette }
> = {
  pending: { icon: 'time-outline', text: 'Esperando el pago del cliente…', fg: 'warning', bg: 'warningSoft' },
  paid: { icon: 'checkmark-circle', text: 'Pago confirmado', fg: 'success', bg: 'successSoft' },
  expired: { icon: 'alert-circle-outline', text: 'Este link venció', fg: 'textSecondary', bg: 'fill' },
  cancelled: { icon: 'close-circle-outline', text: 'Este cobro fue anulado', fg: 'error', bg: 'errorSoft' },
};

// Shows the CulqiLink as a URL + QR while it's "pending" and polls its status
// every 4s — the app never talks to Culqi directly, so this is the only way it
// finds out the customer paid (the webhook is what actually confirms it
// server-side; this just refreshes what the server already knows).
export default function AdminPaymentLinkStatusScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [link, setLink] = useState<AdminPaymentLink>(route.params.paymentLink);
  const [cancelling, setCancelling] = useState(false);
  const notifiedPaid = useRef(false);

  useEffect(() => {
    if (link.status !== 'pending') return;
    const timer = setInterval(async () => {
      try {
        setLink(await fetchPaymentLink(link.id));
      } catch {
        // Transient network hiccup — the next tick retries; no need to surface it.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [link.id, link.status]);

  useEffect(() => {
    if (link.status === 'paid' && !notifiedPaid.current) {
      notifiedPaid.current = true;
      hapticSuccess();
    }
  }, [link.status]);

  async function copyUrl() {
    await Clipboard.setStringAsync(link.url);
    hapticAdd();
    showToast('Enlace copiado', 'copy-outline');
  }

  async function share() {
    try {
      await Share.share({ message: `${link.title} — ${formatPrice(link.amount)}\n${link.url}` });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Anular cobro',
      '¿Anular este link de pago? El cliente ya no podrá pagar con él.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Anular', style: 'destructive', onPress: doCancel },
      ]
    );
  }

  async function doCancel() {
    setCancelling(true);
    try {
      await cancelPaymentLink(link.id);
      setLink((prev) => ({ ...prev, status: 'cancelled' }));
      showToast('Cobro anulado', 'close-circle');
    } catch (e: any) {
      Alert.alert('No se pudo anular', e?.message ?? 'Puede que el cliente ya haya pagado.');
    } finally {
      setCancelling(false);
    }
  }

  const info = STATUS_INFO[link.status];

  return (
    <View style={styles.container}>
      <PushedHeader title={link.title} subtitle={formatPrice(link.amount)} onBack={() => navigation.goBack()} />

      <View style={styles.scroll}>
        <View style={[styles.banner, { backgroundColor: colors[info.bg] }]}>
          <Ionicons name={info.icon} size={18} color={colors[info.fg]} />
          <Text style={[styles.bannerText, { color: colors[info.fg] }]}>{info.text}</Text>
        </View>

        {link.status === 'pending' && (
          <>
            <View style={styles.qrCard}>
              <QRCode value={link.url} size={210} backgroundColor={colors.surface} color={colors.primary} />
            </View>

            <TouchableOpacity style={styles.urlRow} onPress={copyUrl} accessibilityRole="button">
              <Text style={styles.urlText} numberOfLines={1}>
                {link.url}
              </Text>
              <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <Button label="Compartir enlace" icon="share-outline" onPress={share} />
            <Button
              label={cancelling ? 'Anulando…' : 'Anular cobro'}
              variant="danger"
              onPress={confirmCancel}
              disabled={cancelling}
            />
          </>
        )}

        {link.status === 'paid' && (
          <View style={styles.paidCard}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            <Text style={styles.paidAmount}>{formatPrice(link.amount)}</Text>
            {!!link.chargeId && <Text style={styles.paidMeta}>Cargo {link.chargeId}</Text>}
            {!!link.paidAt && <Text style={styles.paidMeta}>{formatDate(link.paidAt)}</Text>}
            <Button
              label="Listo"
              onPress={() => navigation.navigate('AdminPaymentLinks')}
              style={styles.doneButton}
            />
          </View>
        )}

        {(link.status === 'expired' || link.status === 'cancelled') && (
          <Button
            label="Generar otro cobro"
            icon="add-circle-outline"
            onPress={() => navigation.replace('AdminPaymentLinkForm')}
          />
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
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 28,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
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
    paidCard: {
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
    paidAmount: { fontSize: 24, fontFamily: FONT_FAMILY.black, color: colors.primary, marginTop: 8 },
    paidMeta: { fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary },
    doneButton: { marginTop: 16, alignSelf: 'stretch' },
  });
