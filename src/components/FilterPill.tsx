import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  CONTROL_HEIGHT,
  FONT_SIZE,
  FONT_FAMILY,
  HIT_SLOP,
  RADIUS,
  ROW_PRESS_OPACITY,
  SPACING,
} from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  /** When active, shows a trailing "×" that clears the filter. Omit for a pill
   *  that isn't clearable. */
  onClear?: () => void;
  /** A trailing chevron when NOT active — the affordance of a picker that opens a
   *  sheet. Date pills leave it off (they open the OS date dialog). */
  chevron?: boolean;
  accessibilityLabel?: string;
};

// The flat filter pill the sales history and the dashboards all use: a rounded
// surface holding an icon, a label, and either a clear "×" (when it carries a
// value) or a picker chevron. It was hand-rolled three times — `dateBtn`,
// `scopeChip`, `branchSelect` — with copy-pasted styles.
export default function FilterPill({
  icon,
  label,
  active,
  onPress,
  onClear,
  chevron,
  accessibilityLabel,
}: Props) {
  const tint = active ? colors.primary : colors.textSecondary;
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Ionicons name={icon} size={16} color={tint} />
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {label}
      </Text>
      {active && onClear ? (
        // Can't grow to the touch minimum — it lives inside the pill — so it
        // borrows the room around it with a hit slop.
        <TouchableOpacity
          onPress={onClear}
          hitSlop={HIT_SLOP}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityLabel="Quitar filtro"
        >
          <Ionicons name="close-circle" size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : chevron ? (
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  // Selected: primary frame + soft fill, like the catalogue's category filter.
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text: { flex: 1, fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.medium, color: colors.textSecondary },
  textActive: { color: colors.primary },
});
