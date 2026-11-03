import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { post } from '@/api/client';
import type { Product } from '@/api/types';
import { AddSheet } from '@/components/AddSheet';
import { CartPanel } from '@/components/CartPanel';
import { Banner, Button, ChipRow, Field, Muted, Row, Sheet, T, useColors } from '@/components/ui';
import { type AddInput, CartError, cartTotal, toApiLines } from '@/domain/cart';
import { money } from '@/lib/format';
import { ksh, parseMoney, parseQty } from '@/lib/money';
import { useCart } from '@/store/cart';
import { searchProducts, useCatalog } from '@/store/catalog';
import { useScan } from '@/store/scan';
import { can, useSession } from '@/store/session';

/** The sell screen: scan or search, quick-sale tabs, a product grid, and the cart. */
export default function Sell() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const user = useSession((s) => s.user);
  const { catalog, loading, error: loadError, load } = useCatalog();
  const cart = useCart();
  const [term, setTerm] = useState('');
  const [tab, setTab] = useState<string>('all');
  const [picked, setPicked] = useState<Product | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'danger' | 'good' } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [unlisted, setUnlisted] = useState<{ name: string; price: string; qty: string } | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Row gap={18} style={{ paddingRight: 16 }}>
          <Pressable onPress={() => router.push('/held')} hitSlop={8}><Ionicons name="pause-circle-outline" size={24} color={c.text} /></Pressable>
          <Pressable onPress={() => void load(true)} hitSlop={8}><Ionicons name="refresh" size={22} color={c.text} /></Pressable>
        </Row>
      ),
    });
  }, [navigation, router, c, load]);

  // A barcode from the camera screen.
  useFocusEffect(useCallback(() => {
    const code = useScan.getState().take('sell');
    if (code) submit(code);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]));

  const products = catalog?.products ?? [];
  const tabs = useMemo(() => [
    { value: 'all', label: 'All items' },
    ...(catalog?.quick_categories ?? []).map((q) => ({ value: `q${q.id}`, label: q.name })),
  ], [catalog]);
  const shown = useMemo(() => {
    if (tab !== 'all') {
      const id = Number(tab.slice(1));
      return products.filter((p) => p.quick_category_id === id).sort((a, b) => a.quick_order - b.quick_order || a.name.localeCompare(b.name));
    }
    return searchProducts(products, term).slice(0, 300);
  }, [products, tab, term]);

  if (user && !can(user, 'sell')) return <Redirect href={can(user, 'receive_stock', 'adjust_stock', 'stock_history') ? '/stock' : '/more'} />;

  const add = (p: Product, input: AddInput = {}): string | void => {
    try {
      cart.add(p, input);
      setMessage(null);
    } catch (e) {
      return e instanceof CartError ? e.message : String(e);
    }
  };

  const tap = (p: Product) => {
    if (p.sold_by === 'piece' && !p.presets.length) {
      const problem = add(p);
      if (problem) setMessage({ text: problem, kind: 'danger' });
    } else {
      setPicked(p);
    }
  };

  /** Scanner or typed input: '12*6161100110016', a barcode, or part of a name. */
  function submit(text: string) {
    const raw = text.trim();
    if (!raw) return;
    let qtyMilli: number | undefined;
    let code = raw;
    if (raw.includes('*')) {
      const [q, rest] = raw.split('*', 2);
      const parsed = parseQty(q);
      if (!parsed || parsed <= 0) return setMessage({ text: `Can't read the quantity '${q}'.`, kind: 'danger' });
      qtyMilli = parsed;
      code = rest.trim();
    }
    const exact = products.find((p) => p.barcode === code);
    const found = exact ? [exact] : searchProducts(products, code);
    if (found.length === 1) {
      const p = found[0];
      if (p.sold_by !== 'piece' && qtyMilli === undefined) { setPicked(p); setTerm(''); return; }
      const problem = add(p, { qtyMilli: qtyMilli ?? 1000 });
      setMessage(problem ? { text: problem, kind: 'danger' } : { text: `Added ${p.name}.`, kind: 'good' });
      setTerm('');
    } else if (!found.length) {
      setMessage({ text: `Nothing found for '${code}'. Add it as an item not in the system?`, kind: 'danger' });
      setUnlisted({ name: /^\d+$/.test(code) ? '' : code, price: '', qty: '1' });
    } else {
      setTab('all');
      setTerm(code);
    }
  }

  const total = cartTotal(cart.lines);
  const count = cart.lines.length;

  const hold = async () => {
    setBusy(true);
    try {
      await post('held/', { label: holdLabel, lines: toApiLines(cart.lines) });
      cart.clear();
      setHoldOpen(false);
      setHoldLabel('');
      setMessage({ text: 'Sale held. Serve the next customer.', kind: 'good' });
    } catch (e) {
      setMessage({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const cols = Math.max(2, Math.floor((wide ? width * 0.58 : width) / 170));
  const grid = (
    <FlatList
      key={cols}
      data={shown}
      numColumns={cols}
      keyExtractor={(p) => String(p.id)}
      columnWrapperStyle={{ gap: 8 }}
      contentContainerStyle={{ gap: 8, padding: 12, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(true)} />}
      ListEmptyComponent={<Muted>{loading ? 'Loading products…' : 'No products match.'}</Muted>}
      renderItem={({ item: p }) => (
        <Pressable onPress={() => tap(p)} style={({ pressed }) => ({
          flex: 1 / cols, backgroundColor: c.card, borderRadius: 12, padding: 12, minHeight: 92, gap: 4,
          borderWidth: 1, borderColor: p.stock_status === 'out' ? c.danger : c.border, opacity: pressed ? 0.7 : 1,
        })}>
          <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }} numberOfLines={2}>{p.name}</Text>
          <Text style={{ color: c.text, fontWeight: '700' }}>{money(p.selling_price)}<Text style={{ color: c.muted, fontWeight: '400' }}> /{p.unit === 'pcs' ? 'pc' : p.unit}</Text></Text>
          <Text style={{ color: p.stock_status === 'ok' ? c.muted : p.stock_status === 'low' ? c.warning : c.danger, fontSize: 12 }}>
            {p.stock_status === 'out' ? 'Out of stock' : `${p.stock_qty.replace(/\.?0+$/, '')} ${p.unit}${p.stock_status === 'low' ? ' · low' : ''}`}
          </Text>
        </Pressable>
      )}
    />
  );

  const cartBox = (
    <View style={{ gap: 10 }}>
      <CartPanel />
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={20} weight="700">Total</T>
        <T size={22} weight="700">{ksh(total)}</T>
      </Row>
      <Row>
        <View style={{ flex: 1 }}><Button title="Hold" kind="secondary" icon="pause" disabled={!count} onPress={() => setHoldOpen(true)} /></View>
        <View style={{ flex: 2 }}><Button title={`Pay ${ksh(total)}`} icon="cash-outline" disabled={!count}
          onPress={() => { setCartOpen(false); router.push('/pay'); }} /></View>
      </Row>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['left', 'right']}>
      <View style={{ padding: 12, paddingBottom: 0, gap: 8 }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Field value={term} onChangeText={(t) => { setTerm(t); setTab('all'); }} placeholder="Scan, type a barcode or a name"
              returnKeyType="search" onSubmitEditing={() => submit(term)} autoCorrect={false} />
          </View>
          <Pressable onPress={() => { useScan.getState().open('sell'); router.push('/scan'); }}
            style={{ backgroundColor: c.primary, borderRadius: 10, height: 46, width: 52, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Scan with the camera">
            <Ionicons name="barcode-outline" size={26} color={c.primaryText} />
          </Pressable>
        </Row>
        <ChipRow options={tabs} value={tab} onChange={setTab} />
        <Banner text={loadError && !catalog ? `${loadError} Pull down to retry.` : null} />
        {message ? <Banner text={message.text} kind={message.kind} /> : null}
      </View>

      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 58 }}>{grid}</View>
          <View style={{ flex: 42, padding: 12, borderLeftWidth: 1, borderLeftColor: c.border }}>{cartBox}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {grid}
          <Pressable onPress={() => setCartOpen(true)} style={{
            position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: c.primary, borderRadius: 14,
            padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Text style={{ color: c.primaryText, fontWeight: '600', fontSize: 16 }}>{count ? `Cart · ${count} line${count === 1 ? '' : 's'}` : 'Cart is empty'}</Text>
            <Text style={{ color: c.primaryText, fontWeight: '700', fontSize: 18 }}>{ksh(total)}</Text>
          </Pressable>
        </View>
      )}

      <Sheet visible={cartOpen && !wide} title="Cart" onClose={() => setCartOpen(false)}>{cartBox}</Sheet>

      <AddSheet product={picked} onClose={() => setPicked(null)} onAdd={add} />

      <Sheet visible={holdOpen} title="Hold this sale" onClose={() => setHoldOpen(false)}>
        <Field label="Name" value={holdLabel} onChangeText={setHoldLabel} placeholder="e.g. Mama Wanjiku" autoFocus />
        <Button title="Hold" busy={busy} onPress={hold} />
      </Sheet>

      <Sheet visible={!!unlisted} title="Item not in the system" onClose={() => setUnlisted(null)}>
        <Muted>It is added as a new product for the owner to check later.</Muted>
        <Field label="Name" value={unlisted?.name ?? ''} onChangeText={(name) => setUnlisted((u) => u && { ...u, name })} />
        <Row>
          <View style={{ flex: 1 }}><Field label="Price for one (KSh)" value={unlisted?.price ?? ''} keyboardType="decimal-pad"
            onChangeText={(price) => setUnlisted((u) => u && { ...u, price })} /></View>
          <View style={{ width: 90 }}><Field label="Qty" value={unlisted?.qty ?? '1'} keyboardType="number-pad"
            onChangeText={(qty) => setUnlisted((u) => u && { ...u, qty })} /></View>
        </Row>
        <Button title="Add to cart" onPress={() => {
          if (!unlisted) return;
          try {
            cart.addUnlisted(unlisted.name, parseMoney(unlisted.price) ?? 0, Number(unlisted.qty));
            setUnlisted(null);
            setMessage(null);
          } catch (e) {
            setMessage({ text: (e as Error).message, kind: 'danger' });
          }
        }} />
      </Sheet>
    </SafeAreaView>
  );
}
