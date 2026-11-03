import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { get, post, requestId } from '@/api/client';
import type { CustomerDetail } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, KeyValue, ListItem, Loading, Muted, Row, Screen, T, useColors } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

/** A customer's deni statement, unpaid sales, and a repayment form. */
export default function CustomerScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const { data, error, loading, reload } = useApi(() => get<CustomerDetail>(`customers/${id}/`), [id]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'mpesa'>('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);
  const attempt = useRef(requestId());
  const navigation = useNavigation();
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push({ pathname: '/customer/edit', params: { id } })} hitSlop={12} style={{ padding: 8 }} accessibilityLabel="Edit customer">
          <Ionicons name="create-outline" size={22} color={c.text} />
        </Pressable>
      ),
    });
  }, [navigation, router, c, id]);

  if (!data) return <Screen>{loading ? <Loading /> : <Banner text={error} />}</Screen>;

  const repay = async () => {
    setBusy(true);
    try {
      await post(`customers/${id}/repayments/`, { amount, method, note, request_id: attempt.current });
      attempt.current = requestId();
      setMsg({ text: `Recorded repayment of ${money(amount)}.`, kind: 'good' });
      setAmount('');
      setNote('');
      await reload();
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Card>
        <T size={20} weight="700">{data.name}{data.active ? '' : ' (inactive)'}</T>
        {data.phone ? <Muted>{data.phone}</Muted> : null}
        <KeyValue label="Owes" value={money(data.balance)} strong color={Number(data.balance) > 0 ? c.warning : undefined} />
        <KeyValue label="Credit limit" value={data.credit_limit ? money(data.credit_limit) : 'No limit'} />
        {data.available_credit !== null ? <KeyValue label="Credit left" value={money(data.available_credit)} /> : null}
        {data.phone ? (
          <Row>
            <View style={{ flex: 1 }}><Button title="Call" small kind="secondary" icon="call-outline" onPress={() => void Linking.openURL(`tel:${data.phone}`)} /></View>
            <View style={{ flex: 1 }}><Button title="SMS" small kind="secondary" icon="chatbubble-outline"
              onPress={() => void Linking.openURL(`sms:${data.phone}?body=${encodeURIComponent(`Hello ${data.name}, your balance is ${money(data.balance)}.`)}`)} /></View>
          </Row>
        ) : null}
      </Card>

      {can(user, 'repayments') ? (
        <Card>
          <T weight="600">Record a repayment</T>
          <Banner text={msg?.text} kind={msg?.kind} />
          <Field label="Amount (KSh)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <ChipRow value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-Pesa' }]} />
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="M-Pesa code or reference" />
          <Button title="Save repayment" onPress={repay} busy={busy} disabled={!amount} />
          <Muted size={12}>Repayments pay the oldest deni first.</Muted>
        </Card>
      ) : null}

      {data.unpaid_sales.length ? (
        <Card>
          <T weight="600">Unpaid deni sales</T>
          {data.unpaid_sales.map((s) => (
            <KeyValue key={s.id} label={`${s.receipt_no} · ${dateTime(s.completed_at)}`} value={`${money(s.credit_due)} of ${money(s.total)}`} />
          ))}
        </Card>
      ) : null}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: 14 }}><T weight="600">Deni statement</T></View>
        {data.statement.length ? data.statement.map((e) => (
          <ListItem key={e.id} title={e.kind === 'charge' ? `Deni${e.receipt_no ? ` ${e.receipt_no}` : ''}` : `Repaid${e.method ? ` (${e.method === 'mpesa' ? 'M-Pesa' : 'cash'})` : ''}`}
            subtitle={`${dateTime(e.created_at)}${e.note ? ` · ${e.note}` : ''}`}
            right={money(e.signed_amount)} tone={e.kind === 'charge' ? c.warning : c.good} />
        )) : <View style={{ padding: 14 }}><Muted>No deni yet.</Muted></View>}
      </Card>

      {data.recent_sales.length ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 14 }}><T weight="600">Recent sales</T></View>
          {data.recent_sales.map((s) => (
            <ListItem key={s.id} title={s.receipt_no} subtitle={dateTime(s.completed_at)} right={money(s.total)} rightSub={s.status_label}
              onPress={() => router.push({ pathname: '/sale/[id]', params: { id: String(s.id) } })} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
