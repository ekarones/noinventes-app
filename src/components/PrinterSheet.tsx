import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FONT_SIZE, SPACING } from '../theme/tokens';
import { usePrinter } from '../context/PrinterContext';
import BottomSheet, { SheetOption } from './BottomSheet';
import Button from './Button';
import type { PrinterDevice } from '../services/printer';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// Picks the Bluetooth thermal printer. It only ever lists devices already paired
// in Android settings — pairing itself (with its PIN prompt) belongs to the OS,
// and re-implementing discovery here would be a worse version of it.
export default function PrinterSheet({ visible, onClose }: Props) {
  const { supported, device, connected, connecting, devices, refreshDevices, connect, disconnect } =
    usePrinter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshDevices();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo leer la lista de dispositivos.');
    } finally {
      setLoading(false);
    }
  }, [refreshDevices]);

  useEffect(() => {
    if (visible && supported) load();
  }, [visible, supported, load]);

  async function handleConnect(target: PrinterDevice) {
    setError(null);
    try {
      await connect(target);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo conectar. ¿La impresora está encendida?');
    }
  }

  async function handleDisconnect() {
    await disconnect();
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Impresora Bluetooth" scrollable>
      {!supported ? (
        <Text style={styles.note}>
          Esta versión de la app no puede usar Bluetooth. Instala el build con soporte de impresora
          para conectarte.
        </Text>
      ) : (
        <>
          {device && (
            <>
              <Text style={styles.caption}>
                {connected ? 'Conectada' : 'Guardada (sin conexión)'}
              </Text>
              <SheetOption
                label={device.name}
                icon={connected ? 'print' : 'print-outline'}
                active
                onPress={handleDisconnect}
              />
              <Button
                label="Desconectar"
                variant="secondary"
                onPress={handleDisconnect}
                style={styles.action}
              />
            </>
          )}

          <Text style={styles.caption}>Dispositivos emparejados</Text>

          {loading || connecting ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <>
              {devices
                .filter((d) => d.address !== device?.address)
                .map((d) => (
                  <SheetOption
                    key={d.address}
                    label={d.name}
                    icon="print-outline"
                    active={false}
                    onPress={() => handleConnect(d)}
                  />
                ))}

              {devices.length === 0 && (
                <Text style={styles.note}>
                  No hay dispositivos emparejados. Empareja la impresora desde los ajustes de
                  Bluetooth de Android y vuelve aquí.
                </Text>
              )}
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.action}>
            <Button label="Actualizar lista" variant="secondary" onPress={load} />
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: FONT_SIZE.caption,
    color: colors.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  note: {
    fontSize: FONT_SIZE.bodySm,
    color: colors.textSecondary,
    paddingVertical: SPACING.md,
  },
  error: {
    fontSize: FONT_SIZE.bodySm,
    color: colors.error,
    marginTop: SPACING.md,
  },
  loader: { marginVertical: SPACING.lg },
  action: { marginTop: SPACING.md },
});
