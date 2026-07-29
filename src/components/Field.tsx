import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_FAMILY, RADIUS, SPACING } from '../theme/tokens';

type Props = TextInputProps & {
  label?: string;
  /** Explanatory line under the field. */
  hint?: string;
  /** Validation message. Replaces the hint and turns the field red. */
  error?: string;
  /** Leading icon inside the field (e.g. the person/tag icons at checkout). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Trailing control inside the field (e.g. a show-password toggle). */
  accessory?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

// A labelled text field. Every form in the app used to hand-roll this, which is
// why the inputs had drifted (two heights, two radii) and — except on the login
// screen — gave no feedback at all when focused.
export default function Field({
  label,
  hint,
  error,
  icon,
  accessory,
  containerStyle,
  style,
  ...input
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
          // A multiline field grows, so it can't be pinned to the control height.
          input.multiline && styles.fieldMultiline,
        ]}
      >
        {!!icon && <Ionicons name={icon} size={20} color={colors.textSecondary} />}

        <TextInput
          {...input}
          // Android otherwise centres the text vertically in a grown field.
          textAlignVertical={input.multiline ? 'top' : undefined}
          style={[styles.input, input.multiline && styles.inputMultiline, style]}
          placeholderTextColor={colors.textSecondary}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />

        {accessory}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        !!hint && <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Owns the gap to whatever follows, so stacked fields space themselves and
  // screens don't each pick their own margin (they'd picked 8 and 18).
  container: { marginBottom: SPACING.lg },
  label: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.input,
    // Transparent until focused, so gaining the border doesn't shift the layout.
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldFocused: {
    borderColor: colors.borderFocused,
    backgroundColor: colors.surface,
  },
  fieldError: { borderColor: colors.error },
  fieldMultiline: {
    height: undefined,
    minHeight: 90,
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    // A tall box can't be a pill — that would bow its sides into a stadium — so a
    // multiline field keeps the moderate control radius.
    borderRadius: RADIUS.control,
  },
  input: { fontFamily: FONT_FAMILY.regular,
    flex: 1,
    height: '100%',
    fontSize: FONT_SIZE.subheading,
    color: colors.textPrimary,
  },
  inputMultiline: { height: undefined, minHeight: 66 },
  hint: { fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.micro,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 17,
  },
  error: { fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.caption,
    color: colors.error,
    marginTop: SPACING.sm,
  },
});
