import { StyleSheet, View, type StyleProp } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  uri: string | null;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
};

// Renders a remote product image, or a neutral placeholder when the URL is null.
//
// Uses expo-image: it caches to memory + disk, so the same thumbnail reused
// across the catalog, cart and dashboards is fetched once. `contentFit` is
// expo-image's replacement for RN's `resizeMode`.
export default function ProductImage({ uri, style, iconSize = 28 }: Props) {
  if (uri) {
    return (
      <Image
        source={uri}
        style={style}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
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
