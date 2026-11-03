/** Find a product by typing its name or scanning its barcode, for the stock screens. */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Product } from '@/api/types';
import { qty } from '@/lib/format';
import { searchProducts, useCatalog } from '@/store/catalog';
import { useScan } from '@/store/scan';

import { Field, ListItem, Muted, Row, useColors } from './ui';

export function ProductPicker({ target, onPick, placeholder = 'Product name or barcode' }: {
  target: string; onPick: (p: Product) => void; placeholder?: string;
}) {
  const c = useColors();
  const router = useRouter();
  const products = useCatalog((s) => s.catalog?.products ?? []);
  const [term, setTerm] = useState('');
  const results = useMemo(() => (term.trim() ? searchProducts(products, term).slice(0, 8) : []), [products, term]);

  useFocusEffect(useCallback(() => {
    const code = useScan.getState().take(target);
    if (!code) return;
    const p = products.find((x) => x.barcode === code);
    if (p) onPick(p); else setTerm(code);
  }, [target, products, onPick]));

  return (
    <View style={{ gap: 6 }}>
      <Row>
        <View style={{ flex: 1 }}><Field value={term} onChangeText={setTerm} placeholder={placeholder} autoCorrect={false} /></View>
        <Pressable onPress={() => { useScan.getState().open(target); router.push('/scan'); }}
          style={{ backgroundColor: c.chip, borderRadius: 10, height: 46, width: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="barcode-outline" size={24} color={c.text} />
        </Pressable>
      </Row>
      {results.map((p) => (
        <ListItem key={p.id} title={p.name} subtitle={`${qty(p.stock_qty, p.unit)} in stock`} onPress={() => { onPick(p); setTerm(''); }} />
      ))}
      {term.trim() && !results.length ? <Muted>No product matches.</Muted> : null}
    </View>
  );
}
