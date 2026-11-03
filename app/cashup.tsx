import { useState } from 'react';

import { get, post } from '@/api/client';
import type { CashUp, ExpectedTakings } from '@/api/types';
import { Banner, Button, Card, Field, KeyValue, ListItem, Loading, Muted, Screen, T, useColors } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

/** End of shift: compare the drawer and M-Pesa with what was recorded since the last cash-up. */
export default function CashUpScreen() {
  const c = useColors();
  const [float, setFloat] = useState('');
  const [cash, setCash] = useState('');
  const [mpesa, setMpesa] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<CashUp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data, error, loading, reload } = useApi(
    () => get<{ expected: ExpectedTakings; recent: CashUp[] }>('cashup/', { opening_float: float }), [float]);
  const e = data?.expected;

  const save = async () => {
    setBusy(true);
    try {
      setSaved(await post<CashUp>('cashup/', { counted_cash: cash, counted_mpesa: mpesa, opening_float: float, note }));
      setCash(''); setMpesa(''); setNote('');
      await reload();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const diffColor = (d: string) => (Number(d) < 0 ? c.danger : Number(d) > 0 ? c.warning : c.good);

  return (
    <Screen>
      <Banner text={error ?? err} />
      {saved ? (
        <Card>
          <T weight="700">Cash-up saved</T>
          <KeyValue label="Cash difference" value={money(saved.cash_difference)} color={diffColor(saved.cash_difference)} strong />
          <KeyValue label="M-Pesa difference" value={money(saved.mpesa_difference)} color={diffColor(saved.mpesa_difference)} strong />
        </Card>
      ) : null}
      {loading && !e ? <Loading /> : null}
      {e ? (
        <Card>
          <Muted>Since {dateTime(e.start)} · {e.sales_count} sale{e.sales_count === 1 ? '' : 's'}</Muted>
          <KeyValue label="Opening float" value={money(e.opening_float)} />
          <KeyValue label="Cash sales" value={money(e.cash_sales)} />
          <KeyValue label="Cash refunds" value={`− ${money(e.cash_refunds)}`} />
          <KeyValue label="Deni repaid in cash" value={money(e.cash_repayments)} />
          <KeyValue label="Expenses from the drawer" value={`− ${money(e.cash_expenses)}`} />
          <KeyValue label="Expected cash" value={money(e.expected_cash)} strong />
          <KeyValue label="M-Pesa sales" value={money(e.mpesa_sales)} />
          <KeyValue label="M-Pesa refunds" value={`− ${money(e.mpesa_refunds)}`} />
          <KeyValue label="Deni repaid by M-Pesa" value={money(e.mpesa_repayments)} />
          <KeyValue label="Expected M-Pesa" value={money(e.expected_mpesa)} strong />
          <KeyValue label="Deni given" value={money(e.credit_sales)} />
        </Card>
      ) : null}
      <Card>
        <Field label="Opening float (KSh)" value={float} onChangeText={setFloat} keyboardType="decimal-pad" hint="Cash in the drawer at the start of the shift." />
        <Field label="Cash counted (KSh)" value={cash} onChangeText={setCash} keyboardType="decimal-pad" />
        <Field label="M-Pesa received (KSh)" value={mpesa} onChangeText={setMpesa} keyboardType="decimal-pad" />
        <Field label="Note" value={note} onChangeText={setNote} />
        <Button title="Save cash-up" onPress={save} busy={busy} disabled={!cash} />
      </Card>
      {data?.recent.length ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {data.recent.map((r) => (
            <ListItem key={r.id} title={`${r.cashier} · ${dateTime(r.period_end)}`} subtitle={`Expected ${money(r.expected_cash)} · counted ${money(r.counted_cash)}`}
              right={money(r.cash_difference)} tone={diffColor(r.cash_difference)} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
