import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type Props = { style?: StyleProp<ViewStyle> };

// A dashed rule — the separator of the "receipt" look (cart lines, totals).
//
// Android only renders `borderStyle: 'dashed'` when every side has the same
// width: a lone `borderBottomWidth` comes out solid there. So the dashes are
// drawn by a 2px box with a full border, clipped by a 1px parent to leave just
// the top edge showing.
export default function DashedLine({ style }: Props) {
  return (
    <View style={[styles.clip, style]}>
      <View style={styles.dashes} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { height: 1, overflow: 'hidden' },
  dashes: { height: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
});
