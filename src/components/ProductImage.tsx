import { Image, StyleSheet, View, type StyleProp, type ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  uri: string | null;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
};

// Renders a remote product image, or a neutral placeholder when the URL is null.
export default function ProductImage({ uri, style, iconSize = 28 }: Props) {
  if (uri) {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  }
  return (
    <View style={[style, styles.placeholder]}>
      <Ionicons name="image-outline" size={iconSize} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
