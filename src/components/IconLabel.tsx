import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, SPACING } from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  /** Colours both icon and text — the variation label reads in the primary tint. */
  tint?: string;
};

// A fact with its icon, for the dense rows the app is built from: the customer,
// the seller, the branch, the variation, the time. Small and borderless — a fact,
// not a status; a level or a state gets a badge with a fill instead.
export default function IconLabel({ icon, text, tint }: Props) {
  const color = tint ?? colors.textSecondary;

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// Lays several of them out on one line.
export function IconLabelRow({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  // flexShrink lets a long branch name give way instead of pushing the row wide.
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexShrink: 1 },
  text: { fontSize: FONT_SIZE.caption },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    // Wrap rather than truncate. Squeezed onto one line, a long category and the
    // stock beside it both shrink until they read "Medias & ca.  8 di…" and touch;
    // dropping the second one to its own line costs a few pixels of height and
    // keeps both legible.
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.hairline,
  },
});
