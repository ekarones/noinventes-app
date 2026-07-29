import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SIZE, CONTROL_HEIGHT, FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Spoken by screen readers, and shown next to the icon when `label` is set. */
  accessibilityLabel: string;
  /** Renders the button as a labelled pill (the QR button) instead of a circle. */
  label?: string;
  /** Filled with the primary colour — for the one creative action of a screen. */
  primary?: boolean;
  /** Greys the icon/label — for a secondary header action (e.g. "Vaciar"). */
  muted?: boolean;
  /** The filter pills' look: a primary-tinted icon disc (labelled variant only). */
  accent?: boolean;
  disabled?: boolean;
};

// The action button that lives in a screen header. Seller and admin headers ran
// on separate copies of this and had drifted to three different sizes (40, 36,
// 34) — all of them under the 44dp minimum, which is why they needed a hit slop.
export default function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  label,
  primary,
  muted,
  accent,
  disabled,
}: Props) {
  const tint = primary ? colors.textOnPrimary : muted ? colors.textSecondary : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        label ? styles.pill : styles.circle,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {label ? (
        // Labelled: the icon rides its own disc, with the label beside it.
        <View style={[styles.disc, primary && styles.discPrimary, accent && styles.discAccent]}>
          <Ionicons name={icon} size={16} color={tint} />
        </View>
      ) : (
        // Icon-only: the button already IS the circle — a disc inside it would be
        // a circle within a circle.
        <Ionicons name={icon} size={20} color={tint} />
      )}
      {!!label && <Text style={[styles.label, { color: tint }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    height: CONTROL_HEIGHT.pill,
    // Flat: white with a border, matching the search field and filter buttons.
    backgroundColor: colors.surface,
  },
  // Both are fully-rounded pills: icon-only is a circle, the labelled QR a
  // stadium — same as the sort / category / filter buttons it sits beside.
  circle: { width: TOUCH_MIN, borderRadius: RADIUS.pill },
  // The labelled pill hugs its disc on the left, so it pays less padding there.
  pill: { paddingLeft: SPACING.xs, paddingRight: SPACING.md, borderRadius: RADIUS.pill },
  // Circular via RADIUS.pill, never width/2 — resizing it must not un-round it.
  disc: {
    width: SIZE.disc,
    height: SIZE.disc,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // On the filled action the muted grey would read as dirt against the brand red.
  discPrimary: { backgroundColor: colors.primaryLight },
  // The filter pills' primary-tinted disc, so the QR button matches them.
  discAccent: { backgroundColor: colors.primarySoft },
  // The one filled action (e.g. "+ new product") keeps its solid brand fill.
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  label: { fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.bold },
});
