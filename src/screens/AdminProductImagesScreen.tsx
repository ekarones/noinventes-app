import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminProductDetail } from '../api/admin/products';
import {
  deleteProductImage,
  setFeaturedImage,
  uploadProductImages,
} from '../api/admin/productImages';
import { pickImages } from '../utils/imagePicker';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { useToast } from '../context/ToastContext';
import type { AdminProductImage } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductImages'>;

// The server caps a product at 10 images and each file at 5 MB.
const MAX_IMAGES = 10;

export default function AdminProductImagesScreen({ route, navigation }: Props) {
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
    const uris = await pickImages({ multiple: true, selectionLimit: remaining });
    if (uris.length === 0) return;

    setBusy(true);
    try {
      await uploadProductImages(productId, uris);
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
      <ScreenHeader title="Imágenes" onBack={() => navigation.goBack()} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: load }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: SPACING.sm, paddingBottom: SPACING['2xl'] }}
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
                  <Image
                    source={img.thumbUrl}
                    style={styles.tileImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
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
                      activeOpacity={ROW_PRESS_OPACITY}
                      accessibilityRole="button"
                      accessibilityLabel={
                        img.isFeatured ? 'Imagen destacada' : 'Destacar esta imagen'
                      }
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
                      activeOpacity={ROW_PRESS_OPACITY}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar esta imagen"
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
            activeOpacity={ROW_PRESS_OPACITY}
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
  muted: { fontSize: FONT_SIZE.body, color: colors.textSecondary, textAlign: 'center' },
  productName: { fontSize: FONT_SIZE.titleSm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  counter: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: SPACING.hairline, marginBottom: SPACING.lg },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING['3xl'], gap: SPACING.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  tile: {
    width: '47%',
    flexGrow: 1,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileImg: { width: '100%', height: 140, backgroundColor: colors.surfaceMuted },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
  },
  featuredText: { color: colors.textOnPrimary, fontSize: FONT_SIZE.badge, fontWeight: FONT_WEIGHT.bold },
  tileActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: SPACING.sm },
  tileBtn: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: RADIUS.pill,
    marginTop: SPACING['2xl'],
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadText: { color: colors.textOnPrimary, fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold },
  hint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 17 },
});
