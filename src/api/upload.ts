import { File } from 'expo-file-system';

// Builds a FormData file part from a local file URI (e.g. what expo-image-picker
// returns).
//
// IMPORTANT: the global `fetch` in SDK 56 is Expo's WinterCG implementation, and
// it does NOT accept React Native's legacy `{ uri, name, type }` part — it throws
// "Unsupported FormDataPart implementation". Its `convertFormData` only takes a
// string, a `Blob`, or an object exposing `bytes()`.
//
// `expo-file-system`'s `File` implements that interface and also supplies `name`
// and `type`, which Expo reads to build the part's Content-Disposition filename
// and Content-Type — so the server sees the real extension/mime instead of an
// assumed JPEG.
export function filePart(uri: string): Blob {
  return new File(uri) as unknown as Blob;
}
