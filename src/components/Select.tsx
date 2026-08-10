import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';
import BottomSheet, { SheetOption } from './BottomSheet';

// The id is generic so the same control drives a category picker (numeric ids)
// and a payment-method picker (string codes like 'cash').
export type SelectOption<T extends number | string = number> = {
  id: T;
  label: string;
  depth?: number;
  /** Overrides the leading icon for this row; defaults to the pill's own icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** A trailing count on the sheet row (e.g. products per category). */
  count?: string;
};

type Props<T extends number | string> = {
  icon: keyof typeof Ionicons.glyphMap;
  /** Sheet title, and the label of both the empty pill and the "clear" row. */
  placeholder: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (id: T | null) => void;
  /** Lets the caller size the control — e.g. `flex: 1` to fill a filter row. */
  style?: StyleProp<ViewStyle>;
  /** A required choice (no "none" row): reads as a plain combo box. */
  mandatory?: boolean;
};

// A bordered control (5a) that opens a bottom-sheet list to pick one option — the
// filter for a set too long for chips (categories, branches, payment methods).
// Clearing is done from the sheet's first row, so the trigger stays a plain
// label + chevron.
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
  const styles = useThemedStyles(makeStyles);
  const selected = value != null ? options.find((o) => o.id === value) : undefined;

  return (
    <>
      <TouchableOpacity
        style={[styles.control, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <Text style={styles.text} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="rgba(22, 33, 58, 0.45)" />
      </TouchableOpacity>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={placeholder} scrollable>
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
            count={o.count}
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    control: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 42,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    text: { flex: 1, fontSize: 13.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
  });
