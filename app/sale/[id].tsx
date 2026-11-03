import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { get, post } from '@/api/client';
import type { SaleDetail } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, KeyValue, Loading, Muted, PinSheet, Row, Screen, Sheet, T, useColors } from '@/components/ui';
import { METHOD_LABELS, dateTime, money, qty } from '@/lib/format';
import { printReceipt, shareReceipt } from '@/lib/receipt';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';
import { can, levelOf, useSession } from '@/store/session';

/** One sale: lines, payments, refunds, reprint, and refund or void with the owner's PIN. */
export default function Sale() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const paper = useSession((s) => s.settings?.paper_width_mm ?? 80);
  const { data: sale, error, loading, setData } = useApi(() => get<SaleDetail>(`sales/${id}/`), [id]);
  const [refunding, setRefunding] = useState(false);
  const [qtys, setQtys] = useState<Record<number, string>>({});
  const [method, setMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [approval, setApproval] = useState<'refund' | 'void' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const mayRefund = can(user, 'refund');
  const needsPin = levelOf(user, 'refund') !== 'yes';

  const act = async (kind: 'refund' | 'void', pin: string, why: string): Promise<string | void> => {
    try {
      const body = kind === 'void' ? { reason: why, pin }
        : { reason: why, pin, method, quantities: Object.fromEntries(Object.entries(qtys).filter(([, v]) => v.trim())) };
      const updated = await post<SaleDetail>(`sales/${id}/${kind}/`, body);
      setData(updated);
      setRefunding(false);
      setQtys({});
      setMessage(kind === 'void' ? 'Sale voided. Stock is back and payments are reversed.' : 'Refund saved.');
      void useCatalog.getState().load(true);
    } catch (e) {
      return (e as Error).message;
    }
  };

  if (!sale) return <Screen>{loading ? <Loading /> : <Banner text={error} />}</Screen>;
  const open = sale.status === 'completed';

  return (
    <Screen>
      <Banner text={message} kind="good" />
      <Banner text={problem} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={18} weight="700">{sale.receipt_no}</T>
          <T weight="600" color={sale.status === 'voided' ? c.danger : undefined}>{sale.status_label}</T>
        </Row>
        <Muted>{dateTime(sale.completed_at)} · {sale.cashier}{sale.customer ? ` · ${sale.customer}` : ''}</Muted>
        <T size={26} weight="700">{money(sale.total)}</T>
        {sale.payments.map((p) => <KeyValue key={p.method} label={`${METHOD_LABELS[p.method]}${p.reference ? ` ${p.reference}` : ''}`} value={money(p.amount)} />)}
        {Number(sale.refunded) > 0 ? <KeyValue label="Refunded" value={money(sale.refunded)} color={c.danger} /> : null}
        {Number(sale.credit_due) > 0 ? <KeyValue label="Deni still owed" value={money(sale.credit_due)} color={c.warning} /> : null}
      </Card>

      <Card>
        {sale.lines.map((l) => (
          <View key={l.id} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}><T weight="500">{l.description}</T></View>
              <T weight="600">{money(l.line_total)}</T>
            </Row>
            <Muted size={12}>{qty(l.quantity, l.unit)} × {money(l.unit_price)}{l.tier_applied ? ' · bulk' : ''}{Number(l.refunded_qty) > 0 ? ` · ${qty(l.refunded_qty, l.unit)} returned` : ''}</Muted>
            {refunding && Number(l.refundable_qty) > 0 ? (
              <Field placeholder={`Return up to ${qty(l.refundable_qty, l.unit)}`} keyboardType="decimal-pad"
                value={qtys[l.id] ?? ''} onChangeText={(v) => setQtys((q) => ({ ...q, [l.id]: v }))} />
            ) : null}
          </View>
        ))}
      </Card>

      {sale.refunds.length ? (
        <Card>
          <T weight="600">Refunds</T>
          {sale.refunds.map((r) => (
            <Muted key={r.id}>{dateTime(r.created_at)} · {money(r.total)} {METHOD_LABELS[r.method] ?? r.method} · {r.reason} (by {r.user}, approved by {r.authorised_by})</Muted>
          ))}
        </Card>
      ) : null}

      {sale.receipt_lines ? (
        <Row>
          <View style={{ flex: 1 }}><Button title="Reprint" kind="secondary" icon="print-outline" onPress={() => void printReceipt(sale.receipt_lines!, paper)} /></View>
          <View style={{ flex: 1 }}><Button title="Share" kind="secondary" icon="share-outline" onPress={() => void shareReceipt(sale.receipt_lines!, paper, sale.receipt_no)} /></View>
        </Row>
      ) : null}

      {open && mayRefund && !refunding ? (
        <Row>
          <View style={{ flex: 1 }}><Button title="Refund items" kind="secondary" icon="return-down-back-outline" onPress={() => setRefunding(true)} /></View>
          {!sale.refunds.length ? <View style={{ flex: 1 }}><Button title="Void sale" kind="danger" icon="close-circle-outline" onPress={() => setApproval('void')} /></View> : null}
        </Row>
      ) : null}
      {refunding ? (
        <Card>
          <T weight="600">Give money back by</T>
          <ChipRow value={method} onChange={setMethod} options={[
            { value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-Pesa' },
            ...(sale.customer_id ? [{ value: 'credit', label: "Reduce customer's deni" }] : []),
          ]} />
          <Field label="Reason" value={reason} onChangeText={setReason} />
          <Row>
            <View style={{ flex: 1 }}><Button title="Cancel" kind="ghost" onPress={() => setRefunding(false)} /></View>
            <View style={{ flex: 1 }}><Button title="Refund" onPress={() => (needsPin ? setApproval('refund') : void act('refund', '', reason).then((m) => setProblem(m || null)))} /></View>
          </Row>
        </Card>
      ) : null}

      <PinSheet visible={approval === 'void'} title="Void the whole sale?" withReason onClose={() => setApproval(null)}
        onSubmit={(pin, why) => act('void', pin, why)} />
      <Sheet visible={approval === 'refund'} title="Owner approval" onClose={() => setApproval(null)}>
        <RefundPin onSubmit={(pin) => act('refund', pin, reason)} onDone={() => setApproval(null)} />
      </Sheet>
    </Screen>
  );
}

function RefundPin({ onSubmit, onDone }: { onSubmit: (pin: string) => Promise<string | void>; onDone: () => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Banner text={err} />
      <Field label="Owner's PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry autoFocus />
      <Button title="Approve refund" busy={busy} onPress={async () => {
        setBusy(true);
        const problem = await onSubmit(pin);
        setBusy(false);
        if (problem) setErr(problem); else onDone();
      }} />
    </>
  );
}
