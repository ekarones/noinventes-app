import { Ionicons } from '@expo/vector-icons';
import type { PaymentMethod } from '../types';

type PaymentOption = {
  value: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const PAYMENT_METHODS: PaymentOption[] = [
  { value: 'cash', label: 'Efectivo', icon: 'cash-outline' },
  { value: 'yape', label: 'Yape', icon: 'phone-portrait-outline' },
  { value: 'plin', label: 'Plin', icon: 'phone-portrait-outline' },
  { value: 'transfer', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { value: 'pos', label: 'POS / Tarjeta', icon: 'card-outline' },
];

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}
