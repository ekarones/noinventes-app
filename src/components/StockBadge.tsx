import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../theme/tokens';
import { stockColor, stockSoftColor } from '../utils/stock';

type Props = {
  stock: number;
};

// The stock level as a badge: the cube icon and the count, nothing more. It is the
// one number in a catalogue row that has a colour, and colour on plain text is easy
// to miss against the greys around it — on a fill it reads as a status at a glance,
// which is what a stock level is. The icon already says these are units, so no
// "disp." / "uds." label spells it out.
export default function StockBadge({ stock }: Props) {
  const color = stockColor(stock);

  return (
    <View style={[styles.badge, { backgroundColor: stockSoftColor(stock) }]}>
      <Ionicons name="cube-outline" size={12} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {Math.max(0, stock)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
  },
  text: { fontSize: FONT_SIZE.badge, fontWeight: FONT_WEIGHT.bold },
});
