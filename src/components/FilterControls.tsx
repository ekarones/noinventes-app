import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
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
  /** Names the sort in effect. A list is always sorted by something, so there is
   *  nothing to clear — the chevron stays. */
  showSelection?: boolean;
  /** Lets the caller size the pill — e.g. `flex: 1` to share a filter row. */
  style?: StyleProp<ViewStyle>;
};

// The "Ordenar" pill plus its bottom-sheet picker. Every list screen (catalog,
// sales history, admin lists) uses this, so they look and behave identically.
export function SortControl({ options, index, onChange, showSelection, style }: SortControlProps) {
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const active = !!showSelection;
  const label = (active && options[index]?.label) || 'Ordenar';

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, style]}
        onPress={() => setOpen(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Ordenar"
      >
        {/* 5a: a leading sort glyph, then the active preset — a bordered control
            that matches the category Select beside it. */}
        <Ionicons name="swap-vertical" size={15} color="rgba(22, 33, 58, 0.5)" />
        <Text style={styles.pillText} numberOfLines={1}>
          {label}
        </Text>
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

// Mirrors the category `Select`: white with a transparent border, rounded, the
// label on the left and the primary-tinted icon disc on the right.
const makeStyles = (colors: Palette) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
  },
  pillText: {
    flex: 1,
    color: colors.primary,
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.extrabold,
  },
});
