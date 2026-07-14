import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

// The "we're fetching" placeholder. Pairs with EmptyState: between the two, a
// screen's loading / empty / failed states all come from the same two files.
export default function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
