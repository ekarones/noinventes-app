import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { createVariation, updateVariation } from '../api/admin/products';
import { fetchAdminAttributes } from '../api/admin/attributes';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PushedHeader from '../components/PushedHeader';
import { useToast } from '../context/ToastContext';
import { pickImages } from '../utils/imagePicker';
import type { AdminAttribute } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminVariationForm'>;

export default function AdminVariationFormScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  const { productId, productName, productUnitValue, productFinalPrice, variation, attributeIds } =
    route.params;
  const editing = !!variation;

  const [code, setCode] = useState(variation?.code ?? '');
  const [unitValue, setUnitValue] = useState(
    editing ? String(variation!.unitValue) : productUnitValue != null ? String(productUnitValue) : '1'
  );
  const [finalPrice, setFinalPrice] = useState(
    editing ? String(variation!.finalPrice) : productFinalPrice != null ? String(productFinalPrice) : ''
  );

  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [loadingAttrs, setLoadingAttrs] = useState(!editing);
  // attributeId → selected value id
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  // When the product has no variations yet and none were pre-chosen, the admin
  // picks which attributes this product will use.
  const [chosenIds, setChosenIds] = useState<number[]>([]);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const previewUri = imageUri ?? variation?.imageThumbUrl ?? null;

  async function pickImage() {
    const [uri] = await pickImages();
    if (uri) setImageUri(uri);
  }

  useEffect(() => {
    if (editing) return;
    fetchAdminAttributes()
      .then(setAttributes)
      .catch(() => {})
      .finally(() => setLoadingAttrs(false));
  }, [editing]);

  // The product's existing variations pin the attribute set. If it has none, this
  // first variation establishes it, so any attributes go.
  const requiredAttributes = useMemo(() => {
    if (!attributeIds || attributeIds.length === 0) return null;
    const wanted = new Set(attributeIds);
    return attributes.filter((a) => wanted.has(a.id));
  }, [attributes, attributeIds]);

  const pickable = requiredAttributes ?? attributes.filter((a) => chosenIds.includes(a.id));
  const comboReady = pickable.length > 0 && pickable.every((a) => selection[a.id] != null);
  const orderedValueIds = pickable.map((a) => selection[a.id]).filter((id) => id != null);

  function toggleAttribute(id: number) {
    setChosenIds((prev) => {
      if (!prev.includes(id)) return [...prev, id];
      setSelection((sel) => {
        const next = { ...sel };
        delete next[id];
        return next;
      });
      return prev.filter((a) => a !== id);
    });
  }

  const price = parseFloat(finalPrice);
  const unit = parseFloat(unitValue);
  const canSubmit =
    (!editing || code.trim().length > 0) &&
    Number.isFinite(price) &&
    Number.isFinite(unit) &&
    (editing || comboReady) &&
    !saving;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (editing) {
        await updateVariation(
          variation!.id,
          { code: code.trim(), unitValue: unit, finalPrice: price },
          imageUri ?? undefined
        );
        showToast('Variación actualizada', 'checkmark-circle');
      } else {
        await createVariation(
          productId,
          { code: code.trim() || undefined, unitValue: unit, finalPrice: price, attributeValueIds: orderedValueIds },
          imageUri ?? undefined
        );
        showToast('Variación creada', 'checkmark-circle');
      }
      navigation.goBack();
    } catch (e: any) {
      // 422: not a variable product, wrong set, duplicate combo, duplicate code.
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const comboLabel = variation?.attributeValues.map((a) => a.value).join(' · ');
  const combo = comboReady
    ? pickable.map((a) => a.values.find((v) => v.id === selection[a.id])?.value).join(' · ')
    : 'Elige un valor por atributo';
  const generatedHint =
    comboReady && pickable.length > 0
      ? `Se genera con el producto y los valores (${pickable
          .map((a) => a.values.find((v) => v.id === selection[a.id])?.value?.charAt(0) ?? '')
          .join('')})`
      : 'Se genera solo';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PushedHeader
        title={editing ? 'Editar variación' : 'Nueva variación'}
        subtitle={editing && comboLabel ? `${productName} · ${comboLabel}` : productName}
        onBack={() => navigation.goBack()}
        titleSize={22}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Reference image */}
        <View style={styles.card}>
          <View style={styles.imageRow}>
            <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={ROW_PRESS_OPACITY}>
              {previewUri ? (
                <Image source={previewUri} style={styles.imagePreview} contentFit="cover" cachePolicy="memory-disk" transition={150} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={20} color="rgba(22, 33, 58, 0.45)" />
                  <Text style={styles.imagePick}>Elegir</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.imageTexts}>
              <Text style={styles.imageTitle}>Imagen de referencia</Text>
              <Text style={styles.imageHint}>Opcional. Si no la pones, se usa la del producto.</Text>
              {imageUri && (
                <TouchableOpacity onPress={() => setImageUri(null)} activeOpacity={ROW_PRESS_OPACITY}>
                  <Text style={styles.imageRemove}>Quitar imagen</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Attribute combo — only when creating */}
        {!editing && (
          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Combinación</Text>
              <View style={styles.tag}>
                <Text style={styles.tagText}>inmutable al editar</Text>
              </View>
            </View>

            {loadingAttrs ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
            ) : attributes.length === 0 ? (
              <Text style={styles.warn}>
                No hay atributos creados. Créalos primero en Gestión → Atributos.
              </Text>
            ) : (
              <>
                {!requiredAttributes && (
                  <View>
                    <Text style={styles.attrName}>Atributos de este producto</Text>
                    <View style={styles.chips}>
                      {attributes.map((a) => {
                        const on = chosenIds.includes(a.id);
                        return (
                          <TouchableOpacity key={a.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleAttribute(a.id)} activeOpacity={ROW_PRESS_OPACITY}>
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {pickable.map((a) => (
                  <View key={a.id}>
                    <Text style={styles.attrName}>{a.name}</Text>
                    <View style={styles.chips}>
                      {a.values.map((v) => {
                        const on = selection[a.id] === v.id;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            style={[styles.chip, on && styles.chipOn]}
                            onPress={() => setSelection((prev) => ({ ...prev, [a.id]: v.id }))}
                            activeOpacity={ROW_PRESS_OPACITY}
                          >
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>{v.value}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}

                <View style={styles.resultBlock}>
                  <Text style={styles.resultLabel}>Resultado</Text>
                  <Text style={[styles.resultValue, !comboReady && styles.resultValueOff]} numberOfLines={1}>
                    {combo}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Code */}
        <View style={styles.card}>
          <View>
            <Text style={styles.label}>Código</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder={editing ? 'Ej. POL-114-RM' : generatedHint}
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {!editing && (
              <Text style={styles.hint}>
                Si lo dejas vacío, el servidor lo genera con el producto y los valores.
              </Text>
            )}
          </View>

          <View style={styles.twoCols}>
            <View style={styles.col}>
              <Text style={styles.label}>Precio final</Text>
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
            <View style={styles.col}>
              <Text style={styles.label}>Valor unitario</Text>
              <TextInput
                style={styles.input}
                value={unitValue}
                onChangeText={setUnitValue}
                placeholder="1"
                placeholderTextColor="rgba(22, 33, 58, 0.35)"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {!editing && (
            <Text style={styles.hint}>
              Heredados del producto; edítalos si esta variación cuesta distinto. Nace con stock 0.
            </Text>
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
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear variación'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
      gap: 14,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },

    // ---- Image ----
    imageRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    imageBox: {
      width: 76,
      height: 76,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#C9CFDB',
      borderStyle: 'dashed',
      backgroundColor: '#FAFBFC',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      overflow: 'hidden',
    },
    imagePreview: { width: 76, height: 76 },
    imagePick: { fontSize: 10, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.5)' },
    imageTexts: { flex: 1, minWidth: 0 },
    imageTitle: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    imageHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 3, lineHeight: 16 },
    imageRemove: { fontSize: 12, fontFamily: FONT_FAMILY.black, color: colors.error, marginTop: 5 },

    // ---- Combination ----
    label: { fontSize: 11.5, fontFamily: FONT_FAMILY.black, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(22, 33, 58, 0.45)', marginBottom: 6 },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: '#FFF3CF' },
    tagText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: '#8A6400' },
    warn: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: colors.warning, lineHeight: 19 },
    attrName: { fontSize: 13, fontFamily: FONT_FAMILY.black, color: colors.primary, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { height: 40, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.62)' },
    chipTextOn: { color: '#fff' },
    resultBlock: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F7F8FA', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11 },
    resultLabel: { fontSize: 11.5, fontFamily: FONT_FAMILY.black, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(22, 33, 58, 0.45)' },
    resultValue: { flex: 1, textAlign: 'right', fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    resultValueOff: { color: 'rgba(22, 33, 58, 0.4)' },

    // ---- Inputs ----
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
    twoCols: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    priceField: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.controlBorder, borderRadius: 15 },
    pricePrefix: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.45)' },
    priceInput: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: FONT_FAMILY.black, color: colors.primary, padding: 0 },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 7, lineHeight: 16 },

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
