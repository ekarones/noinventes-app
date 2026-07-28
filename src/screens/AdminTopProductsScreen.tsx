import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminTopProducts } from '../api/admin/dashboard';
import { fetchAdminProductDetail } from '../api/admin/products';
import { ApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import TopProductsList from '../components/TopProductsList';
import { topProductKey } from '../components/TopProductRow';
import type { DashboardTopProduct } from '../types';
import type { AdminHomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'AdminTopProducts'>;

const PER_PAGE = 20;

// The cross-seller best-sellers ranking, reached from the admin dashboard's
// "Ver todas". Keeps the dashboard's period and branch scope.
export default function AdminTopProductsScreen({ navigation, route }: Props) {
  const { period, branchId } = route.params;
  const { showToast } = useToast();
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const fetchPage = useCallback(
    (page: number) => fetchAdminTopProducts(period, branchId, page, PER_PAGE),
    [period, branchId]
  );

  async function openProduct(tp: DashboardTopProduct) {
    if (openingKey) return;
    setOpeningKey(topProductKey(tp));
    try {
      // Fetch first so a product deleted since the sale reports a clean 404
      // instead of failing inside the detail, which re-fetches from the id.
      const product = await fetchAdminProductDetail(tp.productId);
      navigation.navigate('AdminProductDetail', { product });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        showToast('Este producto ya no existe', 'alert-circle');
      } else {
        showToast('No se pudo abrir el producto', 'alert-circle');
      }
    } finally {
      setOpeningKey(null);
    }
  }

  return (
    <TopProductsList
      onBack={() => navigation.goBack()}
      fetchPage={fetchPage}
      onOpenProduct={openProduct}
      openingKey={openingKey}
    />
  );
}
