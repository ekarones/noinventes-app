import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  CONTROL_HEIGHT,
  FONT_SIZE,
  FONT_WEIGHT,
  HIT_SLOP,
  RADIUS,
  ROW_PRESS_OPACITY,
  SPACING,
} from '../theme/tokens';
import BottomSheet, { SheetOption } from './BottomSheet';

export type SelectOption = {
  id: number;
  label: string;
  depth?: number;
  /** Overrides the leading icon for this row; defaults to the pill's own icon. */
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  /** Sheet title, and the label of both the empty pill and the "clear" row. */
  placeholder: string;
  value: number | null;
  options: SelectOption[];
  onChange: (id: number | null) => void;
  /** Lets the caller size the pill — e.g. `flex: 1` to fill a filter row. */
  style?: StyleProp<ViewStyle>;
};

// A pill that opens a bottom-sheet list to pick one option — the filter control
// for a set too long to lay out as chips (categories, branches, sellers). Replaces
// the "select that opens a sheet" that several screens had each hand-rolled, and
// the seller catalogue's chip row that overflowed once the categories grew.
export default function Select({ icon, placeholder, value, options, onChange, style }: Props) {
  const [open, setOpen] = useState(false);
  const active = value != null;
  const selected = active ? options.find((o) => o.id === value) : undefined;

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, active && styles.pillActive, style]}
        onPress={() => setOpen(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <Ionicons name={icon} size={16} color={active ? colors.primary : colors.textSecondary} />
        <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        {active ? (
          // Can't grow to the touch minimum — it lives inside the pill — so it
          // borrows the room around it.
          <TouchableOpacity
            onPress={() => onChange(null)}
            hitSlop={HIT_SLOP}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityLabel={placeholder}
          >
            <Ionicons name="close-circle" size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={placeholder} scrollable>
        <SheetOption
          label={placeholder}
          icon={icon}
          active={value == null}
          onPress={() => {
            onChange(null);
            setOpen(false);
          }}
        />
        {options.map((o) => (
          <SheetOption
            key={o.id}
            label={o.label}
            depth={o.depth}
            icon={o.icon ?? icon}
            active={value === o.id}
            onPress={() => {
              onChange(o.id);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text: { flex: 1, fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
  textActive: { color: colors.primary },
});
