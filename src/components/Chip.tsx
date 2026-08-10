import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ReactNode } from 'react';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

// A filter chip. Both roles filter their lists the same way (category, status,
// date range, role), so this is one component — it existed as five identical
// copies, one per screen.
export default function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// The horizontal strip the chips live in: a white track holding them, so the
// muted chips have something to sit on and the selected one reads as lifted out
// of the row rather than tinted in place. `bare` drops that track — for when the
// chips already sit on a white panel (the admin catalogue's filter band).
export function ChipRow({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const scroll = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children}
    </ScrollView>
  );
  return bare ? scroll : <View style={styles.rowBox}>{scroll}</View>;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  // The track. `marginVertical` replaces the padding the strip used to carry, so
  // the gap to the search bar above and the filters below is unchanged.
  rowBox: {
    backgroundColor: colors.surface,
    // RADIUS.card, same as the dashboard panels — the track is a panel holding
    // controls, not a control itself.
    borderRadius: RADIUS.card,
    // Same padding as the dashboard cards (SPACING.sm).
    padding: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  row: { gap: 7 },
  // 5a: a compact bordered chip. Filled in the role's chrome colour when active.
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.chromeFill, borderColor: colors.chromeFill },
  text: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.black,
    color: 'rgba(22, 33, 58, 0.6)',
  },
  textActive: { color: colors.onChrome },
});
