import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** A picker: caps the sheet at 70% and scrolls its rows. */
  scrollable?: boolean;
  /** A form: lifts the sheet above the keyboard. Tapping a field must not
   *  dismiss the sheet, so the backdrop becomes a separate tap target. */
  keyboardAware?: boolean;
  /** Pinned below the scroll area (e.g. the "Listo" button of a multi-select). */
  footer?: ReactNode;
  children: ReactNode;
};

// The bottom sheet used by every picker and inline form in the app. Owns the
// backdrop, the drag handle, the corner radius and the safe-area bottom padding
// so those can't drift apart across screens (they already had, at four different
// backdrop opacities).
export default function BottomSheet({
  visible,
  onClose,
  title,
  scrollable,
  keyboardAware,
  footer,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const sheetStyle = [
    styles.sheet,
    { paddingBottom: insets.bottom + SPACING.md },
    scrollable && styles.sheetCapped,
  ];

  const body = (
    <>
      <View style={styles.handle} />
      <Text style={styles.title}>{title}</Text>
      {scrollable ? <ScrollView>{children}</ScrollView> : children}
      {footer}
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Only the area above the sheet dismisses it — a tap inside a field
              must not close the form. */}
          <Pressable style={styles.overlayFill} onPress={onClose} />
          <View style={sheetStyle}>{body}</View>
        </KeyboardAvoidingView>
      ) : (
        <Pressable style={styles.overlay} onPress={onClose}>
          {/* An empty onPress swallows the tap so it doesn't reach the backdrop. */}
          <Pressable style={sheetStyle} onPress={() => {}}>
            {body}
          </Pressable>
        </Pressable>
      )}
    </Modal>
  );
}

// A selectable row inside a `scrollable` sheet.
export function SheetOption({
  label,
  active,
  onPress,
  depth = 0,
  multi,
  hint,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  /** Nesting level, for tree-shaped options like the category hierarchy. */
  depth?: number;
  /** Multi-select: a leading checkbox instead of a trailing checkmark, and the
   *  sheet stays open. */
  multi?: boolean;
  /** Secondary line under the label (e.g. an attribute's values). */
  hint?: string;
  /** Leading icon (e.g. the sort presets). Ignored in `multi`, which owns that slot. */
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        depth > 0 && { paddingLeft: depth * SPACING.lg },
        pressed && styles.optionPressed,
      ]}
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'button'}
      accessibilityState={multi ? { checked: active } : { selected: active }}
    >
      {multi ? (
        <Ionicons
          name={active ? 'checkbox' : 'square-outline'}
          size={20}
          color={active ? colors.primary : colors.textSecondary}
        />
      ) : (
        !!icon && (
          <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textSecondary} />
        )
      )}
      <View style={styles.optionTexts}>
        <Text style={[styles.optionLabel, active && styles.optionLabelActive]} numberOfLines={1}>
          {label}
        </Text>
        {!!hint && (
          <Text style={styles.optionHint} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
      {!multi && active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  overlayFill: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    // No sheet should ever swallow the screen — the backdrop has to stay tappable.
    maxHeight: '85%',
  },
  // A list of options gets a tighter cap, so it reads as a sheet and not a page.
  sheetCapped: { maxHeight: '70%' },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.border,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    // 48dp tall: comfortably over the 44dp minimum touch target.
    minHeight: 48,
    paddingVertical: SPACING.md,
    opacity: 1,
  },
  optionPressed: { opacity: ROW_PRESS_OPACITY },
  optionTexts: { flex: 1 },
  optionLabel: { fontSize: FONT_SIZE.subheading, color: colors.textPrimary },
  optionLabelActive: { fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  optionHint: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: SPACING.hairline },
});
