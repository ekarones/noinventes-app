import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

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

// The horizontal strip the chips live in.
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACING.sm, paddingVertical: SPACING.sm, paddingRight: SPACING.sm },
  chip: {
    // Same height as the sort/clear pills it sits under, and clears the 44dp
    // minimum on its own — no hit slop reaching outside the chip.
    height: CONTROL_HEIGHT.pill,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: {
    fontSize: FONT_SIZE.bodySm,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.textSecondary,
  },
  textActive: { color: colors.textOnPrimary },
});
