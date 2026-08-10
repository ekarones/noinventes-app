import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_SIZE, FONT_FAMILY, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import BottomSheet from './BottomSheet';
import Button from './Button';
import Chip from './Chip';
import type { AttributeValue } from '../types';

// Anything with an attribute combo: the seller's `Variation` and the admin's
// `AdminVariation` both qualify, which is the point — one filter, two screens.
type HasAttributes = { attributeValues: AttributeValue[] };

type Attribute = { id: number; name: string; values: string[] };

export type VariationFilterState<T> = {
  attributes: Attribute[];
  /** The variations left after filtering — render these, not the raw list. */
  shown: T[];
  /** How many values are ticked, across every attribute. */
  count: number;
  filters: Record<number, string[]>;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: (attrId: number, value: string) => void;
  clear: () => void;
};

// Filters a product's variations by their attribute values. Lives here rather
// than in a screen because both product details — the seller's and the admin's —
// need the same thing over the same shape.
export function useVariationFilter<T extends HasAttributes>(
  variations: T[]
): VariationFilterState<T> {
  // attribute id → the values kept.
  const [filters, setFilters] = useState<Record<number, string[]>>({});
  const [open, setOpen] = useState(false);

  // The distinct attributes across the variations and the values each takes — the
  // options offered by the filter (e.g. Color: Rojo, Azul · Talla: M, L).
  const attributes = useMemo(() => {
    const byId = new Map<number, Attribute>();
    for (const v of variations) {
      for (const av of v.attributeValues) {
        let attr = byId.get(av.attribute.id);
        if (!attr) {
          attr = { id: av.attribute.id, name: av.attribute.name, values: [] };
          byId.set(av.attribute.id, attr);
        }
        if (!attr.values.includes(av.value)) attr.values.push(av.value);
      }
    }
    return [...byId.values()];
  }, [variations]);

  const activeFilters = useMemo(
    () =>
      Object.entries(filters)
        .filter(([, vals]) => vals.length > 0)
        .map(([id, vals]) => [Number(id), vals] as const),
    [filters]
  );
  const count = activeFilters.reduce((n, [, vals]) => n + vals.length, 0);

  // A variation survives if, for every filtered attribute, one of its values is
  // kept (OR within an attribute, AND across attributes).
  const shown = useMemo(() => {
    if (activeFilters.length === 0) return variations;
    return variations.filter((v) =>
      activeFilters.every(([attrId, vals]) =>
        v.attributeValues.some((av) => av.attribute.id === attrId && vals.includes(av.value))
      )
    );
  }, [variations, activeFilters]);

  function toggle(attrId: number, value: string) {
    setFilters((cur) => {
      const vals = cur[attrId] ?? [];
      return {
        ...cur,
        [attrId]: vals.includes(value) ? vals.filter((x) => x !== value) : [...vals, value],
      };
    });
  }

  return { attributes, shown, count, filters, open, setOpen, toggle, clear: () => setFilters({}) };
}

// The "Filtrar" pill and its sheet, driven by the hook above. Render it only when
// `state.attributes` is non-empty — with nothing to filter by there is no control
// to show.
export default function VariationFilter<T>({ state }: { state: VariationFilterState<T> }) {
  const { attributes, count, filters, open, setOpen, toggle, clear } = state;
  const styles = useThemedStyles(makeStyles);

  return (
    <>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => setOpen(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Filtrar variantes"
      >
        {/* 5a: a leading filter glyph, then the label — a bordered white control
            matching the catalogue's sort/category controls. */}
        <Ionicons name="options-outline" size={15} color="rgba(22, 33, 58, 0.5)" />
        <Text style={styles.btnText} numberOfLines={1}>
          {count > 0 ? `Filtros · ${count}` : 'Filtrar'}
        </Text>
      </TouchableOpacity>

      {/* One group of toggle chips per attribute. */}
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Filtrar variantes"
        scrollable
        footer={
          count > 0 ? (
            <Button label="Limpiar filtros" variant="secondary" icon="close" onPress={clear} />
          ) : undefined
        }
      >
        {attributes.map((attr) => (
          <View key={attr.id} style={styles.group}>
            <Text style={styles.groupName}>{attr.name}</Text>
            <View style={styles.chips}>
              {attr.values.map((val) => (
                <Chip
                  key={val}
                  label={val}
                  active={(filters[attr.id] ?? []).includes(val)}
                  onPress={() => toggle(attr.id, val)}
                />
              ))}
            </View>
          </View>
        ))}
      </BottomSheet>
    </>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  // A bordered white control (5a): a leading glyph + the label, sized to content.
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  btnText: { flexShrink: 1, fontSize: 13.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
  group: { marginBottom: SPACING.lg },
  groupName: {
    fontSize: FONT_SIZE.bodySm,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
