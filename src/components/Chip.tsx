import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

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
// of the row rather than tinted in place.
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.rowBox}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  row: { gap: SPACING.sm },
  chip: {
    // Same height as the sort/clear pills it sits under, and clears the 44dp
    // minimum on its own — no hit slop reaching outside the chip.
    height: CONTROL_HEIGHT.pill,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    // Muted at rest so the chips read as one row of options on the white track;
    // the selected one turns white with a primary frame, lifting out of the row.
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.surface, borderColor: colors.primary },
  text: {
    fontSize: FONT_SIZE.bodySm,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textSecondary,
  },
  textActive: { color: colors.primary },
});
