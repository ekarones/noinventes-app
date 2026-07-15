import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActionRow } from '../components/Row';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../theme/tokens';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminMore'>;

// Hub for the master-catalog / management sections. Rows get added here as new
// admin modules ship (atributos, sucursales, usuarios).
export default function AdminMoreScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.title}>Gestión</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: SPACING['2xl'] }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.overline}>Catálogo maestro</Text>
        <Card inset>
          <ActionRow
            icon="folder-outline"
            label="Categorías"
            hint="Organiza el árbol del catálogo"
            onPress={() => navigation.navigate('AdminCategories')}
          />
          <ActionRow
            icon="pricetags-outline"
            label="Etiquetas"
            hint="Tags que agrupan productos"
            onPress={() => navigation.navigate('AdminTags')}
          />
          <ActionRow
            icon="options-outline"
            label="Atributos"
            hint="Color, Talla… y sus valores"
            onPress={() => navigation.navigate('AdminAttributes')}
            last
          />
        </Card>

        <Text style={styles.overline}>Organización</Text>
        <Card inset>
          <ActionRow
            icon="storefront-outline"
            label="Sucursales"
            hint="Puntos de venta e inventario"
            onPress={() => navigation.navigate('AdminBranches')}
          />
          <ActionRow
            icon="people-outline"
            label="Usuarios"
            hint="Vendedores y administradores"
            onPress={() => navigation.navigate('AdminUsers')}
            last
          />
        </Card>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm },
  title: { fontSize: FONT_SIZE.screenTitle, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  overline: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.xl,
  },
});
