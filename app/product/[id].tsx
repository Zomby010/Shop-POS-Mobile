import { useLocalSearchParams } from 'expo-router';

import { ProductForm } from '@/components/ProductForm';

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductForm id={Number(id)} />;
}
