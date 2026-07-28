import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { FONT_SIZE, HIT_SLOP, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import { hapticAdd } from '../utils/haptics';

type Props = {
  code: string;
  /** Colours icon and text — defaults to the secondary tint an `IconLabel` uses. */
  tint?: string;
  /** What the toast calls it: "Código copiado" vs "Código de variación copiado". */
  label?: string;
};

// A product / variation code you can tap to copy. Reads exactly like the
// `IconLabel` it replaces — a fact, not a control — with a copy glyph after it as
// the only hint that it is tappable.
//
// HIT_SLOP rather than a TOUCH_MIN-tall box: this is an inline caption inside a
// title block and a variation card, and growing it to 44pt would open a gap above
// the name in both.
export default function CopyableCode({ code, tint, label = 'Código' }: Props) {
  const { showToast } = useToast();
  const color = tint ?? colors.textSecondary;

  async function copy() {
    await Clipboard.setStringAsync(code);
    hapticAdd();
    showToast(`${label} copiado`, 'copy-outline');
  }

  return (
    <TouchableOpacity
      onPress={copy}
      hitSlop={HIT_SLOP}
      style={styles.row}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={`Copiar ${label.toLowerCase()} ${code}`}
    >
      <Ionicons name="barcode-outline" size={12} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {code}
      </Text>
      <Ionicons name="copy-outline" size={12} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // alignSelf keeps the tappable area to the code itself instead of the full row
  // width — tapping the empty space beside it shouldn't copy.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    flexShrink: 1,
  },
  text: { fontSize: FONT_SIZE.caption, flexShrink: 1 },
});
