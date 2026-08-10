import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import {
  SIZE,
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
  /** The catalogue filters' look ("estilo filtro"): the label on the left and the
   *  icon on a primary-tinted disc on the right (a × to clear when active). No
   *  pill tint on active. */
  accent?: boolean;
  /** The "botón bordeado" grey border instead of the transparent one (accent). */
  bordered?: boolean;
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
  accent,
  bordered,
  accessibilityLabel,
}: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tint = active ? colors.primary : colors.textSecondary;

  // "Estilo filtro": label on the left, the icon on a primary disc on the right —
  // and, when the pill carries a value, that disc becomes a × to clear it.
  if (accent) {
    return (
      <TouchableOpacity
        style={[styles.pill, styles.pillAccent, bordered && styles.pillBordered]}
        onPress={onPress}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        <Text style={styles.text} numberOfLines={1}>
          {label}
        </Text>
        {active && onClear ? (
          <TouchableOpacity
            style={styles.disc}
            onPress={onClear}
            hitSlop={HIT_SLOP}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityLabel="Quitar filtro"
          >
            <Ionicons name="close" size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.disc}>
            <Ionicons name={icon} size={16} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  }

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

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  // "Estilo filtro": the disc hugs the right edge, so the right padding shrinks.
  pillAccent: { paddingRight: SPACING.xs },
  // "Botón bordeado": the grey border instead of the transparent one.
  pillBordered: { borderColor: colors.border },
  // Circular via RADIUS.pill — a soft primary fill behind the primary icon.
  disc: {
    width: SIZE.disc,
    height: SIZE.disc,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.medium, color: colors.textSecondary },
  textActive: { color: colors.primary },
});
