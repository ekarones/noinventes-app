import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Spoken by screen readers, and shown next to the icon when `label` is set. */
  accessibilityLabel: string;
  /** Renders the button as a labelled pill (the QR button) instead of a circle. */
  label?: string;
  /** Filled with the primary colour — for the one creative action of a screen. */
  primary?: boolean;
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
  disabled,
}: Props) {
  const tint = primary ? colors.textOnPrimary : colors.primary;

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
      <Ionicons name={icon} size={label ? 16 : 20} color={tint} />
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
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primarySoft,
  },
  circle: { width: TOUCH_MIN },
  pill: { paddingHorizontal: SPACING.md },
  primary: { backgroundColor: colors.primary },
  disabled: { opacity: 0.5 },
  label: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold },
});
