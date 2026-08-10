import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createProduct, updateProduct, type ProductPayload } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import { fetchAdminTags } from '../api/admin/tags';
import { fetchAdminAttributes } from '../api/admin/attributes';
import { pickImages } from '../utils/imagePicker';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PushedHeader from '../components/PushedHeader';
import { useToast } from '../context/ToastContext';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import type {
  AdminAttribute,
  AdminCategory,
  AdminProductStatus,
  AdminTag,
  ProductType,
} from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductForm'>;

const STATUSES: { value: AdminProductStatus; label: string }[] = [
  { value: 'public', label: 'Público' },
  { value: 'private', label: 'Privado' },
];

const TYPES: { value: ProductType; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable' },
];

export default function AdminProductFormScreen({ route, navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const product = route.params?.product;
  const editing = !!product;

  const [code, setCode] = useState(product?.code ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [status, setStatus] = useState<AdminProductStatus>(product?.status ?? 'public');
  const [type, setType] = useState<ProductType>(product?.type ?? 'simple');
  const [categoryId, setCategoryId] = useState<number | null>(product?.category?.id ?? null);
  const [unitValue, setUnitValue] = useState(String(product?.unitValue ?? '1'));
  const [finalPrice, setFinalPrice] = useState(product ? String(product.finalPrice) : '');
  const [unitOfMeasure, setUnitOfMeasure] = useState(product?.unitOfMeasure ?? 'unit');
  const [tagIds, setTagIds] = useState<number[]>(product?.tags.map((t) => t.id) ?? []);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Which attributes a new variable product will use. The API derives the set
  // from the variations, so we carry the choice into the first-variation form.
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [attributeIds, setAttributeIds] = useState<number[]>([]);

  useEffect(() => {
    fetchAdminCategories().then(setCategories).catch(() => {});
    fetchAdminTags().then(setTags).catch(() => {});
    fetchAdminAttributes().then(setAttributes).catch(() => {});
  }, []);

  const categoryName =
    categoryId == null ? null : categories.find((c) => c.id === categoryId)?.name ?? '—';

  async function pickImage() {
    const [uri] = await pickImages();
    if (uri) setImageUri(uri);
  }

  function toggleTag(id: number) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function toggleAttribute(id: number) {
    setAttributeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  // A new variable product needs at least one attribute — its variations are
  // combinations of them.
  const needsAttributes = !editing && type === 'variable';

  const price = parseFloat(finalPrice);
  const unit = parseFloat(unitValue);
  const canSubmit =
    code.trim().length > 0 &&
    name.trim().length > 0 &&
    unitOfMeasure.trim().length > 0 &&
    Number.isFinite(price) &&
    Number.isFinite(unit) &&
    (!needsAttributes || attributeIds.length > 0) &&
    !saving;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload: ProductPayload = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        shortDescription: shortDescription.trim() || null,
        status,
        type,
        categoryId,
        unitValue: unit,
        finalPrice: price,
        unitOfMeasure: unitOfMeasure.trim(),
        tagIds,
        attributeIds: needsAttributes ? attributeIds : undefined,
      };
      if (editing) {
        await updateProduct(product!.id, payload, imageUri ?? undefined);
        showToast('Producto actualizado', 'checkmark-circle');
        navigation.goBack();
        return;
      }

      const newId = await createProduct(payload, imageUri ?? undefined);
      showToast('Producto creado', 'checkmark-circle');

      // For a variable product, go straight to its first variation.
      if (needsAttributes && newId != null) {
        navigation.replace('AdminVariationForm', {
          productId: newId,
          productName: payload.name,
          productUnitValue: payload.unitValue,
          productFinalPrice: payload.finalPrice,
          attributeIds,
        });
        return;
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const currentImage = imageUri ?? product?.images.find((i) => i.isFeatured)?.thumbUrl ?? null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PushedHeader
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Featured image */}
        <View style={styles.card}>
          <View style={styles.imageRow}>
            <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={ROW_PRESS_OPACITY}>
              {currentImage ? (
                <Image source={currentImage} style={styles.imagePreview} contentFit="cover" cachePolicy="memory-disk" transition={150} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={22} color="rgba(22, 33, 58, 0.45)" />
                  <Text style={styles.imagePick}>Elegir</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.imageTexts}>
              <Text style={styles.imageTitle}>Imagen destacada</Text>
              <Text style={styles.imageHint}>
                jpg · png · webp · hasta 5 MB. La galería completa se gestiona en Imágenes.
              </Text>
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.card}>
          <Field label="Código" value={code} onChangeText={setCode} placeholder="POL-115" autoCapitalize="characters" styles={styles} />
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Polo oversize crudo" styles={styles} />
          <Field label="Descripción corta" value={shortDescription} onChangeText={setShortDescription} placeholder="Algodón peinado, corte holgado" styles={styles} />
          <View>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalle largo del producto…"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Classification */}
        <View style={styles.card}>
          {!editing && (
            <View>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>solo al crear</Text>
                </View>
              </View>
              <View style={styles.segment}>
                {TYPES.map((t) => {
                  const on = type === t.value;
                  return (
                    <TouchableOpacity key={t.value} style={[styles.segBtn, on && styles.segBtnOn]} onPress={() => setType(t.value)} activeOpacity={ROW_PRESS_OPACITY}>
                      <Text style={[styles.segText, on && styles.segTextOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {needsAttributes && (
            <View>
              <Text style={styles.label}>Atributos del producto</Text>
              {attributes.length === 0 ? (
                <Text style={styles.hint}>No hay atributos. Créalos en Gestión → Atributos.</Text>
              ) : (
                <View style={styles.chips}>
                  {attributes.map((a) => {
                    const on = attributeIds.includes(a.id);
                    return (
                      <TouchableOpacity key={a.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleAttribute(a.id)} activeOpacity={ROW_PRESS_OPACITY}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={styles.hint}>
                Al guardar, pasarás directo a crear la primera variación. El tipo y los atributos no se
                pueden cambiar después.
              </Text>
            </View>
          )}

          <View>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.segment}>
              {STATUSES.map((s) => {
                const on = status === s.value;
                return (
                  <TouchableOpacity key={s.value} style={[styles.segBtn, on && styles.segBtnOn]} onPress={() => setStatus(s.value)} activeOpacity={ROW_PRESS_OPACITY}>
                    <Text style={[styles.segText, on && styles.segTextOn]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Categoría</Text>
            <TouchableOpacity style={styles.select} onPress={() => setCategoryPickerOpen(true)} activeOpacity={ROW_PRESS_OPACITY}>
              <Text style={[styles.selectText, !categoryName && styles.selectPlaceholder]} numberOfLines={1}>
                {categoryName ?? 'Elegir categoría'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="rgba(22, 33, 58, 0.45)" />
            </TouchableOpacity>
          </View>

          <View>
            <Text style={styles.label}>Etiquetas</Text>
            {tags.length === 0 ? (
              <Text style={styles.hint}>No hay etiquetas. Créalas en Gestión → Etiquetas.</Text>
            ) : (
              <View style={styles.chips}>
                {tags.map((t) => {
                  const on = tagIds.includes(t.id);
                  return (
                    <TouchableOpacity key={t.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleTag(t.id)} activeOpacity={ROW_PRESS_OPACITY}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Prices */}
        <View style={styles.card}>
          <View>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Precio final</Text>
              {type === 'variable' && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>precio base</Text>
                </View>
              )}
            </View>
            <View style={styles.priceField}>
              <Text style={styles.pricePrefix}>S/</Text>
              <TextInput
                style={styles.priceInput}
                value={finalPrice}
                onChangeText={setFinalPrice}
                placeholder="0.00"
                placeholderTextColor="rgba(22, 33, 58, 0.35)"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.twoCols}>
            <Field label="Valor unitario" value={unitValue} onChangeText={setUnitValue} placeholder="1" keyboardType="decimal-pad" styles={styles} col />
            <Field label="Unidad" value={unitOfMeasure} onChangeText={setUnitOfMeasure} placeholder="unit" autoCapitalize="none" styles={styles} col />
          </View>
          {!editing && (
            <View style={styles.noteBlock}>
              <Ionicons name="information-circle-outline" size={17} color="rgba(22, 33, 58, 0.5)" />
              <Text style={styles.noteText}>
                El producto nace con stock 0 en todas las sucursales. Se asigna desde el detalle.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaOff]}
          onPress={save}
          disabled={!canSubmit}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
            {saving
              ? 'Guardando…'
              : editing
                ? 'Guardar cambios'
                : needsAttributes
                  ? 'Crear y añadir variación'
                  : 'Crear producto'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category picker */}
      <BottomSheet visible={categoryPickerOpen} onClose={() => setCategoryPickerOpen(false)} title="Categoría" scrollable>
        <SheetOption
          label="Sin categoría"
          active={categoryId == null}
          onPress={() => {
            setCategoryId(null);
            setCategoryPickerOpen(false);
          }}
        />
        {categories.map((c) => (
          <SheetOption
            key={c.id}
            label={c.name}
            depth={c.depth}
            active={categoryId === c.id}
            onPress={() => {
              setCategoryId(c.id);
              setCategoryPickerOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

// A labelled 5a text input (uppercase label + bordered box). Kept local since the
// whole form shares one look; `col` sizes it to share a two-column row.
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  styles,
  col,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  autoCapitalize?: 'none' | 'characters' | 'sentences';
  styles: ReturnType<typeof makeStyles>;
  col?: boolean;
}) {
  return (
    <View style={col && styles.col}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(22, 33, 58, 0.35)"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 12, paddingBottom: 24 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 13,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },

    // ---- Image ----
    imageRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    imageBox: {
      width: 88,
      height: 88,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#C9CFDB',
      borderStyle: 'dashed',
      backgroundColor: '#FAFBFC',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      overflow: 'hidden',
    },
    imagePreview: { width: 88, height: 88 },
    imagePick: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.5)' },
    imageTexts: { flex: 1, minWidth: 0 },
    imageTitle: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    imageHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 3, lineHeight: 16 },

    // ---- Fields ----
    label: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      marginBottom: 6,
    },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 1 },
    tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: '#FFF3CF' },
    tagText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: '#8A6400' },
    input: {
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 15.5,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
    textarea: {
      minHeight: 78,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 14.5,
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
      lineHeight: 20,
    },
    twoCols: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },

    // ---- Segmented ----
    segment: { flexDirection: 'row', gap: 8, backgroundColor: colors.fill, borderRadius: 15, padding: 4 },
    segBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
    segBtnOn: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      shadowColor: '#16213a',
      shadowOpacity: 0.14,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segText: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.55)' },
    segTextOn: { color: colors.primary },

    // ---- Chips ----
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { height: 40, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.62)' },
    chipTextOn: { color: '#fff' },

    // ---- Category select ----
    select: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      backgroundColor: colors.surface,
    },
    selectText: { flex: 1, fontSize: 15, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    selectPlaceholder: { color: 'rgba(22, 33, 58, 0.45)' },

    // ---- Prices ----
    priceField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      height: 52,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
    },
    pricePrefix: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.45)' },
    priceInput: { flex: 1, minWidth: 0, fontSize: 18, fontFamily: FONT_FAMILY.black, color: colors.primary, padding: 0 },

    // ---- Note + hint ----
    noteBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#F7F8FA', borderRadius: 14, padding: 12 },
    noteText: { flex: 1, fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.6)', lineHeight: 17 },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 8, lineHeight: 16 },

    // ---- Footer ----
    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: '#E9EBF0',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
    },
    cta: { height: 58, borderRadius: 18, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    ctaOff: { backgroundColor: '#EDEFF3' },
    ctaText: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    ctaTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
