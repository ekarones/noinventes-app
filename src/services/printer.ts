import { PermissionsAndroid, Platform } from 'react-native';

// Thin wrapper over the Bluetooth Classic native module.
//
// It is loaded with a guarded require on purpose: the module only exists in a
// development/production build, so in Expo Go (which ships a fixed set of native
// modules) the import would throw and take the whole app down. Here it degrades
// to `isPrinterSupported === false` and the UI simply hides the feature.
let native: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  native = require('react-native-bluetooth-classic').default;
} catch {
  native = null;
}

// Bluetooth Classic (SPP) is Android-only in practice: iOS restricts it to
// MFi-certified accessories, which generic 80mm ESC/POS printers are not.
export const isPrinterSupported = native != null && Platform.OS === 'android';

export type PrinterDevice = {
  /** MAC address on Android — the stable id we persist to reconnect. */
  address: string;
  name: string;
};

/**
 * Android 12+ replaced the old blanket BLUETOOTH permission with runtime
 * BLUETOOTH_CONNECT/SCAN. Older versions instead need location to see devices.
 * Returns false when the user denies anything we actually need.
 */
export async function requestPrinterPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  // API 31 (Android 12) is where the Bluetooth permissions split.
  const needsNewPermissions = Number(Platform.Version) >= 31;
  const wanted = needsNewPermissions
    ? [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
}

/** Devices already paired in Android settings — where thermal printers live. */
export async function listPairedPrinters(): Promise<PrinterDevice[]> {
  if (!isPrinterSupported) return [];
  const devices = await native.getBondedDevices();
  return (devices ?? []).map((d: any) => ({ address: d.address, name: d.name || d.address }));
}

export async function isBluetoothEnabled(): Promise<boolean> {
  if (!isPrinterSupported) return false;
  return !!(await native.isBluetoothEnabled());
}

export async function connectPrinter(address: string): Promise<void> {
  if (!isPrinterSupported) throw new Error('Impresora no disponible en esta versión de la app.');
  // Reconnecting over a live socket throws on some devices; drop it first.
  try {
    await native.disconnectFromDevice(address);
  } catch {
    /* it wasn't connected — nothing to drop */
  }
  await native.connectToDevice(address, { delimiter: '' });
}

export async function disconnectPrinter(address: string): Promise<void> {
  if (!isPrinterSupported) return;
  try {
    await native.disconnectFromDevice(address);
  } catch {
    /* already gone */
  }
}

/** True only if the socket is still open — printers drop when they sleep. */
export async function isPrinterConnected(address: string): Promise<boolean> {
  if (!isPrinterSupported) return false;
  try {
    return !!(await native.isDeviceConnected(address));
  } catch {
    return false;
  }
}

/**
 * How the payload string is encoded on the way to the socket.
 *
 * Everything the app prints is `base64` now: the server composes the stream, and
 * it carries control bytes and a CP850 code page that aren't valid UTF-8, so the
 * native side decodes it back to raw bytes rather than re-encoding the text.
 * `utf-8` is kept for a payload that is plain text end to end.
 */
export type PayloadEncoding = 'utf-8' | 'base64';

// Above this much base64, the payload is written in pieces instead of one shot.
//
// A receipt is 1–3 KB and goes in a single write, exactly as it does today —
// that path works and this must not disturb it. A sheet of raster labels is a
// different order of magnitude: each 30x20mm label is 240x160 dots = 4800 bytes,
// so a dozen copies is ~57 KB. Thermal printers have input buffers of a few KB
// and drop whatever overflows, which looks from the counter like nothing
// printed at all.
const SINGLE_WRITE_LIMIT = 8192;

// Multiple of 4, so every piece is a whole number of base64 quads and decodes
// on its own — splitting mid-quad would corrupt the bytes at every seam.
const CHUNK = 1024;

// Lets the printer drain its buffer between pieces. Without it the writes land
// back-to-back and the overflow we are avoiding happens anyway.
const CHUNK_PAUSE_MS = 20;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Writes a raw printer payload, in pieces when it is too big to send at once. */
export async function writeToPrinter(
  address: string,
  payload: string,
  encoding: PayloadEncoding = 'utf-8'
): Promise<void> {
  if (!isPrinterSupported) throw new Error('Impresora no disponible en esta versión de la app.');

  // Chunking only makes sense for base64: a utf-8 payload could be cut through
  // the middle of a multi-byte character.
  if (encoding !== 'base64' || payload.length <= SINGLE_WRITE_LIMIT) {
    await write(address, payload, encoding);
    return;
  }

  for (let i = 0; i < payload.length; i += CHUNK) {
    await write(address, payload.slice(i, i + CHUNK), encoding);
    if (i + CHUNK < payload.length) await sleep(CHUNK_PAUSE_MS);
  }
}

// The native call reports a failed write by returning false rather than
// throwing. Ignoring it would let a job stop halfway and still look like it
// succeeded — the exact failure this whole path keeps running into.
async function write(address: string, data: string, encoding: PayloadEncoding): Promise<void> {
  const ok = await native.writeToDevice(address, data, encoding);
  if (ok === false) {
    throw new Error('La impresora rechazó los datos. Revisa que esté encendida y en rango.');
  }
}
