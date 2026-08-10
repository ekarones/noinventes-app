import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme } from '../theme/theme';
import { CONTROL_HEIGHT, FONT_FAMILY, RADIUS, SPACING } from '../theme/tokens';

// primary   — the one thing the screen wants you to do (filled brand).
// secondary — a supporting action (soft tint, no border).
// outline   — same weight as secondary but framed; used for sign-out.
// danger    — destructive (framed in red) so it never looks like a default.
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Uses Pressable rather than TouchableOpacity: pressing darkens the button
// instead of fading the whole thing out, which reads as a real press and keeps
// the label legible while the finger is down.
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  style,
}: Props) {
  const v = makeVariants(useTheme())[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: CONTROL_HEIGHT[size],
          borderRadius: RADIUS.pill,
          backgroundColor: pressed ? v.pressedBg : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1.5 : 0,
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'lg' ? 20 : 18} color={v.fg} />}
          <Text style={[styles.label, { color: v.fg, fontSize: size === 'lg' ? 16 : 15 }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const makeVariants = (
  colors: Palette
): Record<ButtonVariant, { bg: string; pressedBg: string; fg: string; border?: string }> => ({
  primary: {
    // The chrome fill: amber for the seller (navy label), navy for the admin
    // (white label) — the same surface as the header bars.
    bg: colors.chromeFill,
    pressedBg: colors.chromeFillPressed,
    fg: colors.onChrome,
  },
  secondary: {
    bg: colors.primarySoft,
    pressedBg: colors.primarySoftPressed,
    fg: colors.primary,
  },
  outline: {
    bg: 'transparent',
    pressedBg: colors.primarySoft,
    fg: colors.primary,
    border: colors.primary,
  },
  danger: {
    bg: 'transparent',
    pressedBg: colors.errorSoft,
    fg: colors.error,
    border: colors.error,
  },
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  label: { fontFamily: FONT_FAMILY.bold },
  disabled: { opacity: 0.45 },
});
