import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchTopProducts } from '../api/sales';
import { fetchProduct } from '../api/products';
import { ApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import TopProductsList from '../components/TopProductsList';
import { topProductKey } from '../components/TopProductRow';
import type { DashboardTopProduct } from '../types';
import type { DashboardStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DashboardStackParamList, 'TopProducts'>;

const PER_PAGE = 20;

// The seller's full best-sellers ranking, reached from the dashboard's "Ver
// todas". Scoped to the period the dashboard was showing.
export default function TopProductsScreen({ navigation, route }: Props) {
  const { period } = route.params;
  const { showToast } = useToast();
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const fetchPage = useCallback(
    (page: number) => fetchTopProducts(period, page, PER_PAGE),
    [period]
  );

  // Same trip the dashboard row makes: the ranking row is partial, so resolve
  // the product before pushing its detail.
  async function openProduct(tp: DashboardTopProduct) {
    if (openingKey) return;
    setOpeningKey(topProductKey(tp));
    try {
      const product = await fetchProduct(tp.productId);
      navigation.navigate('ProductDetail', { product, variationId: tp.variationId ?? undefined });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        showToast('Este producto ya no está disponible', 'alert-circle');
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
