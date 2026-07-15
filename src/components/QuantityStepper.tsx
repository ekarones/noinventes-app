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

// One control, not two floating buttons around a number: a bordered pill with the
// count walled off in the middle by dividers. The cart and the product detail had
// each rolled their own — one with 40px buttons and a typed field, the other with
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
        <Ionicons name="remove" size={18} color={colors.textPrimary} />
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
        <Ionicons name="add" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // overflow:hidden keeps the buttons inside the rounded corners.
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  btn: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.35 },
  count: {
    minWidth: 44,
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    paddingVertical: 0,
    paddingHorizontal: SPACING.xs,
    // The count reads as part of the pill, divided from the buttons.
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
});
