import { StyleSheet, Text, View } from 'react-native';
import { FONT_FAMILY } from '../theme/tokens';

type Props = {
  stock: number;
};

// The stock level as a chip (5a): the count + "uds." on a soft status fill, or
// "Sin stock" at zero. The fill makes it read as a status at a glance — normal
// (grey), low (amber) or out (red).
function level(stock: number) {
  if (stock <= 0) return { bg: '#fdece8', fg: '#c22f0c', label: 'Sin stock' };
  if (stock < 10) return { bg: '#fff3cf', fg: '#8a6400', label: `${stock} uds.` };
  return { bg: '#f1f3f7', fg: 'rgba(22, 33, 58, 0.6)', label: `${stock} uds.` };
}

export default function StockBadge({ stock }: Props) {
  const { bg, fg, label } = level(stock);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  text: { fontSize: 10.5, fontFamily: FONT_FAMILY.black },
});
