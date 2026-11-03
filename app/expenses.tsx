import { useState } from 'react';
import { Alert, View } from 'react-native';

import { get, post } from '@/api/client';
import type { Dec } from '@/api/types';
import { DateButton, PeriodPicker } from '@/components/PeriodPicker';
import { useExcelButton } from '@/components/Report';
import { Banner, Button, Card, ChipRow, Empty, Field, KeyValue, ListItem, Muted, Screen, Sheet, T } from '@/components/ui';
import { METHOD_LABELS, day, money } from '@/lib/format';
import { type Range, isoDay, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';

interface Expense { id: number; date: string; category: string; amount: Dec; method: string; note: string }
interface Expenses { categories: { id: number; name: string }[]; total: Dec; expenses: Expense[] }

/** Rent, electricity, transport, wages. Cash from the drawer comes off the expected cash at cash-up. */
export default function ExpensesScreen() {
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'this_month' });
  const { data, error, loading, reload } = useApi(() => get<Expenses>('expenses/', rangeQuery(range)), [rangeKey(range)]);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(isoDay(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Expense | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);
  useExcelButton('expenses', rangeQuery(range), 'Expenses', (m) => setMsg({ text: m, kind: 'danger' }));

  const save = async () => {
    setBusy(true);
    try {
      await post('expenses/', { category_id: Number(category), amount, method, note, date });
      setMsg({ text: `Expense of ${money(amount)} saved.`, kind: 'good' });
      setAmount(''); setNote('');
      void reload();
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const remove = (e: Expense) => Alert.alert('Delete this expense?', `${e.category} ${money(e.amount)} on ${day(e.date)}. Use this only for one typed by mistake.`, [
    { text: 'Back' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      setBusy(true);
      try {
        await post(`expenses/${e.id}/delete/`, { confirm: true });
        setOpen(null); setMsg({ text: 'Expense deleted.', kind: 'good' });
        void reload();
      } catch (x) {
        setMsg({ text: (x as Error).message, kind: 'danger' });
      } finally {
        setBusy(false);
      }
    } },
  ]);

  return (
    <Screen>
      <Banner text={error ?? msg?.text} kind={error ? 'danger' : msg?.kind} />
      <Card>
        <T weight="600">Add an expense</T>
        <ChipRow value={category} onChange={setCategory} options={(data?.categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />
        <Field label="Amount (KSh)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <ChipRow value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Cash (from drawer)' }, { value: 'mpesa', label: 'M-Pesa' }, { value: 'bank', label: 'Bank' }]} />
        <View style={{ flexDirection: 'row' }}><DateButton label="Date" value={date} onChange={setDate} /></View>
        <Field label="Note" value={note} onChangeText={setNote} />
        <Button title="Save expense" onPress={save} busy={busy} disabled={!category || !amount} />
      </Card>
      <PeriodPicker value={range} onChange={setRange} />
      {data ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 14 }}><KeyValue label="Total for the period" value={money(data.total)} strong /></View>
          {data.expenses.length ? data.expenses.map((e) => (
            <ListItem key={e.id} title={e.category} subtitle={`${day(e.date)} · ${METHOD_LABELS[e.method] ?? e.method}${e.note ? ` · ${e.note}` : ''}`}
              right={money(e.amount)} onPress={() => setOpen(e)} />
          )) : <Empty text="No expenses in this period." />}
        </Card>
      ) : loading ? <Muted>Loading…</Muted> : null}
      <Sheet visible={!!open} title={open?.category ?? ''} onClose={() => setOpen(null)}>
        {open ? (
          <>
            <KeyValue label="Amount" value={money(open.amount)} strong />
            <KeyValue label="Date" value={day(open.date)} />
            <KeyValue label="Paid by" value={METHOD_LABELS[open.method] ?? open.method} />
            {open.note ? <Muted>{open.note}</Muted> : null}
            <Button title="Delete expense" kind="ghost" small disabled={busy} onPress={() => remove(open)} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
