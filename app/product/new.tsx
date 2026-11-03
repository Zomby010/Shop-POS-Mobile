import { useLocalSearchParams } from 'expo-router';

import { ProductForm } from '@/components/ProductForm';

export default function NewProduct() {
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();
  return <ProductForm barcode={barcode ?? ''} />;
}
