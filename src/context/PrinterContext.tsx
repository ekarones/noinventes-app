import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  isPrinterSupported,
  listPairedPrinters,
  requestPrinterPermissions,
  writeToPrinter,
  type PayloadEncoding,
  type PrinterDevice,
} from '../services/printer';

const STORAGE_KEY = '@monatekeda/printer';

type PrinterContextValue = {
  /** False on iOS and in Expo Go — the UI hides the feature entirely. */
  supported: boolean;
  device: PrinterDevice | null;
  connected: boolean;
  connecting: boolean;
  /** Paired devices from Android settings; empty until `refreshDevices` runs. */
  devices: PrinterDevice[];
  refreshDevices: () => Promise<void>;
  connect: (device: PrinterDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  /**
   * Writes a payload the server composed — receipts and labels both. Throws
   * with a message to show. This context deliberately doesn't know what a
   * receipt looks like: it owns the connection, not the format.
   */
  printPayload: (payload: string, encoding?: PayloadEncoding) => Promise<void>;
};

const PrinterContext = createContext<PrinterContextValue | null>(null);

// Owns the Bluetooth printer session: which printer, whether the socket is up,
// and turning a sale into paper. Global because the connection is made in the
// sales history and used from a sale's detail.
export function PrinterProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<PrinterDevice | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);

  // Restore the last printer and try to pick the session back up. A thermal
  // printer that went to sleep just fails here and the user reconnects.
  useEffect(() => {
    if (!isPrinterSupported) return;
    let cancelled = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || cancelled) return;
        const saved: PrinterDevice = JSON.parse(raw);
        setDevice(saved);
        setConnected(await isPrinterConnected(saved.address));
      } catch {
        /* nothing saved, or it no longer parses — start clean */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!isPrinterSupported) return;
    const granted = await requestPrinterPermissions();
    if (!granted) throw new Error('Se necesita permiso de Bluetooth para buscar la impresora.');
    setDevices(await listPairedPrinters());
  }, []);

  const connect = useCallback(async (target: PrinterDevice) => {
    setConnecting(true);
    try {
      await connectPrinter(target.address);
      setDevice(target);
      setConnected(true);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(target));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (device) await disconnectPrinter(device.address);
    setConnected(false);
    setDevice(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, [device]);

  // The socket may have died since we last looked (printer asleep, out of
  // range). Reconnect once before giving up, so printing doesn't fail for
  // something the user can't see. Returns the address to write to.
  const ensureConnected = useCallback(async () => {
    if (!device) throw new Error('No hay una impresora conectada.');
    if (!(await isPrinterConnected(device.address))) {
      await connectPrinter(device.address);
    }
    setConnected(true);
    return device.address;
  }, [device]);

  const printPayload = useCallback(
    async (payload: string, encoding: PayloadEncoding = 'base64') => {
      const address = await ensureConnected();
      await writeToPrinter(address, payload, encoding);
    },
    [ensureConnected]
  );

  const value = useMemo(
    () => ({
      supported: isPrinterSupported,
      device,
      connected,
      connecting,
      devices,
      refreshDevices,
      connect,
      disconnect,
      printPayload,
    }),
    [device, connected, connecting, devices, refreshDevices, connect, disconnect, printPayload]
  );

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
}

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter must be used within a PrinterProvider');
  return ctx;
}
