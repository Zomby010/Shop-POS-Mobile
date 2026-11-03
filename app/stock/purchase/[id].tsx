import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { get, post, requestId } from '@/api/client';
import type { Choice, PurchaseDetail } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, KeyValue, ListItem, Loading, Muted, Screen, Sheet, T } from '@/components/ui';
import { dateTime, money, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';
import { can, useSession } from '@/store/session';

/** One delivery: what came in, what was paid, pay the supplier, or cancel it. */
export default function Purchase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const { data, error, loading, setData } = useApi(() => get<{ purchase: PurchaseDetail; methods: Choice[] }>(`purchases/${id}/`), [id]);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [rid, setRid] = useState(requestId());
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);

  if (loading && !data) return <Loading />;
  if (!data) return <Screen><Banner text={error} /></Screen>;
  const p = data.purchase;
  const owed = !p.cancelled && Number(p.balance) > 0;

  const run = async (path: string, body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await post<{ purchase: PurchaseDetail }>(path, body);
      setData({ ...data, purchase: r.purchase });
      setPaying(false); setCancelling(false); setAmount(''); setNote(''); setReason(''); setRid(requestId());
      setMsg({ text: done, kind: 'good' });
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
        <T size={18} weight="700">{p.code}</T>
        <Muted>{p.supplier ?? 'No supplier'}{p.supplier_reference ? ` · ${p.supplier_reference}` : ''} · {p.date}</Muted>
        {p.note ? <Muted>{p.note}</Muted> : null}
        <KeyValue label="Total" value={money(p.total)} strong />
        <KeyValue label="Paid" value={money(p.amount_paid)} />
        <KeyValue label="Still owed" value={money(p.balance)} strong={owed} />
        <KeyValue label="Status" value={p.payment_status} />
        {p.cancelled ? <Banner kind="warning" text={`Cancelled ${dateTime(p.cancelled_at)} by ${p.cancelled_by ?? '?'}: ${p.cancel_reason}`} /> : null}
      </Card>
      {owed && can(user, 'pay_supplier') ? (
        <Button title="Pay the supplier" icon="cash-outline" onPress={() => { setAmount(p.balance); setPaying(true); }} />
      ) : null}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: 14, paddingBottom: 4 }}><T weight="600">Items</T></View>
        {p.lines.map((l, i) => (
          <ListItem key={i} title={l.product} subtitle={`${qty(l.packs)} × ${qty(l.pack_size)} ${l.unit} at ${money(l.pack_cost)} · ${money(l.unit_cost)} per ${l.unit}`}
            right={money(l.line_total)} rightSub={qty(l.quantity, l.unit)} />
        ))}
      </Card>

      {p.payments.length ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 14, paddingBottom: 4 }}><T weight="600">Payments</T></View>
          {p.payments.map((pay) => (
            <ListItem key={pay.id} title={`${pay.method_label} · ${pay.date}`} subtitle={[pay.user, pay.note].filter(Boolean).join(' · ') || undefined}
              right={money(pay.amount)} />
          ))}
        </Card>
      ) : null}

      {!p.cancelled && can(user, 'cancel_purchase') ? (
        <Button title="Cancel this purchase" kind="ghost" small onPress={() => setCancelling(true)} />
      ) : null}

      <Sheet visible={paying} title="Pay the supplier" onClose={() => setPaying(false)}>
        <Banner text={msg?.kind === 'danger' ? msg.text : null} />
        <Field label="Amount (KSh)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
        <ChipRow value={method} onChange={setMethod} options={data.methods} />
        <Field label="Note" value={note} onChangeText={setNote} placeholder="M-Pesa code, cheque number…" />
        <Button title="Save payment" busy={busy} disabled={!amount} onPress={() => void run(`purchases/${id}/pay/`,
          { request_id: rid, amount, method, note }, `Payment of KSh ${amount} recorded.`)} />
      </Sheet>

      <Sheet visible={cancelling} title="Cancel this purchase?" onClose={() => setCancelling(false)}>
        <Muted>Use this only for a purchase entered by mistake. Its stock comes off again; payments stay on record.</Muted>
        <Banner text={msg?.kind === 'danger' ? msg.text : null} />
        <Field label="Why cancel?" value={reason} onChangeText={setReason} autoFocus />
        <Button title="Cancel purchase" kind="danger" busy={busy} disabled={!reason.trim()} onPress={() => {
          void run(`purchases/${id}/cancel/`, { reason }, `${p.code} cancelled.`).then(() => useCatalog.getState().load(true));
        }} />
      </Sheet>
    </Screen>
  );
}
