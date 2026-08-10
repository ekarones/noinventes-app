import { StyleSheet, Text, View } from 'react-native';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';

// The product code as a neutral chip (5a) — the sibling of the colour-coded
// StockBadge. `flexShrink` lets a long code truncate rather than push the stock
// badge out of a narrow column.
export default function CodeBadge({ code }: { code: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.badge}>
      <Text style={styles.text} numberOfLines={1}>
        {code}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    badge: {
      flexShrink: 1,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.fill,
    },
    text: { fontFamily: FONT_FAMILY.black, fontSize: 10.5, color: 'rgba(22, 33, 58, 0.6)' },
  });
