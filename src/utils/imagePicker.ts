import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

async function fromCamera(): Promise<string[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permiso requerido', 'Concede acceso a la cámara para tomar fotos.');
    return [];
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  return !result.canceled && result.assets[0] ? [result.assets[0].uri] : [];
}

async function fromLibrary(multiple: boolean, selectionLimit?: number): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permiso requerido', 'Concede acceso a tus fotos para elegir una imagen.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    selectionLimit,
    quality: 0.8,
  });
  return result.canceled ? [] : result.assets.map((a) => a.uri);
}

// Prompts the user to take a photo or pick from the library, then returns the
// chosen image URIs (empty array if cancelled or permission denied). The camera
// always yields a single shot; `multiple` only affects the library.
export function pickImages(
  opts: { multiple?: boolean; selectionLimit?: number } = {}
): Promise<string[]> {
  return new Promise((resolve) => {
    Alert.alert(
      'Agregar imagen',
      undefined,
      [
        { text: 'Tomar foto', onPress: () => fromCamera().then(resolve) },
        {
          text: 'Elegir de galería',
          onPress: () => fromLibrary(opts.multiple ?? false, opts.selectionLimit).then(resolve),
        },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve([]) },
      ],
      // Dismissing by tapping outside (Android) resolves as "no selection".
      { cancelable: true, onDismiss: () => resolve([]) }
    );
  });
}
