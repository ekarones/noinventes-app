import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { RADIUS, SPACING } from '../theme/tokens';

type Props = {
  children: ReactNode;
  /** Adds the screen's horizontal margin. Omit inside an already-padded parent. */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
};

// The bordered surface that holds a group of rows — the account panels, the
// dashboard's top-products list, the checkout summary. Seven screens had their
// own copy and they had drifted (some carried the screen margin, some didn't).
export default function Card({ children, inset, style }: Props) {
  return <View style={[styles.card, inset && styles.inset, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.lg,
  },
  inset: { marginHorizontal: SPACING.xl },
});
