import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { get, post, requestId } from '@/api/client';
import type { DocChoices, DocDetail } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, KeyValue, ListItem, Loading, Muted, Row, Screen, Sheet, T, useColors } from '@/components/ui';
import { sharePdf } from '@/lib/excel';
import { day, money, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';

/** One invoice or quotation: its lines and totals, share the PDF, take a payment, convert, or change the status. */
export default function DocumentScreen() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload, setData } = useApi(() => get<{ document: DocDetail } & DocChoices>(`documents/${id}/`), [id]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const [paying, setPaying] = useState(false);
  const [statusing, setStatusing] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);
  const rid = useRef(requestId());
  const d = data?.document;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: d?.code ?? 'Document',
      headerRight: () => d ? (
        <Row gap={4}>
          <Pressable hitSlop={8} style={{ padding: 8 }} accessibilityLabel="Share PDF" disabled={sharing} onPress={async () => {
            setSharing(true);
            try { await sharePdf(`documents/${d.id}/pdf/`, `${d.code}.pdf`, d.code); } catch (e) { setMsg({ text: (e as Error).message, kind: 'danger' }); } finally { setSharing(false); }
          }}>
            {sharing ? <ActivityIndicator /> : <Ionicons name="share-outline" size={22} color={c.text} />}
          </Pressable>
          {d.status !== 'converted' ? (
            <Pressable hitSlop={8} style={{ padding: 8 }} accessibilityLabel="Edit"
              onPress={() => router.push({ pathname: '/documents/edit', params: { id: String(d.id) } })}>
              <Ionicons name="create-outline" size={22} color={c.text} />
            </Pressable>
          ) : null}
        </Row>
      ) : null,
    });
  }, [navigation, router, c, d, sharing]);

  if (loading && !data) return <Loading />;
  if (!data || !d) return <Screen><Banner text={error} /></Screen>;
  const invoice = d.kind === 'invoice';
  const due = invoice && d.balance_due !== null && Number(d.balance_due) > 0;

  const run = async (path: string, body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await post<{ document: DocDetail }>(path, body);
      if (r.document.id !== d.id) {
        router.replace({ pathname: '/documents/[id]', params: { id: String(r.document.id) } });
        return;
      }
      setData({ ...data, document: r.document });
      setPaying(false); setStatusing(false); setAmount(''); rid.current = requestId();
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
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={18} weight="700">{d.code}</T>
          <Muted>{d.status_label}</Muted>
        </Row>
        <T weight="600">{d.party}</T>
        {d.party_details ? <Muted>{d.party_details}</Muted> : null}
        <Muted>
          {day(d.date)}{d.valid_until ? ` · valid until ${day(d.valid_until)}` : ''}{d.due_date ? ` · due ${day(d.due_date)}` : ''}
          {d.receipt_no ? ` · deni sale ${d.receipt_no}` : ''}{d.is_bulk ? ' · bulk prices' : ''}
        </Muted>
        {d.converted_from ? <Muted>Made from {d.converted_from.code}</Muted> : null}
        {d.converted_to ? (
          <ListItem title={`Converted to ${d.converted_to.code}`} onPress={() => router.push({ pathname: '/documents/[id]', params: { id: String(d.converted_to!.id) } })} />
        ) : null}
      </Card>
      {due ? <Button title="Record payment" icon="cash-outline" onPress={() => { setAmount(d.balance_due!); setPaying(true); }} /> : null}
      {d.kind === 'quotation' && !d.converted_to ? (
        <Button title="Convert to invoice" icon="document-text-outline" busy={busy}
          onPress={() => void run(`documents/${d.id}/convert/`, {}, 'Invoice made.')} />
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {d.lines.map((l) => (
          <ListItem key={l.id} title={l.description} subtitle={`${qty(l.quantity, l.unit)} at ${money(l.unit_price)}`} right={money(l.line_total)} />
        ))}
        <View style={{ padding: 14, gap: 6 }}>
          <KeyValue label="Subtotal" value={money(d.subtotal)} />
          {Number(d.discount) ? <KeyValue label="Discount" value={`− ${money(d.discount)}`} /> : null}
          <KeyValue label="Total" value={money(d.total)} strong />
          {invoice ? <KeyValue label="Paid" value={money(d.amount_paid)} /> : null}
          {invoice ? <KeyValue label="Still due" value={money(d.balance_due)} strong color={due ? c.danger : undefined} /> : null}
        </View>
      </Card>
      {d.notes ? <Card><Muted>{d.notes}</Muted></Card> : null}
      <Button title="Change status" kind="ghost" small onPress={() => setStatusing(true)} />

      <Sheet visible={paying} title="Record payment" onClose={() => setPaying(false)}>
        {d.deni ? <Muted>This invoice is for a deni sale, so the payment repays the customer's deni.</Muted> : null}
        <Banner text={msg?.kind === 'danger' ? msg.text : null} />
        <Field label="Amount (KSh)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
        {d.deni ? <ChipRow value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-Pesa' }]} /> : null}
        <Button title="Save payment" busy={busy} disabled={!amount} onPress={() => void run(`documents/${d.id}/pay/`,
          { amount, method: d.deni ? method : undefined, request_id: rid.current }, `Payment of ${money(amount)} recorded.`)} />
      </Sheet>
      <Sheet visible={statusing} title="Change status" onClose={() => setStatusing(false)}>
        <Muted>Set by hand, as on the website. Payments set Paid and Partly paid on their own.</Muted>
        {data.statuses.filter((s) => s.value !== 'converted' && s.value !== d.status).map((s) => (
          <ListItem key={s.value} title={s.label} onPress={() => void run(`documents/${d.id}/status/`, { status: s.value }, `Marked ${s.label.toLowerCase()}.`)} />
        ))}
      </Sheet>
    </Screen>
  );
}
