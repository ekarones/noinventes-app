import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FONT_FAMILY, FONT_SIZE, RADIUS, SPACING } from '../theme/tokens';

// A small rounded neutral-grey pill for a short label sitting under a title in a
// list row — a sold variation ("Blanco · M"), a payment method ("Yape"). Muted
// (secondary) so it labels without competing. `alignSelf` so it hugs its text
// instead of stretching the column.
export default function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.hairline,
    borderRadius: RADIUS.badge,
    backgroundColor: colors.surfaceMuted,
  },
  text: { fontSize: FONT_SIZE.micro, fontFamily: FONT_FAMILY.medium, color: colors.textSecondary },
});
