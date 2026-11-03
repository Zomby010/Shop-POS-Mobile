import { useState } from 'react';
import { View } from 'react-native';

import { get, post } from '@/api/client';
import type { Product } from '@/api/types';
import { ProductPicker } from '@/components/ProductPicker';
import { Banner, Button, Card, ChipRow, Field, KeyValue, Muted, Row, Screen, T, useColors } from '@/components/ui';
import { money, qty } from '@/lib/format';
import { parseQty } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';

interface Reasons { shortage_reasons: string[]; surplus_reasons: string[]; kinds: { value: string; label: string }[] }
interface PreviewLine { product_id: number; product: string; unit: string; in_stock: string; counted: string; difference: string; value: string | null; reason: string }

/** Count a few products. Every difference needs a reason, so extra stock is never filed as a loss. */
export default function Recount() {
  const c = useColors();
  const { data: reasons } = useApi(() => get<Reasons>('recounts/'));
  const [rows, setRows] = useState<{ product: Product; counted: string; reason: string }[]>([]);
  const [kind, setKind] = useState('spot');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<PreviewLine[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);

  const body = (confirm: boolean) => ({ kind, note, confirm, counts: rows.map((r) => ({ product_id: r.product.id, counted: r.counted, reason: r.reason })) });
  const send = async (confirm: boolean) => {
    setBusy(true);
    try {
      const res = await post<{ preview?: PreviewLine[]; recount?: string; adjusted?: number }>('recounts/', body(confirm));
      if (confirm) {
        setMsg({ text: `${res.recount} saved. ${res.adjusted} product${res.adjusted === 1 ? '' : 's'} adjusted.`, kind: 'good' });
        setRows([]); setPreview(null); setNote('');
        void useCatalog.getState().load(true);
      } else {
        setPreview(res.preview ?? []);
        setMsg(null);
      }
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const reasonsFor = (p: Product, counted: string) => {
    const diff = (parseQty(counted) ?? 0) - (parseQty(p.stock_qty) ?? 0);
    return diff < 0 ? reasons?.shortage_reasons ?? [] : diff > 0 ? reasons?.surplus_reasons ?? [] : [];
  };

  return (
    <Screen>
      <Banner text={msg?.text} kind={msg?.kind} />
      <ChipRow value={kind} onChange={setKind} options={reasons?.kinds ?? [{ value: 'spot', label: 'Spot check' }]} />
      <Card>
        <ProductPicker target="recount" onPick={(p) => setRows((r) => (r.some((x) => x.product.id === p.id) ? r : [...r, { product: p, counted: '', reason: '' }]))} />
        {rows.map((r, idx) => (
          <View key={r.product.id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}><T weight="600">{r.product.name}</T><Muted>System says {qty(r.product.stock_qty, r.product.unit)}</Muted></View>
              <Button title="Remove" kind="ghost" small onPress={() => setRows((xs) => xs.filter((_, j) => j !== idx))} />
            </Row>
            <Field label={`Counted (${r.product.unit})`} value={r.counted} keyboardType="decimal-pad"
              onChangeText={(v) => { setPreview(null); setRows((xs) => xs.map((x, j) => (j === idx ? { ...x, counted: v, reason: '' } : x))); }} />
            {reasonsFor(r.product, r.counted).length ? (
              <ChipRow value={r.reason} onChange={(v) => setRows((xs) => xs.map((x, j) => (j === idx ? { ...x, reason: v } : x)))}
                options={reasonsFor(r.product, r.counted).map((x) => ({ value: x, label: x }))} />
            ) : null}
          </View>
        ))}
      </Card>
      <Field label="Note" value={note} onChangeText={setNote} />
      {preview ? (
        <Card>
          <T weight="600">Check before saving</T>
          {preview.map((l) => (
            <KeyValue key={l.product_id} label={`${l.product}: ${qty(l.in_stock)} → ${qty(l.counted, l.unit)}`}
              value={`${qty(l.difference, l.unit)}${l.value ? ` (${money(l.value)})` : ''}`} color={Number(l.difference) < 0 ? c.danger : undefined} />
          ))}
          <Button title="Confirm recount" onPress={() => void send(true)} busy={busy} />
        </Card>
      ) : (
        <Button title="Check counts" onPress={() => void send(false)} busy={busy} disabled={!rows.length || rows.some((r) => !r.counted)} />
      )}
    </Screen>
  );
}
