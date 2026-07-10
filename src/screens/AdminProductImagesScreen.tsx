import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminProductDetail } from '../api/admin/products';
import {
  deleteProductImage,
  setFeaturedImage,
  uploadProductImages,
} from '../api/admin/productImages';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import type { AdminProductImage } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductImages'>;

// The server caps a product at 10 images and each file at 5 MB.
const MAX_IMAGES = 10;

export default function AdminProductImagesScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { productId, productName } = route.params;

  const [images, setImages] = useState<AdminProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchAdminProductDetail(productId);
      setImages(d.images);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las imágenes.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const remaining = MAX_IMAGES - images.length;

  async function pickAndUpload() {
    if (busy) return;
    if (remaining <= 0) {
      Alert.alert('Límite alcanzado', `Un producto admite hasta ${MAX_IMAGES} imágenes.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Concede acceso a tus fotos para subir imágenes.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setBusy(true);
    try {
      await uploadProductImages(productId, result.assets.map((a) => a.uri));
      showToast('Imágenes subidas', 'checkmark-circle');
      load();
    } catch (e: any) {
      // 422 covers: over the 10-image cap, bad format, file over 5 MB.
      Alert.alert('No se pudieron subir', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function makeFeatured(img: AdminProductImage) {
    if (busy || img.isFeatured) return;
    setBusy(true);
    try {
      await setFeaturedImage(productId, img.id);
      showToast('Imagen destacada', 'star');
      load();
    } catch (e: any) {
      Alert.alert('No se pudo destacar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(img: AdminProductImage) {
    const note = img.isFeatured ? '\n\nSe destacará automáticamente la siguiente imagen.' : '';
    Alert.alert('Eliminar imagen', `¿Eliminar esta imagen?${note}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(img) },
    ]);
  }

  async function doDelete(img: AdminProductImage) {
    setBusy(true);
    try {
      await deleteProductImage(productId, img.id);
      showToast('Imagen eliminada', 'checkmark-circle');
      load();
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Imágenes</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.muted}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.counter}>
            {images.length} de {MAX_IMAGES} imágenes
          </Text>

          {images.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={56} color={colors.border} />
              <Text style={styles.muted}>Aún no hay imágenes.</Text>
              <Text style={styles.hint}>La primera que subas será la destacada.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {images.map((img) => (
                <View key={img.id} style={styles.tile}>
                  <Image source={{ uri: img.url }} style={styles.tileImg} resizeMode="cover" />
                  {img.isFeatured && (
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={12} color={colors.textOnPrimary} />
                      <Text style={styles.featuredText}>Destacada</Text>
                    </View>
                  )}
                  <View style={styles.tileActions}>
                    <TouchableOpacity
                      style={styles.tileBtn}
                      onPress={() => makeFeatured(img)}
                      disabled={busy || img.isFeatured}
                    >
                      <Ionicons
                        name={img.isFeatured ? 'star' : 'star-outline'}
                        size={18}
                        color={img.isFeatured ? colors.border : colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.tileBtn}
                      onPress={() => confirmDelete(img)}
                      disabled={busy}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.uploadBtn, (busy || remaining <= 0) && styles.uploadBtnDisabled]}
            onPress={pickAndUpload}
            disabled={busy || remaining <= 0}
            activeOpacity={0.9}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.textOnPrimary} />
                <Text style={styles.uploadText}>
                  {remaining > 0 ? `Subir imágenes (${remaining} disponibles)` : 'Límite alcanzado'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>Formatos: jpg, png, webp. Máximo 5 MB por archivo.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  muted: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  productName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  counter: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileImg: { width: '100%', height: 140, backgroundColor: colors.primarySoft },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featuredText: { color: colors.textOnPrimary, fontSize: 10, fontWeight: '700' },
  tileActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  tileBtn: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 14,
    marginTop: 24,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 17 },
});
