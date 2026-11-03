/** The website's product form: details, prices, stock alert, quick-sale buttons and bulk tiers. */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { get, post } from '@/api/client';
import type { PresetRow, ProductChoices, ProductDetail, TierRow } from '@/api/types';
import { dateTime, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';
import { useScan } from '@/store/scan';
import { can, useSession } from '@/store/session';

import { Banner, Button, Card, ChipRow, Field, ListItem, Loading, Muted, Row, Screen, T, useColors } from './ui';

type Form = Record<string, string>;

const TEXT_FIELDS = ['name', 'barcode', 'selling_price', 'cost_price', 'low_stock_threshold', 'reorder_qty', 'piece_size', 'quick_order'] as const;
const clean = (v: string | null | undefined) => (v ?? '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

function toForm(p: ProductDetail | null, barcode = ''): Form {
  if (!p) return { sold_by: 'piece', sell_mode: 'both', piece_size_unit: 'kg', barcode, quick_order: '0', category: '', quick_category: '' };
  const f: Form = {};
  for (const k of TEXT_FIELDS) f[k] = clean(String((p as unknown as Record<string, unknown>)[k] ?? ''));
  f.barcode = p.barcode ?? '';
  f.quick_order = String(p.quick_order ?? 0);
  return { ...f, sold_by: p.sold_by, sell_mode: p.sell_mode_setting, piece_size_unit: p.piece_size_unit,
    category: p.category_id ? String(p.category_id) : '', quick_category: p.quick_category_id ? String(p.quick_category_id) : '' };
}

export function ProductForm({ id, barcode }: { id?: number; barcode?: string }) {
  const c = useColors();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const isNew = id === undefined;
  const mayPrice = can(user, 'change_prices');
  const seeCost = can(user, 'see_cost');
  const mayEdit = isNew ? can(user, 'add_products') : can(user, 'edit_products');

  const [form, setForm] = useState<Form>(toForm(null, barcode));
  const [active, setActive] = useState(true);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);

  const fill = (p: ProductDetail) => {
    setProduct(p); setForm(toForm(p)); setActive(p.active);
    setTiers(p.tiers.map((t) => ({ ...t, min_qty: clean(t.min_qty), unit_price: clean(t.unit_price) })));
    setPresets(p.presets.map((x) => ({ ...x, price: x.price ? clean(x.price) : null })));
  };
  const { data: choices, error, loading } = useApi(async () => {
    if (isNew) return get<ProductChoices>('products/choices/');
    const r = await get<{ product: ProductDetail } & ProductChoices>(`products/${id}/`);
    fill(r.product);
    return r;
  }, [id]);

  useFocusEffect(useCallback(() => {
    const code = useScan.getState().take('product-barcode');
    if (code) setForm((f) => ({ ...f, barcode: code }));
  }, []));

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const loose = form.sold_by !== 'piece';
  const unit = form.sold_by === 'weight' ? 'kg' : form.sold_by === 'volume' ? 'L' : 'pcs';

  const save = async (another = false) => {
    setBusy(true); setMsg(null);
    try {
      const body: Record<string, unknown> = {
        ...Object.fromEntries(TEXT_FIELDS.filter((k) => k !== 'cost_price' || seeCost).map((k) => [k, form[k] ?? ''])),
        sold_by: form.sold_by, sell_mode: form.sell_mode, piece_size_unit: form.piece_size_unit,
        category: form.category, quick_category: form.quick_category, active,
        presets: presets.filter((p) => p.text.trim()),
      };
      if (mayPrice) body.tiers = tiers.filter((t) => t.min_qty && t.unit_price);
      if (isNew && opening) body.opening_stock = opening;
      if (product?.added_at_till && counted) body.counted_stock = counted;
      const r = await post<{ product: ProductDetail }>(isNew ? 'products/' : `products/${id}/`, body);
      void useCatalog.getState().load(true);
      if (isNew && another) {
        setForm(toForm(null)); setTiers([]); setPresets([]); setOpening('');
        setMsg({ text: `Saved ${r.product.name}. Add the next one.`, kind: 'good' });
      } else if (isNew) {
        router.replace(`/product/${r.product.id}`);
      } else {
        fill(r.product);
        setMsg({ text: `Saved ${r.product.name}.`, kind: 'good' });
      }
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !choices) return <Loading />;
  if (error && !choices) return <Screen><Banner text={error} /></Screen>;
  const cats = [{ value: '', label: 'None' }, ...(choices?.categories ?? []).map((x) => ({ value: String(x.id), label: x.name }))];
  const quick = [{ value: '', label: 'None' }, ...(choices?.quick_categories ?? []).map((x) => ({ value: String(x.id), label: x.name }))];

  return (
    <Screen>
      <Banner text={msg?.text} kind={msg?.kind} />
      {product?.added_at_till ? (
        <Banner kind="warning" text="This item was typed in at the till. Check the price and cost, then save to mark it as checked." />
      ) : null}
      {!mayEdit ? <Banner kind="warning" text="You can look at this product but not change it." /> : null}

      <Card>
        <Field label="Name" value={form.name} onChangeText={set('name')} editable={mayEdit} />
        <Row>
          <View style={{ flex: 1 }}><Field label="Barcode" value={form.barcode} onChangeText={set('barcode')} keyboardType="number-pad" editable={mayEdit} /></View>
          <Pressable disabled={!mayEdit} onPress={() => { useScan.getState().open('product-barcode'); router.push('/scan'); }}
            style={{ backgroundColor: c.chip, borderRadius: 10, height: 46, width: 52, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
            <Ionicons name="barcode-outline" size={24} color={c.text} />
          </Pressable>
        </Row>
        <T size={13} weight="500" color={c.muted}>Sold by</T>
        <ChipRow options={choices?.sold_by ?? []} value={form.sold_by} onChange={mayEdit ? set('sold_by') : () => {}} />
        <T size={13} weight="500" color={c.muted}>Category</T>
        <ChipRow options={cats} value={form.category} onChange={mayEdit ? set('category') : () => {}} />
      </Card>

      <Card>
        <T weight="600">Prices</T>
        <Row>
          <View style={{ flex: 1 }}><Field label={`Selling price per ${unit === 'pcs' ? 'piece' : unit}`} value={form.selling_price}
            onChangeText={set('selling_price')} keyboardType="decimal-pad" editable={mayEdit && mayPrice} /></View>
          {seeCost ? <View style={{ flex: 1 }}><Field label="Cost price" value={form.cost_price} onChangeText={set('cost_price')}
            keyboardType="decimal-pad" editable={mayEdit && mayPrice} /></View> : null}
        </Row>
        {!mayPrice ? <Muted size={12}>Only the owner can change prices.</Muted> : null}
        <T size={13} weight="500" color={c.muted}>Bulk prices</T>
        {tiers.map((t, i) => (
          <Row key={t.id ?? `n${i}`}>
            <View style={{ flex: 1 }}><Field placeholder={`From qty (${unit})`} value={t.min_qty} keyboardType="decimal-pad" editable={mayPrice}
              onChangeText={(v) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, min_qty: v } : x)))} /></View>
            <View style={{ flex: 1 }}><Field placeholder="Unit price" value={t.unit_price} keyboardType="decimal-pad" editable={mayPrice}
              onChangeText={(v) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, unit_price: v } : x)))} /></View>
            {mayPrice ? <Pressable hitSlop={8} onPress={() => setTiers((all) => all.filter((_, j) => j !== i))}>
              <Ionicons name="trash-outline" size={20} color={c.danger} /></Pressable> : null}
          </Row>
        ))}
        {mayPrice ? <Button title="Add a bulk price" small kind="ghost" icon="add" onPress={() => setTiers((all) => [...all, { min_qty: '', unit_price: '' }])} /> : null}
        {!tiers.length && !mayPrice ? <Muted>None.</Muted> : null}
      </Card>

      <Card>
        <T weight="600">Stock</T>
        {isNew ? <Field label={`Opening stock (${unit})`} value={opening} onChangeText={setOpening} keyboardType="decimal-pad"
          hint="What is on the shelf now. Later changes go through purchases, recounts and stock takes." /> : (
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted size={14}>In stock</Muted>
            <T weight="700">{qty(product?.stock_qty, product?.unit)}</T>
          </Row>
        )}
        {product?.added_at_till ? <Field label={`Stock on hand now (${unit})`} value={counted} onChangeText={setCounted}
          keyboardType="decimal-pad" hint="Optional. Count what is left; sales at the till took the stock below zero." /> : null}
        <Row>
          <View style={{ flex: 1 }}><Field label="Alert when at or below" value={form.low_stock_threshold} onChangeText={set('low_stock_threshold')}
            keyboardType="decimal-pad" placeholder="Shop default" editable={mayEdit} /></View>
          <View style={{ flex: 1 }}><Field label="Reorder quantity" value={form.reorder_qty} onChangeText={set('reorder_qty')}
            keyboardType="decimal-pad" editable={mayEdit} /></View>
        </Row>
        {!isNew && can(user, 'stock_history') ? (
          <Button title="Stock history" small kind="secondary" icon="time-outline" onPress={() => router.push(`/product/history/${id}`)} />
        ) : null}
      </Card>

      <Card>
        <T weight="600">At the till</T>
        {loose ? (
          <>
            <T size={13} weight="500" color={c.muted}>Custom sale</T>
            <ChipRow options={choices?.sell_mode ?? []} value={form.sell_mode} onChange={mayEdit ? set('sell_mode') : () => {}} />
          </>
        ) : (
          <Row>
            <View style={{ flex: 1 }}><Field label="Size of one piece" value={form.piece_size} onChangeText={set('piece_size')}
              keyboardType="decimal-pad" placeholder="e.g. 2 for a 2 kg packet" editable={mayEdit} /></View>
            <View style={{ width: 120 }}>
              <T size={13} weight="500" color={c.muted}>Unit</T>
              <ChipRow options={choices?.piece_size_unit ?? []} value={form.piece_size_unit} onChange={mayEdit ? set('piece_size_unit') : () => {}} />
            </View>
          </Row>
        )}
        <T size={13} weight="500" color={c.muted}>Quick-sale tab</T>
        <ChipRow options={quick} value={form.quick_category} onChange={mayEdit ? set('quick_category') : () => {}} />
        {form.quick_category ? <Field label="Order on the tab" value={form.quick_order} onChangeText={set('quick_order')} keyboardType="number-pad" editable={mayEdit} /> : null}
        <T size={13} weight="500" color={c.muted}>Quick-sale buttons</T>
        <Muted size={12}>e.g. 1/4 kg, 500 g, 1 L, KSh 50, or 1/2 kg @ 70 for a fixed price.</Muted>
        {presets.map((p, i) => (
          <Row key={p.id ?? `n${i}`}>
            <View style={{ flex: 2 }}><Field placeholder="Button" value={p.text} editable={mayEdit}
              onChangeText={(v) => setPresets((all) => all.map((x, j) => (j === i ? { ...x, text: v } : x)))} /></View>
            <View style={{ flex: 1 }}><Field placeholder="Price" value={p.price ?? ''} keyboardType="decimal-pad" editable={mayEdit}
              onChangeText={(v) => setPresets((all) => all.map((x, j) => (j === i ? { ...x, price: v || null } : x)))} /></View>
            {mayEdit ? <Pressable hitSlop={8} onPress={() => setPresets((all) => all.filter((_, j) => j !== i))}>
              <Ionicons name="trash-outline" size={20} color={c.danger} /></Pressable> : null}
          </Row>
        ))}
        {mayEdit ? <Button title="Add a button" small kind="ghost" icon="add"
          onPress={() => setPresets((all) => [...all, { text: '', price: null, label: '', order: all.length, hidden: false }])} /> : null}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T weight="600">Active</T>
            <Muted size={12}>Inactive products are hidden from the till and lists.</Muted>
          </View>
          <Switch value={active} onValueChange={setActive} disabled={!mayEdit} />
        </Row>
      </Card>

      {mayEdit ? <Button title={isNew ? 'Save product' : 'Save changes'} icon="checkmark" busy={busy} onPress={() => void save()} /> : null}
      {isNew && mayEdit ? <Button title="Save and add another" kind="secondary" disabled={busy} onPress={() => void save(true)} /> : null}

      {product?.recent_movements.length ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 14 }}><T weight="600">Latest stock changes</T></View>
          {product.recent_movements.map((m) => (
            <ListItem key={m.id} title={m.kind_label} subtitle={`${dateTime(m.created_at)}${m.reason ? ` · ${m.reason}` : ''}`}
              right={`${m.quantity.startsWith('-') ? '' : '+'}${qty(m.quantity, m.unit)}`} rightSub={m.stock_after !== null ? `→ ${qty(m.stock_after)}` : undefined} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
