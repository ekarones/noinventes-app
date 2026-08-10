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
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import PushedHeader from '../components/PushedHeader';
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

  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

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
    const note = img.isFeatured
      ? 'Es la destacada: se destacará automáticamente la siguiente.'
      : 'Se quitará de la galería del producto.';
    Alert.alert('¿Eliminar la imagen?', note, [
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
      <PushedHeader
        title="Imágenes"
        subtitle={`${productName} · ${images.length} de ${MAX_IMAGES} imágenes`}
        onBack={() => navigation.goBack()}
        titleSize={22}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: load }}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {images.length === 0 ? (
              <EmptyState
                icon="images-outline"
                title="Sin imágenes"
                message="La primera que subas será la destacada."
              />
            ) : (
              <View style={styles.grid}>
                {images.map((img) => (
                  <View key={img.id} style={[styles.tile, img.isFeatured && styles.tileFeatured]}>
                    <View style={styles.tileImgWrap}>
                      <Image
                        source={img.thumbUrl}
                        style={styles.tileImg}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                      {img.isFeatured && (
                        <View style={styles.featuredBadge}>
                          <Ionicons name="star" size={11} color="#16213A" />
                          <Text style={styles.featuredText}>Destacada</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.tileActions}>
                      <TouchableOpacity
                        style={[styles.starBtn, img.isFeatured && styles.starBtnOn]}
                        onPress={() => makeFeatured(img)}
                        disabled={busy || img.isFeatured}
                        activeOpacity={ROW_PRESS_OPACITY}
                        accessibilityRole="button"
                        accessibilityLabel={img.isFeatured ? 'Imagen destacada' : 'Destacar esta imagen'}
                      >
                        <Ionicons
                          name={img.isFeatured ? 'star' : 'star-outline'}
                          size={16}
                          color={img.isFeatured ? '#E6A700' : colors.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.delBtn}
                        onPress={() => confirmDelete(img)}
                        disabled={busy}
                        activeOpacity={ROW_PRESS_OPACITY}
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar esta imagen"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.noteBlock}>
              <Text style={styles.noteText}>
                Hasta {MAX_IMAGES} imágenes · 5 MB por archivo · jpg, png o webp. Puedes elegir varias
                a la vez.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cta, (busy || remaining <= 0) && styles.ctaOff]}
              onPress={pickAndUpload}
              disabled={busy || remaining <= 0}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color="#16213A" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={remaining <= 0 ? 'rgba(22, 33, 58, 0.35)' : '#16213A'}
                  />
                  <Text style={[styles.ctaText, remaining <= 0 && styles.ctaTextOff]}>
                    {remaining > 0
                      ? `Subir imágenes (${remaining} disponibles)`
                      : 'Límite de 10 imágenes'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, paddingBottom: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      width: '47%',
      flexGrow: 1,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: colors.surface,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    tileFeatured: { borderColor: '#FFC20E' },
    tileImgWrap: { position: 'relative' },
    tileImg: { width: '100%', height: 118, backgroundColor: colors.surfaceMuted },
    featuredBadge: {
      position: 'absolute',
      left: 8,
      top: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 9,
      backgroundColor: '#FFC20E',
    },
    featuredText: { fontSize: 10, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    tileActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10 },
    starBtn: {
      flex: 1,
      height: 36,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    starBtnOn: { backgroundColor: '#FFF9E6', borderColor: '#F5D98A' },
    delBtn: {
      flex: 1,
      height: 36,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#F3CFC6',
      backgroundColor: colors.errorSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noteBlock: { backgroundColor: '#F7F8FA', borderRadius: 16, padding: 12, marginTop: 14 },
    noteText: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.55)', lineHeight: 16 },
    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: '#E9EBF0',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 58,
      borderRadius: 18,
      backgroundColor: '#FFC20E',
    },
    ctaOff: { backgroundColor: '#EDEFF3' },
    ctaText: { fontSize: 16.5, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    ctaTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
