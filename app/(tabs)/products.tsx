import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { Product, ProductList } from '@/api/types';
import { Banner, Button, ChipRow, Empty, Field, ListItem, Row, useColors } from '@/components/ui';
import { money, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useScan } from '@/store/scan';
import { can, useSession } from '@/store/session';

const FILTERS = [
  { value: 'active', label: 'Active' }, { value: 'low', label: 'Low stock' },
  { value: 'till', label: 'Added at till' }, { value: 'all', label: 'Include inactive' },
];

/** The website's Products page: search, filter, add and edit products. */
export default function Products() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useSession((s) => s.user);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('active');
  const [category, setCategory] = useState('');
  const [more, setMore] = useState<Product[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [searched, setSearched] = useState(0);
  const query = () => ({ q, category, low: filter === 'low' ? 1 : '', till: filter === 'till' ? 1 : '', inactive: filter === 'all' ? 1 : '' });
  const { data, error, loading, reload } = useApi(async () => {
    const page = await get<ProductList>('products/', query());
    setMore([]); setNext(page.next_offset);
    return page;
  }, [filter, category, searched]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => can(user, 'categories') ? (
        <Pressable onPress={() => router.push('/categories')} hitSlop={8} style={{ paddingRight: 16 }} accessibilityLabel="Categories">
          <Ionicons name="folder-open-outline" size={22} color={c.text} />
        </Pressable>
      ) : null,
    });
  }, [navigation, router, c, user]);

  // A barcode scanned from this screen opens that product, or offers to add it.
  useFocusEffect(useCallback(() => {
    const code = useScan.getState().take('products');
    if (code) setQ(code);
    setSearched((n) => n + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const loadMore = async () => {
    if (next === null) return;
    const page = await get<ProductList>('products/', { ...query(), offset: next });
    setMore((m) => [...m, ...page.products]); setNext(page.next_offset);
  };

  const products = [...(data?.products ?? []), ...more];
  const cats = [{ value: '', label: 'All categories' }, ...(data?.categories ?? []).map((x) => ({ value: String(x.id), label: x.name }))];

  return (
    <FlatList
      data={products}
      keyExtractor={(p) => String(p.id)}
      onEndReached={loadMore}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <Row>
            <View style={{ flex: 1 }}>
              <Field value={q} onChangeText={setQ} placeholder="Search name or barcode" returnKeyType="search" onSubmitEditing={() => setSearched((n) => n + 1)} autoCorrect={false} />
            </View>
            <Pressable onPress={() => { useScan.getState().open('products'); router.push('/scan'); }}
              style={{ backgroundColor: c.chip, borderRadius: 10, height: 46, width: 52, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Scan a barcode">
              <Ionicons name="barcode-outline" size={24} color={c.text} />
            </Pressable>
          </Row>
          <ChipRow options={FILTERS.map((f) => f.value === 'till' && data?.till_count ? { ...f, label: `${f.label} (${data.till_count})` } : f)}
            value={filter} onChange={setFilter} />
          {cats.length > 1 ? <ChipRow options={cats} value={category} onChange={setCategory} /> : null}
          <Banner text={error} />
          {filter === 'till' && products.length ? (
            <Banner kind="warning" text="These were typed in at the till. Open each one, check its price and cost, and save." />
          ) : null}
          {can(user, 'add_products') ? (
            <Button title="Add product" kind="secondary" icon="add" onPress={() => router.push(q && /^\d+$/.test(q) ? `/product/new?barcode=${q}` : '/product/new')} />
          ) : null}
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Empty text={q ? `No product matches '${q}'.` : 'No products here.'} />}
      renderItem={({ item: p }) => (
        <ListItem
          title={p.name}
          subtitle={[p.category, p.barcode, p.active ? '' : 'Inactive', p.added_at_till ? 'Added at till' : ''].filter(Boolean).join(' · ') || undefined}
          right={money(p.selling_price)}
          rightSub={qty(p.stock_qty, p.unit)}
          tone={p.stock_status === 'out' ? c.danger : p.stock_status === 'low' ? c.warning : undefined}
          onPress={() => router.push(`/product/${p.id}`)}
        />
      )}
    />
  );
}
