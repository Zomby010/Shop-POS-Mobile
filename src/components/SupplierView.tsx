/** A supplier's page: details, what the shop owes, purchases, payments and invoices. Used full screen on phones
 * and beside the list on tablets. */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { get } from '@/api/client';
import type { SupplierPage } from '@/api/types';
import { Banner, Button, Card, ChipRow, Empty, KeyValue, ListItem, Loading, Muted, Row, Sheet, T, useColors } from '@/components/ui';
import { day, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

export function SupplierView({ id }: { id: number }) {
  const c = useColors();
  const router = useRouter();
  const [choosing, setChoosing] = useState(false);
  const [tab, setTab] = useState<'purchases' | 'payments' | 'documents'>('purchases');
  const { data, error, loading, reload } = useApi(() => get<SupplierPage>(`suppliers/${id}/`), [id]);
  if (loading && !data) return <Loading />;
  if (!data) return <View style={{ padding: 16 }}><Banner text={error} /></View>;
  const s = data.supplier;
  const owed = Number(s.owed) > 0;
  const unpaid = data.purchases.filter((p) => !p.cancelled && Number(p.balance) > 0);
  const tabs = [
    { value: 'purchases' as const, label: `Purchases (${data.purchases.length})` },
    { value: 'payments' as const, label: `Payments (${data.payments.length})` },
    ...(data.documents.length ? [{ value: 'documents' as const, label: `Invoices (${data.documents.length})` }] : []),
  ];
  const openPurchase = (pid: number, pay = false) =>
    router.push({ pathname: '/stock/purchase/[id]', params: { id: String(pid), ...(pay ? { pay: '1' } : {}) } });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Banner text={error} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={18} weight="700">{s.name}</T>
          {!s.active ? <Muted>Inactive</Muted> : null}
        </Row>
        {[s.contact_person, s.phone, s.email].filter(Boolean).length ? <Muted>{[s.contact_person, s.phone, s.email].filter(Boolean).join(' · ')}</Muted> : null}
        {s.address ? <Muted>{s.address}</Muted> : null}
        {s.kra_pin ? <Muted>KRA PIN {s.kra_pin}</Muted> : null}
        {s.notes ? <Muted>{s.notes}</Muted> : null}
        <KeyValue label="Bought (not cancelled)" value={money(data.total_bought)} />
        <KeyValue label="Paid" value={money(data.total_paid)} />
        <KeyValue label="You owe them" value={money(s.owed)} strong color={owed ? c.danger : undefined} />
      </Card>
      {data.can_pay && unpaid.length ? (
        <Button title="Pay supplier" icon="cash-outline" onPress={() => (unpaid.length === 1 ? openPurchase(unpaid[0].id, true) : setChoosing(true))} />
      ) : data.can_receive ? (
        <Button title="Receive stock" icon="cube-outline" onPress={() => router.push({ pathname: '/stock/receive', params: { supplier: String(s.id) } })} />
      ) : null}

      <ChipRow options={tabs} value={tab} onChange={setTab} />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {tab === 'purchases' ? (data.purchases.length ? data.purchases.map((p) => (
          <ListItem key={p.id} title={`${p.code}${p.supplier_reference ? ` · ${p.supplier_reference}` : ''}`}
            subtitle={`${day(p.date)} · ${p.cancelled ? 'Cancelled' : p.payment_status}`}
            right={money(p.total)} rightSub={!p.cancelled && Number(p.balance) > 0 ? `${money(p.balance)} owed` : undefined}
            tone={!p.cancelled && Number(p.balance) > 0 ? c.danger : undefined} onPress={() => openPurchase(p.id)} />
        )) : <Empty text="No purchases yet." />) : null}
        {tab === 'payments' ? (data.payments.length ? data.payments.map((p) => (
          <ListItem key={p.id} title={`${p.method_label} · ${day(p.date)}`}
            subtitle={[`For ${p.purchase}${p.cancelled ? ' (cancelled)' : ''}`, p.user, p.note].filter(Boolean).join(' · ')}
            right={money(p.amount)} onPress={() => openPurchase(p.purchase_id)} />
        )) : <Empty text="No payments yet." />) : null}
        {tab === 'documents' ? data.documents.map((d) => (
          <ListItem key={d.id} title={d.code} subtitle={`${day(d.date)} · ${d.status_label}`} right={money(d.total)} />
        )) : null}
      </Card>

      <Sheet visible={choosing} title="Which purchase are you paying?" onClose={() => setChoosing(false)}>
        <Muted>Payments go against one purchase, as on the website.</Muted>
        <ScrollView style={{ maxHeight: 360 }}>
          {unpaid.map((p) => (
            <ListItem key={p.id} title={`${p.code}${p.supplier_reference ? ` · ${p.supplier_reference}` : ''}`} subtitle={day(p.date)}
              right={money(p.balance)} rightSub="owed" onPress={() => { setChoosing(false); openPurchase(p.id, true); }} />
          ))}
        </ScrollView>
      </Sheet>
    </ScrollView>
  );
}
