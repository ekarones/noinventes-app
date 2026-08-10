import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

type Props = {
  name?: string | null;
  onPress: () => void;
  accessibilityLabel?: string;
};

// The profile button that rides in a tab-root header (5a). A rounded square with
// the user's initial: a white card with a navy initial on the seller's amber
// header, a translucent white square with a white initial on the admin's navy.
export default function ProfileButton({ name, onPress, accessibilityLabel }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Perfil'}
      style={[
        styles.button,
        { backgroundColor: colors.chromeButtonBg, borderColor: colors.chromeButtonBorder },
      ]}
    >
      <Text style={styles.initial}>{name?.charAt(0).toUpperCase() ?? '?'}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    button: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial: { fontSize: 18, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
  });
