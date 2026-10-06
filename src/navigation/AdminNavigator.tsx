import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tabIcon } from './tabIcon';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminProfileScreen from '../screens/AdminProfileScreen';
import UserGuideScreen from '../screens/UserGuideScreen';
import AdminLowStockScreen from '../screens/AdminLowStockScreen';
import AdminTopProductsScreen from '../screens/AdminTopProductsScreen';
import AdminTopSuppliersScreen from '../screens/AdminTopSuppliersScreen';
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
import AdminCompanyScreen from '../screens/AdminCompanyScreen';
import AdminSuppliersScreen from '../screens/AdminSuppliersScreen';
import AdminSupplierFormScreen from '../screens/AdminSupplierFormScreen';
import AdminPurchaseOrdersScreen from '../screens/AdminPurchaseOrdersScreen';
import AdminPurchaseOrderDetailScreen from '../screens/AdminPurchaseOrderDetailScreen';
import AdminPurchaseOrderFormScreen from '../screens/AdminPurchaseOrderFormScreen';
import AdminPaymentsScreen from '../screens/AdminPaymentsScreen';
import AdminPaymentFormScreen from '../screens/AdminPaymentFormScreen';
import AdminPaymentIntentScreen from '../screens/AdminPaymentIntentScreen';
import { useTheme } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';
import { usePosMode } from '../context/PosModeContext';
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
      <HomeStackNav.Screen name="Guide" component={UserGuideScreen} />
      <HomeStackNav.Screen name="AdminLowStock" component={AdminLowStockScreen} />
      <HomeStackNav.Screen name="AdminTopProducts" component={AdminTopProductsScreen} />
      <HomeStackNav.Screen name="AdminTopSuppliers" component={AdminTopSuppliersScreen} />
      {/* Also registered in the Ventas and Catálogo stacks. Inicio opens its
          best-sellers and recent sales HERE, on its own stack, so that going back
          returns to Inicio — a cross-tab navigate would push them onto the other
          tab and leave you stranded on that tab's list. A product detail leads on
          to the whole edit sub-flow, so that comes along too. */}
      <HomeStackNav.Screen name="AdminSaleDetail" component={AdminSaleDetailScreen} />
      <HomeStackNav.Screen name="AdminProductDetail" component={AdminProductDetailScreen} />
      <HomeStackNav.Screen name="AdminProductForm" component={AdminProductFormScreen} />
      <HomeStackNav.Screen name="AdminProductImages" component={AdminProductImagesScreen} />
      <HomeStackNav.Screen name="AdminStockEdit" component={AdminStockEditScreen} />
      <HomeStackNav.Screen name="AdminVariationForm" component={AdminVariationFormScreen} />
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
      <MoreStackNav.Screen name="AdminCompany" component={AdminCompanyScreen} />
      <MoreStackNav.Screen name="AdminSuppliers" component={AdminSuppliersScreen} />
      <MoreStackNav.Screen name="AdminSupplierForm" component={AdminSupplierFormScreen} />
      <MoreStackNav.Screen name="AdminPurchaseOrders" component={AdminPurchaseOrdersScreen} />
      <MoreStackNav.Screen name="AdminPurchaseOrderDetail" component={AdminPurchaseOrderDetailScreen} />
      <MoreStackNav.Screen name="AdminPurchaseOrderForm" component={AdminPurchaseOrderFormScreen} />
      <MoreStackNav.Screen name="AdminPayments" component={AdminPaymentsScreen} />
      <MoreStackNav.Screen name="AdminPaymentForm" component={AdminPaymentFormScreen} />
      <MoreStackNav.Screen name="AdminPaymentIntent" component={AdminPaymentIntentScreen} />
      <MoreStackNav.Screen name="Guide" component={UserGuideScreen} />
    </MoreStackNav.Navigator>
  );
}

// Placeholder for the "Vender" launcher tab — it never renders because its
// tabPress is intercepted to enter the POS instead of focusing a screen.
function PosLauncher() {
  return null;
}

// Root navigator for admin users. Bottom tabs, each wrapping its own stack.
// New admin areas (productos, usuarios, …) get added as new tabs as they ship.
export default function AdminNavigator() {
  const colors = useTheme();
  const pos = usePosMode();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'rgba(22, 33, 58, 0.45)',
        tabBarLabelStyle: { fontFamily: FONT_FAMILY.extrabold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="AdminHomeTab"
        component={HomeStack}
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home', colors) }}
      />
      <Tab.Screen
        name="AdminSellTab"
        component={PosLauncher}
        options={{ title: 'Vender', tabBarIcon: tabIcon('cart', colors) }}
        listeners={{
          tabPress: (e) => {
            // Don't navigate to the empty screen — enter the POS instead.
            e.preventDefault();
            pos.enter();
          },
        }}
      />
      <Tab.Screen
        name="AdminProductsTab"
        component={ProductsStack}
        options={{ title: 'Catálogo', tabBarIcon: tabIcon('products', colors) }}
      />
      <Tab.Screen
        name="AdminSalesTab"
        component={SalesStack}
        options={{ title: 'Ventas', tabBarIcon: tabIcon('sales', colors) }}
      />
      <Tab.Screen
        name="AdminMoreTab"
        component={MoreStack}
        options={{ title: 'Más', tabBarIcon: tabIcon('more', colors) }}
      />
    </Tab.Navigator>
  );
}
