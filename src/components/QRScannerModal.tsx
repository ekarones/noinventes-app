import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  // Called with the raw text contained in the scanned QR code.
  onScanned: (data: string) => void;
};

export default function QRScannerModal({ visible, onClose, onScanned }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  // Prevents the camera from firing onBarcodeScanned dozens of times per second.
  const [scanned, setScanned] = useState(false);
  const lockRef = useRef(false);

  // Reset the scan lock every time the modal is (re)opened.
  useEffect(() => {
    if (visible) {
      setScanned(false);
      lockRef.current = false;
    }
  }, [visible]);

  function handleScanned(data: string) {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanned(true);
    onScanned(data.trim());
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Camera or permission prompt */}
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : ({ data }) => handleScanned(data)}
          />
        ) : (
          <View style={styles.permission}>
            <Ionicons name="camera-outline" size={64} color={colors.textOnPrimary} />
            <Text style={styles.permissionTitle}>Acceso a la cámara</Text>
            <Text style={styles.permissionText}>
              Necesitamos permiso para usar la cámara y escanear los códigos QR.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Text style={styles.permissionBtnText}>Permitir cámara</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan frame overlay */}
        {permission?.granted && (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>Apunta al código QR del producto</Text>
          </View>
        )}

        {/* Close button */}
        <TouchableOpacity
          style={[styles.close, { top: insets.top + SPACING.sm }]}
          onPress={onClose}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el escáner"
        >
          <Ionicons name="close" size={26} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: RADIUS.sheet,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  hint: {
    color: colors.textOnPrimary,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: SPACING['2xl'],
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  close: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING['3xl'], gap: SPACING.md },
  permissionTitle: { color: colors.textOnPrimary, fontSize: FONT_SIZE.titleSm, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm },
  permissionText: { color: '#d1d5db', fontSize: FONT_SIZE.body, textAlign: 'center', lineHeight: 22 },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING['3xl'],
    height: 50,
    borderRadius: RADIUS.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  permissionBtnText: { color: colors.textOnPrimary, fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold },
});
