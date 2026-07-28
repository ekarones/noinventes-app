import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
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
  /** Names the sort in effect and frames the pill in primary. A list is always
   *  sorted by something, so there is nothing to clear — the chevron stays. */
  showSelection?: boolean;
  /** Lets the caller size the pill — e.g. `flex: 1` to share a filter row. */
  style?: StyleProp<ViewStyle>;
};

// The "Ordenar" pill plus its bottom-sheet picker. Every list screen (catalog,
// sales history, admin lists) uses this, so they look and behave identically.
export function SortControl({ options, index, onChange, showSelection, style }: SortControlProps) {
  const [open, setOpen] = useState(false);
  const active = !!showSelection;
  const tint = active ? colors.primary : colors.textSecondary;
  const label = (active && options[index]?.label) || 'Ordenar';

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, active && styles.pillActive, style]}
        onPress={() => setOpen(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Ordenar"
      >
        <View style={[styles.disc, active && styles.discActive]}>
          <Ionicons name="swap-vertical" size={16} color={tint} />
        </View>
        <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={tint} />
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
      <View style={styles.disc}>
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </View>
      <Text style={styles.pillText}>Limpiar</Text>
    </TouchableOpacity>
  );
}

// One shared pill style, so the two controls cannot drift apart. It mirrors the
// category `Select`: white with a border, rounded to `control`, grey icon + label.
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    // The disc brings its own visual margin, so the left padding shrinks.
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.pill,
    // Transparent at rest (no visible line); the active state frames it in primary
    // without shifting its size — same as the category Select.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  // Circular via RADIUS.pill, never width/2. Muted at rest; turns white once the
  // pill takes its soft fill, so the disc keeps reading against it.
  disc: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discActive: { backgroundColor: colors.surface },
  pillText: {
    // Fills the pill so a trailing chevron pins to the right when the control is
    // stretched (flex:1); harmless when the pill sizes to its content.
    flex: 1,
    color: colors.textSecondary,
    fontSize: FONT_SIZE.bodySm,
    fontWeight: FONT_WEIGHT.medium,
  },
  pillTextActive: { color: colors.primary },
});
