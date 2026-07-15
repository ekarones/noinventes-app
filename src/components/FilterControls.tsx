import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import BottomSheet, { SheetOption } from './BottomSheet';

// A sort preset as far as this control is concerned: what the user sees. Callers
// keep their own extra fields (sortBy/sortDir) on the same objects and read them
// back by index, so this stays agnostic of the endpoint being sorted.
export type SortChoice = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type SortControlProps = {
  options: SortChoice[];
  index: number;
  onChange: (index: number) => void;
};

// The "Ordenar" pill plus its bottom-sheet picker. Every list screen (catalog,
// sales history, admin lists) uses this, so they look and behave identically.
export function SortControl({ options, index, onChange }: SortControlProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        onPress={() => setOpen(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Ordenar"
      >
        <Ionicons name="swap-vertical" size={16} color={colors.primary} />
        <Text style={styles.pillText}>Ordenar</Text>
      </TouchableOpacity>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Ordenar por">
        {options.map((opt, i) => (
          <SheetOption
            key={opt.key}
            label={opt.label}
            icon={opt.icon}
            active={i === index}
            onPress={() => {
              onChange(i);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}

// "Limpiar" pill — same shape as the sort one. Screens render it only while a
// filter is actually active.
export function ClearFiltersButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={onPress}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityLabel="Limpiar filtros"
    >
      <Ionicons name="close" size={16} color={colors.primary} />
      <Text style={styles.pillText}>Limpiar</Text>
    </TouchableOpacity>
  );
}

// One shared pill style, so the two controls cannot drift apart.
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.pill,
  },
  pillText: {
    color: colors.primary,
    fontSize: FONT_SIZE.bodySm,
    fontWeight: FONT_WEIGHT.bold,
  },
});
