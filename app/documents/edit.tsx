import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { get, post } from '@/api/client';
import type { Customer, DocChoices, DocDetail, Product, Supplier } from '@/api/types';
import { DateButton } from '@/components/PeriodPicker';
import { ProductPicker } from '@/components/ProductPicker';
import { Banner, Button, Card, ChipRow, Field, ListItem, Loading, Muted, Row, Screen, T, useColors } from '@/components/ui';
import { qty } from '@/lib/format';
import { ksh, mulQtyPrice, parseMoney, parseQty } from '@/lib/money';
import { isoDay } from '@/lib/period';

interface Line { key: string; id?: number; product_id: number | null; description: string; quantity: string; unit: string; unit_price: string }
interface Party { id: number; name: string }

const PARTY_TYPES = [{ value: 'customer', label: 'Customer' }, { value: 'supplier', label: 'Supplier' }, { value: 'other', label: 'One-off' }];
let seq = 0;
const newKey = () => `n${++seq}`;

/** Search customers or suppliers and pick one. */
function PartyPicker({ kind, value, onPick }: { kind: 'customer' | 'supplier'; value: Party | null; onPick: (p: Party | null) => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Party[]>([]);
  useEffect(() => {
    if (!term.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        if (kind === 'customer') setResults((await get<{ customers: Customer[] }>('customers/', { q: term, active: 1 })).customers.slice(0, 6));
        else setResults((await get<{ suppliers: Supplier[] }>('suppliers/', { q: term })).suppliers.slice(0, 6));
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [term, kind]);
  if (value) {
    return (
      <Row style={{ justifyContent: 'space-between' }}>
        <T weight="600">{value.name}</T>
        <Button title="Change" small kind="ghost" onPress={() => onPick(null)} />
      </Row>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <Field value={term} onChangeText={setTerm} placeholder={kind === 'customer' ? 'Search customers' : 'Search suppliers'} autoCorrect={false} />
      {results.map((p) => <ListItem key={p.id} title={p.name} onPress={() => { onPick(p); setTerm(''); }} />)}
    </View>
  );
}

/** Create or edit an invoice or quotation with the website's form: who it is for, dates, lines and discount. */
export default function EditDocument() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: string; customer?: string; customer_name?: string }>();
  const editing = !!params.id;
  const [ready, setReady] = useState(!editing);
  const [kind, setKind] = useState(params.kind === 'quotation' ? 'quotation' : 'invoice');
  const [partyType, setPartyType] = useState<'customer' | 'supplier' | 'other'>('customer');
  const [customer, setCustomer] = useState<Party | null>(params.customer ? { id: Number(params.customer), name: params.customer_name ?? '' } : null);
  const [supplier, setSupplier] = useState<Party | null>(null);
  const [partyName, setPartyName] = useState('');
  const [partyDetails, setPartyDetails] = useState('');
  const today = isoDay(new Date());
  const [date, setDate] = useState(today);
  const [extraDate, setExtraDate] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [statuses, setStatuses] = useState<DocChoices['statuses']>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      get<DocChoices & { documents: unknown[] }>('documents/', { kind: 'none' }).then((r) => setStatuses(r.statuses)).catch(() => undefined);
      return;
    }
    get<{ document: DocDetail } & DocChoices>(`documents/${params.id}/`).then(({ document: d, statuses: s }) => {
      setKind(d.kind); setPartyType(d.party_type); setPartyName(d.party_name); setPartyDetails(d.party_details);
      if (d.customer_id) setCustomer({ id: d.customer_id, name: d.party });
      if (d.supplier_id) setSupplier({ id: d.supplier_id, name: d.party });
      setDate(d.date); setExtraDate(d.kind === 'quotation' ? d.valid_until : d.due_date); setBulk(d.is_bulk);
      setDiscount(Number(d.discount) ? d.discount : ''); setNotes(d.notes); setStatus(d.status); setStatuses(s);
      setLines(d.lines.map((l) => ({ key: String(l.id), id: l.id, product_id: l.product_id, description: l.description,
        quantity: qty(l.quantity), unit: l.unit, unit_price: l.unit_price })));
      setReady(true);
    }).catch((e: Error) => { setError(e.message); setReady(true); });
  }, [editing, params.id]);

  const addProduct = (p: Product) => setLines((ls) => [...ls, { key: newKey(), product_id: p.id, description: p.name, quantity: '1', unit: p.unit, unit_price: '' }]);
  const addText = () => setLines((ls) => [...ls, { key: newKey(), product_id: null, description: '', quantity: '1', unit: '', unit_price: '' }]);
  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = async () => {
    setBusy(true); setError(null);
    const body = {
      ...(editing ? {} : { kind }), party_type: partyType, customer: partyType === 'customer' ? customer?.id ?? '' : '',
      supplier: partyType === 'supplier' ? supplier?.id ?? '' : '', party_name: partyName, party_details: partyDetails,
      date, [kind === 'quotation' ? 'valid_until' : 'due_date']: extraDate ?? '', is_bulk: bulk, discount: discount || '0',
      notes, status,
      lines: lines.map((l) => ({ id: l.id, product: l.product_id ?? '', description: l.description, quantity: l.quantity,
        unit: l.unit, unit_price: l.unit_price })),
    };
    try {
      const r = await post<{ document: DocDetail }>(editing ? `documents/${params.id}/` : 'documents/', body);
      router.replace({ pathname: '/documents/[id]', params: { id: String(r.document.id) } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <Loading />;
  return (
    <Screen>
      <Banner text={error} />
      {!editing ? <ChipRow options={[{ value: 'invoice', label: 'Invoice' }, { value: 'quotation', label: 'Quotation' }]} value={kind} onChange={setKind} /> : null}
      <Card>
        <T weight="600">For</T>
        <ChipRow options={PARTY_TYPES} value={partyType} onChange={(v) => setPartyType(v as typeof partyType)} />
        {partyType === 'customer' ? <PartyPicker kind="customer" value={customer} onPick={setCustomer} /> : null}
        {partyType === 'supplier' ? <PartyPicker kind="supplier" value={supplier} onPick={setSupplier} /> : null}
        {partyType === 'other' ? (
          <>
            <Field label="Name" value={partyName} onChangeText={setPartyName} />
            <Field label="Phone, address or email" value={partyDetails} onChangeText={setPartyDetails} />
          </>
        ) : null}
      </Card>
      <Card>
        <T weight="600">Dates</T>
        <Row>
          <DateButton label="Date" value={date} onChange={setDate} />
          {extraDate ? <DateButton label={kind === 'quotation' ? 'Valid until' : 'Due'} value={extraDate} onChange={setExtraDate} /> : null}
        </Row>
        {extraDate ? <Button title={kind === 'quotation' ? 'No expiry date' : 'No due date'} small kind="ghost" onPress={() => setExtraDate(null)} />
          : <Button title={kind === 'quotation' ? 'Add a valid-until date' : 'Add a due date'} small kind="ghost" onPress={() => setExtraDate(today)} />}
      </Card>
      <Card>
        <T weight="600">Items</T>
        {lines.map((l) => {
          const total = l.unit_price ? ksh(mulQtyPrice(parseQty(l.quantity) ?? 0, parseMoney(l.unit_price) ?? 0)) : 'price from product';
          return (
            <View key={l.key} style={{ borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8, gap: 6 }}>
              <Field value={l.description} onChangeText={(v) => setLine(l.key, { description: v })} placeholder="Description" />
              <Row>
                <View style={{ flex: 1 }}><Field label={`Quantity${l.unit ? ` (${l.unit})` : ''}`} value={l.quantity} keyboardType="decimal-pad" onChangeText={(v) => setLine(l.key, { quantity: v })} /></View>
                <View style={{ flex: 1 }}><Field label="Unit price (KSh)" value={l.unit_price} keyboardType="decimal-pad" placeholder={l.product_id ? 'Product price' : ''}
                  onChangeText={(v) => setLine(l.key, { unit_price: v })} /></View>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Muted>{total}</Muted>
                <Pressable onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Muted>Remove</Muted>
                </Pressable>
              </Row>
            </View>
          );
        })}
        <ProductPicker target="document" onPick={addProduct} placeholder="Add a product…" />
        <Button title="Add a line without a product" small kind="ghost" onPress={addText} />
      </Card>
      <Card>
        <T weight="600">Totals and notes</T>
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <Muted size={14}>Bulk order (use bulk tier prices)</Muted>
          <Switch value={bulk} onValueChange={setBulk} />
        </Row>
        <Field label="Discount (KSh)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Payment details, delivery terms…" />
        {statuses.length ? <ChipRow options={statuses.filter((s) => s.value !== 'converted')} value={status} onChange={setStatus} /> : null}
      </Card>
      <Button title={editing ? 'Save changes' : `Save ${kind}`} busy={busy} disabled={!lines.length} onPress={save} />
      <Muted size={12}>Totals are worked out by the website when you save, using {bulk ? 'bulk tier' : 'normal'} prices for products without a typed price.</Muted>
    </Screen>
  );
}
