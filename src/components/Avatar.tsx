import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, TOUCH_MIN } from '../theme/tokens';

type Size = 'sm' | 'md' | 'lg';

type Props = {
  /** The person's full name; only the first letter is drawn. */
  name?: string | null;
  /** sm — inside a card row. md — a tappable header button. lg — a profile page. */
  size?: Size;
  /** When given, the avatar becomes a button. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** To re-tint the circle — the user list darkens it for admins. */
  style?: StyleProp<ViewStyle>;
};

// The initial-in-a-circle that stands in for a person: the header button on both
// dashboards, the rows of the user list and the seller breakdown, the profile
// pages. Six hand-rolled copies had drifted to four different diameters (88, 46,
// 44 and 38) — one of them, in a card row, was 2px off the icon box beside it.
export default function Avatar({ name, size = 'md', onPress, accessibilityLabel, style }: Props) {
  const circle = [styles.circle, CIRCLE[size], style];
  const body = <Text style={[styles.text, TEXT[size]]}>{name?.charAt(0).toUpperCase() ?? '?'}</Text>;

  if (onPress) {
    return (
      <TouchableOpacity
        style={circle}
        onPress={onPress}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {body}
      </TouchableOpacity>
    );
  }

  return <View style={circle}>{body}</View>;
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // sm matches the 40px icon box it sits alongside in the dashboard breakdowns;
  // md is the minimum touch target, since at that size it is always a button.
  sm: { width: 40, height: 40 },
  md: { width: TOUCH_MIN, height: TOUCH_MIN },
  lg: { width: 88, height: 88 },
  text: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.bold },
  textSm: { fontSize: FONT_SIZE.subheading },
  textMd: { fontSize: FONT_SIZE.heading },
  textLg: { fontSize: FONT_SIZE.avatar },
});

const CIRCLE = { sm: styles.sm, md: styles.md, lg: styles.lg } as const;
const TEXT = { sm: styles.textSm, md: styles.textMd, lg: styles.textLg } as const;
