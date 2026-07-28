import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Props = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Both default to true; pass false to grey the button and block the step. */
  canDecrement?: boolean;
  canIncrement?: boolean;
  /** When given, the count is an editable field (the cart lets you type a number);
   * omit it and the count is display-only text (the product detail just steps). */
  onChangeText?: (text: string) => void;
};

// One control, not two floating buttons around a number: a soft pill holding a
// muted "−", the count, and a muted "+". The cart and the product detail had each
// rolled their own — one with 40px buttons and a typed field, the other with
// bigger buttons and plain text — so a "− 4 +" looked like two different controls
// depending on where you met it.
export default function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
  onChangeText,
}: Props) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.btn, !canDecrement && styles.btnDisabled]}
        onPress={onDecrement}
        disabled={!canDecrement}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Quitar una unidad"
      >
        <View style={styles.circle}>
          <Ionicons name="remove" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {onChangeText ? (
        <TextInput
          style={styles.count}
          value={String(value)}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={4}
        />
      ) : (
        <Text style={styles.count}>{value}</Text>
      )}

      <TouchableOpacity
        style={[styles.btn, !canIncrement && styles.btnDisabled]}
        onPress={onIncrement}
        disabled={!canIncrement}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Agregar una unidad"
      >
        <View style={styles.circle}>
          <Ionicons name="add" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.pill,
    // A muted fill instead of a border, so the stepper reads as a control even
    // sitting on a white card — and so the white discs inside it read as buttons.
    backgroundColor: colors.surfaceMuted,
    // Keeps the discs off the pill's edge.
    paddingHorizontal: SPACING.xs,
  },
  // The tappable area stays the full 44 tall (TOUCH_MIN); the disc inside it is
  // just what you see. Shrinking the button to the disc would put the target
  // under the minimum, and this one gets hammered at the till.
  btn: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.35 },
  circle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No dividers walling it in: the muted signs on either side already read as the
  // buttons, and the count is the only dark thing in the pill.
  count: {
    minWidth: 32,
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.textPrimary,
    paddingVertical: 0,
    paddingHorizontal: SPACING.xs,
  },
});
