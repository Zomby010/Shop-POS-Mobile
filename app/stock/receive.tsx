import { useRef, useState } from 'react';
import { View } from 'react-native';

import { get, post, requestId } from '@/api/client';
import type { Product, Supplier } from '@/api/types';
import { ProductPicker } from '@/components/ProductPicker';
import { Banner, Button, Card, ChipRow, Field, KeyValue, ListItem, Muted, Row, Screen, T, useColors } from '@/components/ui';
import { money } from '@/lib/format';
import { centsToDecimal, divRound, ksh, parseMoney, parseQty } from '@/lib/money';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';
import { can, useSession } from '@/store/session';

interface Item { product: Product; packs: string; packSize: string; packCost: string; newPrice: string }

/** Receive stock: '2 bales × 24 pcs at KSh 50' adds 48 pcs for KSh 2,400. Leave Paid now blank if paid in full. */
export default function Receive() {
  const c = useColors();
  const user = useSession((s) => s.user);
  const { data } = useApi(() => get<{ suppliers: Supplier[] }>('suppliers/'));
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierTerm, setSupplierTerm] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [ref, setRef] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);
  const attempt = useRef(requestId());
  const mayPrice = can(user, 'change_prices');

  const lineCost = (i: Item) => {
    const packs = parseQty(i.packs || '1') ?? 0;
    const cost = parseMoney(i.packCost) ?? 0;
    return divRound(BigInt(packs) * BigInt(cost), 1000);
  };
  const total = items.reduce((s, i) => s + lineCost(i), 0);
  const update = (idx: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, j) => (j === idx ? { ...x, ...patch } : x)));

  const save = async () => {
    setBusy(true);
    try {
      const res = await post<{ purchase: { code: string; total: string; payment_status: string } }>('purchases/', {
        request_id: attempt.current, supplier_id: supplier?.id ?? null, supplier_reference: ref,
        amount_paid: paid.trim() === '' ? null : paid, payment_method: method,
        items: items.map((i) => ({ product_id: i.product.id, packs: i.packs || '1', pack_size: i.packSize || '1', pack_cost: i.packCost,
          new_price: mayPrice && i.newPrice ? i.newPrice : null })),
      });
      attempt.current = requestId();
      setMsg({ text: `${res.purchase.code} saved: ${money(res.purchase.total)}, ${res.purchase.payment_status.toLowerCase()}.`, kind: 'good' });
      setItems([]); setRef(''); setPaid('');
      void useCatalog.getState().load(true);
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const suppliers = (data?.suppliers ?? []).filter((s) => s.active && s.name.toLowerCase().includes(supplierTerm.toLowerCase())).slice(0, 6);

  return (
    <Screen>
      <Banner text={msg?.text} kind={msg?.kind} />
      <Card>
        <T weight="600">Supplier</T>
        {supplier ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <T>{supplier.name}</T>
            <Button title="Change" kind="ghost" small onPress={() => setSupplier(null)} />
          </Row>
        ) : (
          <>
            <Field value={supplierTerm} onChangeText={setSupplierTerm} placeholder="Search suppliers" />
            {supplierTerm ? suppliers.map((s) => <ListItem key={s.id} title={s.name} subtitle={`Owed ${money(s.owed)}`} onPress={() => setSupplier(s)} />) : null}
          </>
        )}
        <Field label="Supplier's invoice or delivery number" value={ref} onChangeText={setRef} />
      </Card>

      <Card>
        <T weight="600">Items</T>
        <ProductPicker target="receive" onPick={(p) => setItems((xs) => [...xs, { product: p, packs: '', packSize: '1', packCost: '', newPrice: '' }])} />
        {items.map((i, idx) => (
          <View key={`${i.product.id}-${idx}`} style={{ gap: 6, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}><T weight="600">{i.product.name}</T></View>
              <Button title="Remove" kind="ghost" small onPress={() => setItems((xs) => xs.filter((_, j) => j !== idx))} />
            </Row>
            <Row>
              <View style={{ flex: 1 }}><Field label="Packs" value={i.packs} onChangeText={(v) => update(idx, { packs: v })} keyboardType="decimal-pad" placeholder="1" /></View>
              <View style={{ flex: 1 }}><Field label={`${i.product.unit} per pack`} value={i.packSize} onChangeText={(v) => update(idx, { packSize: v })} keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Cost per pack" value={i.packCost} onChangeText={(v) => update(idx, { packCost: v })} keyboardType="decimal-pad" /></View>
            </Row>
            {mayPrice ? (
              <Field label={`New selling price per ${i.product.unit} (optional)`} value={i.newPrice} onChangeText={(v) => update(idx, { newPrice: v })}
                keyboardType="decimal-pad" placeholder={`Keep ${money(i.product.selling_price)}`} />
            ) : null}
            <Muted size={12}>Line cost {ksh(lineCost(i))}</Muted>
          </View>
        ))}
      </Card>

      <Card>
        <KeyValue label="Total cost of goods" value={ksh(total)} strong />
        <Field label="Paid now (KSh)" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" placeholder={centsToDecimal(total)}
          hint="Leave blank if paid in full; anything less is owed to the supplier." />
        <ChipRow value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-Pesa' }, { value: 'bank', label: 'Bank' }]} />
        <Button title="Save delivery" onPress={save} busy={busy} disabled={!items.length || items.some((i) => !i.packCost)} />
      </Card>
    </Screen>
  );
}
