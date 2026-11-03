import { useState } from 'react';

import { get, post } from '@/api/client';
import type { Dec } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, KeyValue, ListItem, Screen } from '@/components/ui';
import { METHOD_LABELS, day, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

interface Expenses { categories: { id: number; name: string }[]; total: Dec; expenses: { id: number; date: string; category: string; amount: Dec; method: string; note: string }[] }

/** Rent, electricity, transport, wages. Cash from the drawer comes off the expected cash at cash-up. */
export default function ExpensesScreen() {
  const { data, error, reload } = useApi(() => get<Expenses>('expenses/'));
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);

  const save = async () => {
    setBusy(true);
    try {
      await post('expenses/', { category_id: Number(category), amount, method, note });
      setMsg({ text: `Expense of ${money(amount)} saved.`, kind: 'good' });
      setAmount(''); setNote('');
      void reload();
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Banner text={error ?? msg?.text} kind={error ? 'danger' : msg?.kind} />
      <Card>
        <ChipRow value={category} onChange={setCategory} options={(data?.categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />
        <Field label="Amount (KSh)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <ChipRow value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Cash (from drawer)' }, { value: 'mpesa', label: 'M-Pesa' }, { value: 'bank', label: 'Bank' }]} />
        <Field label="Note" value={note} onChangeText={setNote} />
        <Button title="Save expense" onPress={save} busy={busy} disabled={!category || !amount} />
      </Card>
      {data ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Card style={{ borderWidth: 0 }}><KeyValue label="Last 30 days" value={money(data.total)} strong /></Card>
          {data.expenses.map((e) => (
            <ListItem key={e.id} title={e.category} subtitle={`${day(e.date)} · ${METHOD_LABELS[e.method] ?? e.method}${e.note ? ` · ${e.note}` : ''}`} right={money(e.amount)} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
