import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminProfileScreen from '../screens/AdminProfileScreen';
import AdminLowStockScreen from '../screens/AdminLowStockScreen';
import AdminSalesScreen from '../screens/AdminSalesScreen';
import AdminSaleDetailScreen from '../screens/AdminSaleDetailScreen';
import AdminSalesTrashScreen from '../screens/AdminSalesTrashScreen';
import AdminProductsScreen from '../screens/AdminProductsScreen';
import AdminProductDetailScreen from '../screens/AdminProductDetailScreen';
import AdminStockEditScreen from '../screens/AdminStockEditScreen';
import AdminVariationFormScreen from '../screens/AdminVariationFormScreen';
import AdminProductFormScreen from '../screens/AdminProductFormScreen';
import AdminProductImagesScreen from '../screens/AdminProductImagesScreen';
import AdminProductsTrashScreen from '../screens/AdminProductsTrashScreen';
import AdminAttributesScreen from '../screens/AdminAttributesScreen';
import AdminMoreScreen from '../screens/AdminMoreScreen';
import AdminCategoriesScreen from '../screens/AdminCategoriesScreen';
import AdminTagsScreen from '../screens/AdminTagsScreen';
import AdminBranchesScreen from '../screens/AdminBranchesScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminUserFormScreen from '../screens/AdminUserFormScreen';
import { colors } from '../theme/colors';
import type {
  AdminHomeStackParamList,
  AdminMoreStackParamList,
  AdminProductsStackParamList,
  AdminSalesStackParamList,
  AdminTabParamList,
} from './types';

const HomeStackNav = createNativeStackNavigator<AdminHomeStackParamList>();
const SalesStackNav = createNativeStackNavigator<AdminSalesStackParamList>();
const ProductsStackNav = createNativeStackNavigator<AdminProductsStackParamList>();
const MoreStackNav = createNativeStackNavigator<AdminMoreStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <HomeStackNav.Screen name="AdminProfile" component={AdminProfileScreen} />
      <HomeStackNav.Screen name="AdminLowStock" component={AdminLowStockScreen} />
    </HomeStackNav.Navigator>
  );
}

function SalesStack() {
  return (
    <SalesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <SalesStackNav.Screen name="AdminSales" component={AdminSalesScreen} />
      <SalesStackNav.Screen name="AdminSaleDetail" component={AdminSaleDetailScreen} />
      <SalesStackNav.Screen name="AdminSalesTrash" component={AdminSalesTrashScreen} />
    </SalesStackNav.Navigator>
  );
}

function ProductsStack() {
  return (
    <ProductsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStackNav.Screen name="AdminProducts" component={AdminProductsScreen} />
      <ProductsStackNav.Screen name="AdminProductDetail" component={AdminProductDetailScreen} />
      <ProductsStackNav.Screen name="AdminStockEdit" component={AdminStockEditScreen} />
      <ProductsStackNav.Screen name="AdminVariationForm" component={AdminVariationFormScreen} />
      <ProductsStackNav.Screen name="AdminProductForm" component={AdminProductFormScreen} />
      <ProductsStackNav.Screen name="AdminProductImages" component={AdminProductImagesScreen} />
      <ProductsStackNav.Screen name="AdminProductsTrash" component={AdminProductsTrashScreen} />
    </ProductsStackNav.Navigator>
  );
}

function MoreStack() {
  return (
    <MoreStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MoreStackNav.Screen name="AdminMore" component={AdminMoreScreen} />
      <MoreStackNav.Screen name="AdminCategories" component={AdminCategoriesScreen} />
      <MoreStackNav.Screen name="AdminTags" component={AdminTagsScreen} />
      <MoreStackNav.Screen name="AdminAttributes" component={AdminAttributesScreen} />
      <MoreStackNav.Screen name="AdminBranches" component={AdminBranchesScreen} />
      <MoreStackNav.Screen name="AdminUsers" component={AdminUsersScreen} />
      <MoreStackNav.Screen name="AdminUserForm" component={AdminUserFormScreen} />
    </MoreStackNav.Navigator>
  );
}

// Root navigator for admin users. Bottom tabs, each wrapping its own stack.
// New admin areas (productos, usuarios, …) get added as new tabs as they ship.
export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="AdminHomeTab"
        component={HomeStack}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminSalesTab"
        component={SalesStack}
        options={{
          title: 'Ventas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminProductsTab"
        component={ProductsStack}
        options={{
          title: 'Productos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminMoreTab"
        component={MoreStack}
        options={{
          title: 'Más',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
