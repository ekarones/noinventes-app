import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FONT_FAMILY, FONT_SIZE, RADIUS, SPACING } from '../theme/tokens';

// The product code as a neutral grey chip — the sibling of the colour-coded
// StockBadge. The two ride together (a catalogue card, the detail summary): same
// shape, only the colour telling them apart. `flexShrink` lets a long code
// truncate rather than push the stock badge out of a narrow column.
export default function CodeBadge({ code }: { code: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text} numberOfLines={1}>
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexShrink: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
    backgroundColor: colors.surfaceMuted,
  },
  text: { fontFamily: FONT_FAMILY.medium, fontSize: FONT_SIZE.badge, color: colors.textSecondary },
});
