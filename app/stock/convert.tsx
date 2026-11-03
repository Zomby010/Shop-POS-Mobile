import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { get, post } from '@/api/client';
import type { ConversionRow, Product } from '@/api/types';
import { ProductPicker } from '@/components/ProductPicker';
import { Banner, Button, Card, Field, ListItem, Muted, Row, Screen, T, useColors } from '@/components/ui';
import { dateTime, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';

interface Output { product: Product; quantity: string }

/** Turn some of one product into others: a 50 kg sack into packets, a crate into bottles. Cost moves across. */
export default function Convert() {
  const c = useColors();
  const { data, reload } = useApi(() => get<{ conversions: ConversionRow[] }>('conversions/'));
  const [source, setSource] = useState<Product | null>(null);
  const [fromQty, setFromQty] = useState('');
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);

  const save = async () => {
    if (!source) return;
    setBusy(true); setMsg(null);
    try {
      const r = await post<{ conversion: ConversionRow }>('conversions/', {
        from_product_id: source.id, from_qty: fromQty, note,
        outputs: outputs.map((o) => ({ product_id: o.product.id, quantity: o.quantity })),
      });
      const made = r.conversion.lines.map((l) => `${qty(l.quantity, l.unit)} ${l.product}`).join(', ');
      setMsg({ text: `${r.conversion.code}: ${qty(fromQty, source.unit)} ${source.name} turned into ${made}.`, kind: 'good' });
      setSource(null); setFromQty(''); setOutputs([]); setNote('');
      void reload();
      void useCatalog.getState().load(true);
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Banner text={msg?.text} kind={msg?.kind} />
      <Card>
        <T weight="600">Take from</T>
        {source ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><T>{source.name}</T><Muted>{qty(source.stock_qty, source.unit)} in stock</Muted></View>
            <Button title="Change" small kind="ghost" onPress={() => setSource(null)} />
          </Row>
        ) : <ProductPicker target="convert-from" onPick={setSource} />}
        <Field label={`Quantity taken${source ? ` (${source.unit})` : ''}`} value={fromQty} onChangeText={setFromQty} keyboardType="decimal-pad" />
      </Card>

      <Card>
        <T weight="600">Turn into</T>
        {outputs.map((o, i) => (
          <Row key={o.product.id}>
            <View style={{ flex: 2 }}><T>{o.product.name}</T><Muted size={12}>{qty(o.product.stock_qty, o.product.unit)} in stock</Muted></View>
            <View style={{ flex: 1 }}><Field placeholder={`Made (${o.product.unit})`} value={o.quantity} keyboardType="decimal-pad"
              onChangeText={(v) => setOutputs((all) => all.map((x, j) => (j === i ? { ...x, quantity: v } : x)))} /></View>
            <Pressable hitSlop={8} onPress={() => setOutputs((all) => all.filter((_, j) => j !== i))}>
              <Ionicons name="trash-outline" size={20} color={c.danger} />
            </Pressable>
          </Row>
        ))}
        {picking || !outputs.length ? (
          <ProductPicker target="convert-to" placeholder="Product made" onPick={(p) => {
            setOutputs((all) => (all.some((x) => x.product.id === p.id) ? all : [...all, { product: p, quantity: '' }]));
            setPicking(false);
          }} />
        ) : <Button title="Add another product" small kind="ghost" icon="add" onPress={() => setPicking(true)} />}
        <Muted size={12}>When the sizes are known (kg, litres, or a size like 2kg in the name), what is made must add up to what is taken. The cost is shared by size.</Muted>
      </Card>

      <Field label="Note" value={note} onChangeText={setNote} />
      <Button title="Convert" icon="swap-horizontal" busy={busy} disabled={!source || !fromQty || !outputs.length || outputs.some((o) => !o.quantity)} onPress={save} />

      {data?.conversions.length ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 14, paddingBottom: 4 }}><T weight="600">Recent</T></View>
          {data.conversions.map((cv) => (
            <ListItem key={cv.id} title={`${qty(cv.from_qty, cv.from_unit)} ${cv.from_product}`}
              subtitle={`${dateTime(cv.created_at)} · into ${cv.lines.map((l) => `${qty(l.quantity, l.unit)} ${l.product}`).join(', ')}`} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
