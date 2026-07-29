import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

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
  const { height: screenH } = useWindowDimensions();
  // Measured, not guessed. Three flex/maxHeight approaches failed to bound the
  // ScrollView on this RN version — it kept its full content height and the
  // sheet just clipped the tail, showing ~4 rows with no way to scroll. Here the
  // scroll area gets an explicit pixel height: the sheet's cap (70% of screen)
  // minus the measured header (handle + title) and footer, minus the padding.
  // A concrete maxHeight always scrolls; there is nothing for flex to get wrong.
  const [headerH, setHeaderH] = useState(0);
  const [footerH, setFooterH] = useState(0);
  const sheetPad = SPACING.sm + insets.bottom + SPACING.md;
  const scrollMax = screenH * 0.7 - headerH - footerH - sheetPad - SPACING.md;

  const sheetStyle = [
    styles.sheet,
    { paddingBottom: insets.bottom + SPACING.md },
    scrollable && styles.sheetCapped,
  ];

  const body = (
    <>
      <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {scrollable ? (
        <ScrollView
          style={scrollMax > 0 ? { maxHeight: scrollMax } : undefined}
          // Belt-and-suspenders for Android scroll inside a modal.
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
      {footer != null && (
        <View onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}>{footer}</View>
      )}
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
        // Same shape as the keyboard-aware branch: the backdrop is a separate
        // Pressable ABOVE the sheet, and the sheet itself is a plain View. It
        // used to be a Pressable wrapping the sheet (with an empty onPress to
        // swallow taps) — but that Pressable ate the drag gesture before it
        // reached the ScrollView, so the list showed but wouldn't scroll. With
        // the sheet as a plain View, the scroll gesture is the ScrollView's.
        <View style={styles.overlay}>
          <Pressable style={styles.overlayFill} onPress={onClose} />
          <View style={sheetStyle}>{body}</View>
        </View>
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
  // The scroll area's pixel height is derived from this 70% in the component.
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
    fontFamily: FONT_FAMILY.bold,
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
  optionLabel: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.subheading, color: colors.textPrimary },
  optionLabelActive: { fontFamily: FONT_FAMILY.bold, color: colors.primary },
  optionHint: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: SPACING.hairline },
});
