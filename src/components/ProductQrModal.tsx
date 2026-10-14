import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as LegacyFS from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  // The code the QR encodes — the same one GET /lookup resolves, so scanning it
  // adds the product/variation to the cart.
  code: string;
  // Shown above the QR (e.g. the product name, or "name · variation").
  title: string;
};

type QrRef = { toDataURL: (cb: (data: string) => void) => void } | null;

// expo-media-library is a native module NOT bundled in Expo Go. Importing it at
// the top level crashes the whole app there on launch ("Cannot find native
// module ExpoMediaLibraryNext"), so we load it on demand — it works in a dev /
// preview build and degrades gracefully in Expo Go.
function loadMediaLibrary(): typeof import('expo-media-library') | null {
  try {
    return require('expo-media-library') as typeof import('expo-media-library');
  } catch {
    return null;
  }
}

// Shows a product's QR (generated from its code) with "save to gallery" and
// "share". The QR is rendered on-device — the API has no QR-image endpoint; the
// code is all that's needed (same value the label stickers carry).
export default function ProductQrModal({ visible, onClose, code, title }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const qrRef = useRef<QrRef>(null);
  const [busy, setBusy] = useState(false);

  // Render the QR to a temp PNG file and return its uri.
  function exportPng(): Promise<string> {
    return new Promise((resolve, reject) => {
      const ref = qrRef.current;
      if (!ref?.toDataURL) {
        reject(new Error('qr-not-ready'));
        return;
      }
      ref.toDataURL(async (base64: string) => {
        try {
          const safe = code.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'producto';
          const uri = `${LegacyFS.cacheDirectory}qr-${safe}.png`;
          await LegacyFS.writeAsStringAsync(uri, base64, { encoding: LegacyFS.EncodingType.Base64 });
          resolve(uri);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async function saveToGallery() {
    if (busy) return;
    const MediaLibrary = loadMediaLibrary();
    if (!MediaLibrary) {
      Alert.alert(
        'No disponible aquí',
        'Guardar en la galería no funciona en Expo Go. Instalá el APK para usarlo, o tocá "Compartir" para guardarlo desde ahí.'
      );
      return;
    }
    setBusy(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Habilitá el acceso a tus fotos para guardar el QR.');
        return;
      }
      const uri = await exportPng();
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast('QR guardado en la galería', 'checkmark-circle');
    } catch {
      Alert.alert('No se pudo guardar', 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartir no disponible', 'Tu dispositivo no permite compartir archivos.');
        return;
      }
      const uri = await exportPng();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title });
    } catch {
      // Sheet dismissed or export failed — nothing actionable to show.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Cerrar" />

        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={8} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.qrBox}>
            {!!code && (
              <QRCode
                value={code}
                size={214}
                backgroundColor="#ffffff"
                color="#16213a"
                quietZone={14}
                getRef={(c) => {
                  qrRef.current = c as unknown as QrRef;
                }}
              />
            )}
          </View>

          <Text style={styles.code}>{code}</Text>
          <Text style={styles.hint}>Escanealo desde la app para agregar el producto al carrito.</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
              onPress={saveToGallery}
              disabled={busy}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={18} color={colors.onChrome} />
              <Text style={styles.btnPrimaryText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost, busy && styles.btnDisabled]}
              onPress={share}
              disabled={busy}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={18} color={colors.primary} />
              <Text style={styles.btnGhostText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          {busy && (
            <View style={styles.busyRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.busyText}>Procesando…</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(22, 33, 58, 0.5)',
      padding: 28,
    },
    backdropTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
      gap: 10,
    },
    close: { position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 1 },
    title: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: colors.primary, textAlign: 'center', paddingHorizontal: 24 },
    qrBox: {
      backgroundColor: '#ffffff',
      borderRadius: 18,
      padding: 10,
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.separator,
    },
    code: { fontSize: 13, fontFamily: FONT_FAMILY.black, color: colors.primary, marginTop: 4 },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },
    actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 8 },
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, borderRadius: 15 },
    btnPrimary: { backgroundColor: colors.chromeFill },
    btnPrimaryText: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    btnGhost: { borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface },
    btnGhostText: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    btnDisabled: { opacity: 0.5 },
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    busyText: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary },
  });
