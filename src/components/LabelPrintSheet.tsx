import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../theme/tokens';
import { usePrinter } from '../context/PrinterContext';
import { fetchLabelPayload, LABEL_SIZE, type LabelRequestItem } from '../api/admin/labels';
import { formatPrice } from '../utils/format';
import { hapticSuccess } from '../utils/haptics';
import BottomSheet from './BottomSheet';
import Button from './Button';
import Chip, { ChipRow } from './Chip';
import QuantityStepper from './QuantityStepper';
import type { AdminProductDetail, AdminVariation } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  product: AdminProductDetail;
  variations: AdminVariation[];
  /** How to name a variation — owned by the caller, which already has it. */
  variationLabel: (v: AdminVariation) => string;
  /** No printer connected: hand the user back to the picker. The parent swaps
   *  the sheets rather than nesting two modals. */
  onConnectPrinter: () => void;
};

// One printable row. A simple product prints one label; a variable product
// prints one per variation, because the code, the price and the attributes on
// the sticker are the variation's, not the parent's.
type LabelRow = {
  key: string;
  title: string;
  code: string;
  price: number;
  productId: number;
  variationId: number | null;
};

// Bypass de impresora solo para probar el scroll en Expo Go (sin Bluetooth).
// DEBE quedar en `false` en cualquier build: en `true` el panel dejaría
// "imprimir" sin impresora conectada.
const DEV_SKIP_PRINTER = false;

// Choosing what to print and how many of each. The label itself is rendered by
// the server — layout, QR and printer dialect live there — so this screen only
// ever picks quantities and pipes the bytes it gets back.
export default function LabelPrintSheet({
  visible,
  onClose,
  product,
  variations,
  variationLabel,
  onConnectPrinter,
}: Props) {
  const printer = usePrinter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [printing, setPrinting] = useState(false);
  // Which attribute types (Color, Talla, …) get printed on the sticker — one
  // choice for the whole batch. Only meaningful for variable products; a simple
  // one has no attributes to pick.
  const [printedAttributeIds, setPrintedAttributeIds] = useState<number[]>([]);

  const rows = useMemo<LabelRow[]>(() => {
    if (product.type !== 'variable') {
      return [
        {
          key: 'product',
          title: product.name,
          code: product.code,
          price: product.finalPrice,
          productId: product.id,
          variationId: null,
        },
      ];
    }
    return variations.map((v) => ({
      key: `v${v.id}`,
      title: variationLabel(v),
      code: v.code,
      price: v.finalPrice,
      productId: product.id,
      variationId: v.id,
    }));
  }, [product, variations, variationLabel]);

  // Start from zero every time it opens: reopening with the last batch still
  // filled in is how you print 50 stickers you didn't want.
  useEffect(() => {
    if (visible) {
      setQuantities({});
      // Default to every attribute on — same sticker the batch printed before
      // this control existed. The admin turns off the ones they don't want.
      setPrintedAttributeIds(product.attributes.map((a) => a.id));
    }
  }, [visible, product.attributes]);

  function toggleAttribute(id: number) {
    setPrintedAttributeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  const total = Object.values(quantities).reduce((n, q) => n + q, 0);

  function step(key: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[key] ?? 0) + delta);
      return { ...prev, [key]: next };
    });
  }

  async function handlePrint() {
    const items: LabelRequestItem[] = rows
      .filter((r) => (quantities[r.key] ?? 0) > 0)
      .map((r) => ({
        productId: r.productId,
        variationId: r.variationId,
        quantity: quantities[r.key],
      }));
    if (items.length === 0) return;

    setPrinting(true);
    try {
      // Only send the choice when there are attributes to choose from; a simple
      // product has none, and then the field is meaningless.
      const { payload, encoding } = await fetchLabelPayload(
        items,
        product.attributes.length > 0 ? printedAttributeIds : undefined
      );

      // The server skips a line whose product vanished, so a batch can come
      // back empty. Writing it would "succeed" and print nothing — identical,
      // from the counter, to a broken printer.
      if (!payload) {
        Alert.alert(
          'No hay nada que imprimir',
          'El servidor no generó ninguna etiqueta. Puede que el producto haya cambiado; vuelve a abrir el detalle.'
        );
        return;
      }

      await printer.printPayload(payload, encoding);
      hapticSuccess();
      onClose();
    } catch (e: any) {
      // An Alert, not a line at the bottom of the sheet: with several variations
      // that text sits below the fold, so a failure looked like nothing happened.
      Alert.alert(
        'No se pudo imprimir',
        e?.message ?? 'Revisa que la impresora esté encendida y en rango.'
      );
    } finally {
      setPrinting(false);
    }
  }

  const canPrint = DEV_SKIP_PRINTER || (printer.supported && printer.connected);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Imprimir etiquetas"
      scrollable
      footer={
        canPrint ? (
          <Button
            label={total === 0 ? 'Elige una cantidad' : `Imprimir ${total} etiqueta${total === 1 ? '' : 's'}`}
            icon="print-outline"
            onPress={handlePrint}
            disabled={total === 0}
            loading={printing}
          />
        ) : (
          <Button label="Conectar impresora" icon="bluetooth-outline" onPress={onConnectPrinter} />
        )
      }
    >
      {!DEV_SKIP_PRINTER && !printer.supported ? (
        <Text style={styles.note}>
          Esta versión de la app no puede usar Bluetooth. Instala el build con soporte de impresora
          para imprimir etiquetas.
        </Text>
      ) : !DEV_SKIP_PRINTER && !printer.connected ? (
        <Text style={styles.note}>
          No hay una impresora conectada. Conéctala para imprimir las etiquetas de este producto.
        </Text>
      ) : (
        <>
          {/* Where this is going, said out loud: the same connection prints
              80mm receipts, and a receipt printer would spit out garbage for a
              30x20mm label. */}
          <View style={styles.target}>
            <Ionicons name="print" size={14} color={colors.textSecondary} />
            <Text style={styles.targetText} numberOfLines={1}>
              {printer.device?.name ?? 'Impresora (local)'} · etiqueta {LABEL_SIZE.widthMm}×
              {LABEL_SIZE.heightMm}mm
            </Text>
          </View>

          {/* Which attributes land on the sticker — one choice for the whole
              batch. Off = that attribute is left off every label. Hidden for a
              simple product, which has none. */}
          {product.attributes.length > 0 && (
            <View style={styles.attrBlock}>
              <Text style={styles.attrCaption}>Atributos en la etiqueta</Text>
              <ChipRow>
                {product.attributes.map((a) => (
                  <Chip
                    key={a.id}
                    label={a.name}
                    active={printedAttributeIds.includes(a.id)}
                    onPress={() => toggleAttribute(a.id)}
                  />
                ))}
              </ChipRow>
              {printedAttributeIds.length === 0 && (
                <Text style={styles.attrHint}>
                  La etiqueta saldrá sin atributos: solo nombre, precio y código.
                </Text>
              )}
            </View>
          )}

          {rows.length === 0 ? (
            <Text style={styles.note}>
              Este producto no tiene variaciones todavía. Agrega la primera para poder imprimir sus
              etiquetas.
            </Text>
          ) : (
            rows.map((row, index) => (
              <View key={row.key} style={[styles.row, index > 0 && styles.rowBorder]}>
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={2}>
                    {row.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.code} · {formatPrice(row.price)}
                  </Text>
                </View>
                <QuantityStepper
                  value={quantities[row.key] ?? 0}
                  onDecrement={() => step(row.key, -1)}
                  onIncrement={() => step(row.key, 1)}
                  canDecrement={(quantities[row.key] ?? 0) > 0}
                />
              </View>
            ))
          )}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, paddingVertical: SPACING.md },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingBottom: SPACING.md,
  },
  targetText: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, flexShrink: 1 },
  attrBlock: { marginBottom: SPACING.xs },
  attrCaption: { fontSize: FONT_SIZE.caption, color: colors.textSecondary },
  attrHint: {
    fontSize: FONT_SIZE.micro,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  info: { flex: 1 },
  title: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  meta: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: SPACING.hairline },
});
