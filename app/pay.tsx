import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { ApiError, get, post, requestId } from '@/api/client';
import type { Customer, SaleDetail } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, KeyValue, ListItem, Muted, Screen, T } from '@/components/ui';
import { cartTotal, toApiLines } from '@/domain/cart';
import { SaleError, planPayment } from '@/domain/payment';
import { money } from '@/lib/format';
import { centsToDecimal, ksh, parseMoney } from '@/lib/money';
import { useCart } from '@/store/cart';
import { useCatalog } from '@/store/catalog';
import { can, useSession } from '@/store/session';

type Mode = 'cash' | 'mpesa' | 'split' | 'credit';

/** Payment: all cash, all M-Pesa, a split, or deni for a customer. Cash covers whatever the others don't. */
export default function Pay() {
  const router = useRouter();
  const { lines, clear, markShort } = useCart();
  const user = useSession((s) => s.user);
  const settings = useSession((s) => s.settings);
  const total = cartTotal(lines);
  const creditOn = !!settings?.allow_credit && can(user, 'sell_credit');
  const [mode, setMode] = useState<Mode>('cash');
  const [cash, setCash] = useState('');
  const [mpesa, setMpesa] = useState('');
  const [credit, setCredit] = useState('');
  const [code, setCode] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per attempt at this cart, so a retry after a dropped connection can't sell twice.
  const attempt = useRef(requestId());

  const amounts = useMemo(() => {
    const m = mode === 'mpesa' ? total : mode === 'split' ? parseMoney(mpesa) ?? 0 : 0;
    const d = mode === 'credit' ? (credit ? parseMoney(credit) ?? 0 : total) : 0;
    const tendered = mode === 'mpesa' ? null : cash ? parseMoney(cash) : null;
    return { mpesaCents: m, creditCents: d, cashTenderedCents: tendered };
  }, [mode, total, cash, mpesa, credit]);

  let plan: ReturnType<typeof planPayment> | null = null;
  let planError: string | null = null;
  try {
    plan = planPayment(total, amounts);
  } catch (e) {
    planError = e instanceof SaleError ? e.message : String(e);
  }

  const findCustomers = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) return setFound([]);
    try {
      const res = await get<{ customers: Customer[] }>('customers/', { q, active: 1 });
      setFound(res.customers.slice(0, 8));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const pay = async () => {
    if (!plan) return setError(planError);
    if (plan.creditCents > 0 && !customer) return setError('Choose the customer who is taking this on deni.');
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ sale: SaleDetail }>('checkout/', {
        request_id: attempt.current, lines: toApiLines(lines), expected_total: centsToDecimal(total),
        cash_tendered: plan.cashCents > 0 ? centsToDecimal(plan.tenderedCents) : null,
        mpesa: centsToDecimal(plan.mpesaCents), credit: centsToDecimal(plan.creditCents),
        customer_id: plan.creditCents > 0 ? customer?.id : null, mpesa_code: plan.mpesaCents > 0 ? code : '',
      });
      clear();
      void useCatalog.getState().load(true);
      router.replace({ pathname: '/receipt/[id]', params: { id: String(res.sale.id), done: '1' } });
    } catch (e) {
      const err = e as ApiError;
      if (Array.isArray(err.body?.products)) markShort(err.body.products as number[]);
      if (err.status === 409) void useCatalog.getState().load(true);
      if (err.status !== 0) attempt.current = requestId(); // the server refused it, so the next try is new
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const options: { value: Mode; label: string }[] = [
    { value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-Pesa' }, { value: 'split', label: 'Split' },
    ...(creditOn ? [{ value: 'credit' as Mode, label: 'Deni' }] : []),
  ];

  return (
    <Screen>
      <Card>
        <Muted>Total to pay</Muted>
        <T size={32} weight="700">{ksh(total)}</T>
      </Card>
      <ChipRow options={options} value={mode} onChange={(m) => { setMode(m); setError(null); }} />
      <Banner text={error} />

      {mode === 'split' ? (
        <Field label="M-Pesa amount (KSh)" value={mpesa} onChangeText={setMpesa} keyboardType="decimal-pad" />
      ) : null}
      {mode === 'credit' ? (
        <>
          <Field label="On deni (KSh)" value={credit} onChangeText={setCredit} keyboardType="decimal-pad"
            placeholder={centsToDecimal(total)} hint="Leave blank to put the whole sale on deni; cash covers the rest." />
          {customer ? (
            <Card>
              <T weight="600">{customer.name}</T>
              <Muted>Owes {money(customer.balance)}{customer.available_credit !== null ? ` · ${money(customer.available_credit)} credit left` : ' · no limit'}</Muted>
              <Button title="Change customer" kind="ghost" small onPress={() => setCustomer(null)} />
            </Card>
          ) : (
            <View style={{ gap: 6 }}>
              <Field label="Customer" value={search} onChangeText={findCustomers} placeholder="Name or phone" />
              {found.map((cu) => (
                <ListItem key={cu.id} title={cu.name} subtitle={cu.phone} right={money(cu.balance)} rightSub="owes"
                  onPress={() => { setCustomer(cu); setFound([]); }} />
              ))}
              <Button title="Add a new customer" kind="secondary" small icon="person-add-outline" onPress={() => router.push('/customer/new')} />
            </View>
          )}
        </>
      ) : null}
      {mode !== 'mpesa' && (plan?.cashCents ?? 1) > 0 ? (
        <Field label="Cash given (KSh)" value={cash} onChangeText={setCash} keyboardType="decimal-pad"
          placeholder={plan ? centsToDecimal(plan.cashCents) : ''} hint="Leave blank for the exact amount." />
      ) : null}
      {mode === 'mpesa' || mode === 'split' ? (
        <Field label="M-Pesa code (optional)" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="e.g. SGH7XK2L9P" />
      ) : null}

      {plan ? (
        <Card>
          {plan.cashCents > 0 ? <KeyValue label="Cash" value={ksh(plan.cashCents)} /> : null}
          {plan.mpesaCents > 0 ? <KeyValue label="M-Pesa" value={ksh(plan.mpesaCents)} /> : null}
          {plan.creditCents > 0 ? <KeyValue label="Deni" value={ksh(plan.creditCents)} /> : null}
          {plan.changeCents > 0 ? <KeyValue label="Change" value={ksh(plan.changeCents)} strong /> : null}
        </Card>
      ) : <Banner text={planError} kind="warning" />}

      <Button title="Complete sale" icon="checkmark-circle-outline" onPress={pay} busy={busy} disabled={!plan || !lines.length} />
    </Screen>
  );
}
