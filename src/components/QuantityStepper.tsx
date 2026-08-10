import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

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
  /** ~Half the size — for a dense list like the cart. */
  compact?: boolean;
};

// One control (5a): a soft grey track holding a white "−" button, the count, and a
// white "+" button. The cart and the product detail share it.
export default function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
  onChangeText,
  compact,
}: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const iconSize = compact ? 17 : 20;

  return (
    <View style={[styles.track, compact && styles.trackCompact]}>
      <TouchableOpacity
        style={[styles.btn, compact && styles.btnCompact, !canDecrement && styles.btnDisabled]}
        onPress={onDecrement}
        disabled={!canDecrement}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Quitar una unidad"
      >
        <Ionicons name="remove" size={iconSize} color={colors.primary} />
      </TouchableOpacity>

      {onChangeText ? (
        <TextInput
          style={[styles.count, compact && styles.countCompact]}
          value={String(value)}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={4}
        />
      ) : (
        <Text style={[styles.count, compact && styles.countCompact]}>{value}</Text>
      )}

      <TouchableOpacity
        style={[styles.btn, compact && styles.btnCompact, !canIncrement && styles.btnDisabled]}
        onPress={onIncrement}
        disabled={!canIncrement}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Agregar una unidad"
      >
        <Ionicons name="add" size={iconSize} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.fill,
      borderRadius: 14,
      padding: 4,
    },
    trackCompact: { borderRadius: 12 },
    btn: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnCompact: { width: 30, height: 30, borderRadius: 9 },
    btnDisabled: { opacity: 0.4 },
    count: {
      minWidth: 38,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: FONT_FAMILY.black,
      color: colors.primary,
      paddingVertical: 0,
      paddingHorizontal: 4,
    },
    countCompact: { minWidth: 30, fontSize: 14 },
  });
