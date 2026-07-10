import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import CatalogScreen from '../screens/CatalogScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/colors';
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
        name="DashboardTab"
        component={DashboardStack}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={{
          title: 'Ventas',
          tabBarBadge: totalItems > 0 ? totalItems : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
