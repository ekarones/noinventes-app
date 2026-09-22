import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tabIcon } from './tabIcon';
import DashboardScreen from '../screens/DashboardScreen';
import CatalogScreen from '../screens/CatalogScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentIntentScreen from '../screens/PaymentIntentScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TopProductsScreen from '../screens/TopProductsScreen';
import { useTheme } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';
import { useCart } from '../context/CartContext';
import type {
  CartStackParamList,
  CatalogStackParamList,
  DashboardStackParamList,
  OrdersStackParamList,
  TabParamList,
} from './types';

const Stack = createNativeStackNavigator<CatalogStackParamList>();
const DashboardStackNav = createNativeStackNavigator<DashboardStackParamList>();
const CartStackNav = createNativeStackNavigator<CartStackParamList>();
const OrdersStackNav = createNativeStackNavigator<OrdersStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function DashboardStack() {
  return (
    <DashboardStackNav.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStackNav.Screen name="Dashboard" component={DashboardScreen} />
      <DashboardStackNav.Screen name="Profile" component={ProfileScreen} />
      <DashboardStackNav.Screen name="TopProducts" component={TopProductsScreen} />
      {/* Also registered in the Catálogo and Ventas stacks. Inicio opens its
          best-sellers and recent sales HERE, on its own stack, so that going back
          returns to Inicio — a cross-tab navigate would push them onto the other
          tab and leave you stranded on that tab's list. */}
      <DashboardStackNav.Screen name="ProductDetail" component={ProductDetailScreen} />
      <DashboardStackNav.Screen name="OrderDetail" component={OrderDetailScreen} />
    </DashboardStackNav.Navigator>
  );
}

function CatalogStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Catalog" component={CatalogScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <CartStackNav.Navigator screenOptions={{ headerShown: false }}>
      <CartStackNav.Screen name="Cart" component={CartScreen} />
      <CartStackNav.Screen name="Checkout" component={CheckoutScreen} />
      <CartStackNav.Screen name="PaymentIntent" component={PaymentIntentScreen} />
    </CartStackNav.Navigator>
  );
}

function OrdersStack() {
  return (
    <OrdersStackNav.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStackNav.Screen name="Orders" component={OrdersScreen} />
      <OrdersStackNav.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStackNav.Navigator>
  );
}

export default function AppNavigator() {
  const { totalItems } = useCart();
  const colors = useTheme();

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
        name="DashboardTab"
        component={DashboardStack}
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home', colors) }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{ title: 'Catálogo', tabBarIcon: tabIcon('products', colors) }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={{
          title: 'Carrito',
          tabBarBadge: totalItems > 0 ? totalItems : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent },
          tabBarIcon: tabIcon('cart', colors),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{ title: 'Ventas', tabBarIcon: tabIcon('sales', colors) }}
      />
    </Tab.Navigator>
  );
}
