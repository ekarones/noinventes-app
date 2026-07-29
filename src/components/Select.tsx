import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SIZE,
  CONTROL_HEIGHT,
  FONT_SIZE,
  FONT_FAMILY,
  HIT_SLOP,
  RADIUS,
  ROW_PRESS_OPACITY,
  SPACING,
} from '../theme/tokens';
import BottomSheet, { SheetOption } from './BottomSheet';

// The id is generic so the same control drives both a category picker (numeric
// ids) and a payment-method picker (string codes like 'cash').
export type SelectOption<T extends number | string = number> = {
  id: T;
  label: string;
  depth?: number;
  /** Overrides the leading icon for this row; defaults to the pill's own icon. */
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props<T extends number | string> = {
  icon: keyof typeof Ionicons.glyphMap;
  /** Sheet title, and the label of both the empty pill and the "clear" row. */
  placeholder: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (id: T | null) => void;
  /** Lets the caller size the pill — e.g. `flex: 1` to fill a filter row. */
  style?: StyleProp<ViewStyle>;
  /** A required choice (e.g. a dashboard period): no "none" row and no clear ×,
   *  so it reads as a plain combo box rather than a clearable filter. `value` is
   *  always one of the options and `onChange` never fires with `null`. */
  mandatory?: boolean;
};

// A pill that opens a bottom-sheet list to pick one option — the filter control
// for a set too long to lay out as chips (categories, branches, sellers, payment
// methods). Replaces the "select that opens a sheet" that several screens had each
// hand-rolled, and the seller catalogue's chip row that overflowed once the
// categories grew.
export default function Select<T extends number | string>({
  icon,
  placeholder,
  value,
  options,
  onChange,
  style,
  mandatory,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  // A mandatory select always holds a value, so it never takes the clear
  // affordance — it's a neutral picker. Only the × / chevron depends on this.
  const active = value != null && !mandatory;
  const selected = value != null ? options.find((o) => o.id === value) : undefined;

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, style]}
        onPress={() => setOpen(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        {/* Every filter across the app wears the same look — a primary-tinted icon
            disc on a neutral pill — so a set filter reads by its label and ×, not
            by a colour change of the whole control. */}
        <View style={[styles.disc, styles.discAccent]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text style={styles.text} numberOfLines={1}>
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
        {/* The "none" row only makes sense for a clearable filter. */}
        {!mandatory && (
          <SheetOption
            label={placeholder}
            icon={icon}
            active={value == null}
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        )}
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
    // The disc brings its own visual margin, so the left padding shrinks.
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.pill,
    // A transparent border keeps the pill the same size as the bordered controls
    // it sits beside (the search field), so the header row lines up.
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  // Circular via RADIUS.pill, never width/2 — a soft primary fill behind the glyph.
  disc: {
    width: SIZE.disc,
    height: SIZE.disc,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discAccent: { backgroundColor: colors.primarySoft },
  text: { flex: 1, fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.medium, color: colors.textSecondary },
});
