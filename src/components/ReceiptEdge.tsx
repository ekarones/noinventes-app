import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { RADIUS } from '../theme/tokens';

// Radius of one bite. The row is only as tall as that, so the circles are cut in
// half by the container and read as notches punched out of the panel's edge.
const R = 6;
const PITCH = R * 2 + 6; // one notch plus the gap to the next

// The torn edge of a paper ticket: a row of half-circles bitten out of the top of
// a surface. Sits as the first child of the panel it belongs to — the notches are
// filled with the page background, so the panel has to be `surface` for the bite
// to read.
export default function ReceiptEdge() {
  // Measured rather than taken from the window: the panel this sits in is inset
  // from the screen edge, so the window width would over-count the notches.
  const [width, setWidth] = useState(0);
  const count = Math.max(1, Math.floor(width / PITCH));

  return (
    <View
      style={styles.row}
      pointerEvents="none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 &&
        Array.from({ length: count }, (_, i) => <View key={i} style={styles.notch} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  // Half a notch tall + overflow hidden: only the lower half of each circle shows.
  row: {
    height: R,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  notch: {
    width: R * 2,
    height: R * 2,
    marginTop: -R,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.background,
  },
});
