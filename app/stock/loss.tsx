import { useState } from 'react';

import { get, post } from '@/api/client';
import type { Product } from '@/api/types';
import { ProductPicker } from '@/components/ProductPicker';
import { Banner, Button, Card, ChipRow, Field, ListItem, Screen, T } from '@/components/ui';
import { dateTime, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';

interface Losses { reasons: string[]; recent: { id: number; product: string; quantity: string; unit: string; reason: string; created_at: string; user: string | null }[] }

/** Record spillage, scooping loss, expiry or damage. */
export default function Loss() {
  const { data, reload } = useApi(() => get<Losses>('losses/'));
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);

  const save = async () => {
    if (!product) return;
    setBusy(true);
    try {
      await post('losses/', { product_id: product.id, quantity, reason, note });
      setMsg({ text: `Recorded ${quantity} ${product.unit} of ${product.name} lost.`, kind: 'good' });
      setProduct(null); setQuantity(''); setNote('');
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
        {product ? <T weight="600">{product.name} · {qty(product.stock_qty, product.unit)} in stock</T> : <ProductPicker target="loss" onPick={setProduct} />}
        <Field label={`Quantity lost${product ? ` (${product.unit})` : ''}`} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <ChipRow value={reason} onChange={setReason} options={(data?.reasons ?? []).map((r) => ({ value: r, label: r }))} />
        <Field label="Note" value={note} onChangeText={setNote} />
        <Button title="Record loss" onPress={save} busy={busy} disabled={!product || !quantity || !reason} />
        {product ? <Button title="Pick another product" kind="ghost" small onPress={() => setProduct(null)} /> : null}
      </Card>
      {data?.recent.length ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {data.recent.map((m) => (
            <ListItem key={m.id} title={m.product} subtitle={`${dateTime(m.created_at)} · ${m.reason}`} right={qty(m.quantity, m.unit)} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
