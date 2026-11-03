import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { SaleSummary, SalesTotals } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Banner, Button, Card, ChipRow, Empty, Field, ListItem, Muted, Row, Sheet, T, useColors } from '@/components/ui';
import { METHOD_LABELS, dateTime, money } from '@/lib/format';
import { type Range, rangeKey, rangeParam, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';
import { levelOf, useSession } from '@/store/session';

interface SalesPage { sales: SaleSummary[]; totals: SalesTotals; cashiers: { id: number; name: string }[]; next_offset: number | null }

const METHODS = [
  { value: '', label: 'Any' }, { value: 'cash', label: 'Cash only' }, { value: 'mpesa', label: 'M-Pesa only' },
  { value: 'credit', label: 'Deni' }, { value: 'split', label: 'Split' },
];

const STATUS = [
  { value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'deni_owed', label: 'On deni' },
  { value: 'refunded', label: 'Refunded' }, { value: 'voided', label: 'Voided' },
];

/** Every completed or voided sale, with the website's filters. Cashiers see only their own. */
export default function Sales() {
  const c = useColors();
  const router = useRouter();
  const own = levelOf(useSession((s) => s.user), 'view_sales') === 'own';
  const [range, setRange] = useState<Range>({ kind: 'period', period: 'today' });
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('');
  const [cashier, setCashier] = useState('');
  const [filtering, setFiltering] = useState(false);
  const [more, setMore] = useState<SaleSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const navigation = useNavigation();
  const query = () => ({ ...rangeQuery(range), status, q, method, cashier });
  const { data, error, loading, reload } = useApi(async () => {
    const page = await get<SalesPage>('sales/', query());
    setMore([]); setNext(page.next_offset);
    return page;
  }, [rangeKey(range), status, method, cashier]);
  const loadMore = async () => {
    if (next === null) return;
    const page = await get<SalesPage>('sales/', { ...query(), offset: next });
    setMore((m) => [...m, ...page.sales]); setNext(page.next_offset);
  };
  const filters = (method ? 1 : 0) + (cashier ? 1 : 0);
  const cashierName = data?.cashiers.find((x) => String(x.id) === cashier)?.name;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setFiltering(true)} hitSlop={12} style={{ padding: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          accessibilityLabel="Filter by payment method or cashier">
          <Ionicons name={filters ? 'funnel' : 'funnel-outline'} size={20} color={c.text} />
          {filters ? <T weight="700">{filters}</T> : null}
        </Pressable>
      ),
    });
  }, [navigation, c, filters]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={[...(data?.sales ?? []), ...more]}
        keyExtractor={(s) => String(s.id)}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={
          <View style={{ padding: 12, gap: 10 }}>
            <Field value={q} onChangeText={setQ} placeholder="Receipt number, customer or M-Pesa code" returnKeyType="search"
              onSubmitEditing={reload} />
            <PeriodPicker value={range} onChange={setRange} />
            <ChipRow options={STATUS} value={status} onChange={setStatus} />
            <Banner text={error} />
            {filters ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <Muted>{[METHODS.find((m) => m.value === method && method)?.label, cashierName].filter(Boolean).join(' · ')}</Muted>
                <Button title="Clear filters" small kind="ghost" onPress={() => { setMethod(''); setCashier(''); }} />
              </Row>
            ) : null}
            {data ? (
              <Card>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View>
                    <Muted>Net sales</Muted>
                    <T size={22} weight="700">{money(data.totals.net)}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Muted size={12}>{data.totals.count} sale{data.totals.count === 1 ? '' : 's'} · {money(data.totals.total)}</Muted>
                    {Number(data.totals.refunded) ? <Muted size={12}>− {money(data.totals.refunded)} refunded</Muted> : null}
                  </View>
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  {([['cash', 'Cash'], ['mpesa', 'M-Pesa'], ['credit', 'Deni given']] as const).map(([m, label]) => (
                    <View key={m} style={{ alignItems: 'center', flex: 1 }}>
                      <Muted>{label}</Muted>
                      <T weight="700">{money(data.totals[m])}</T>
                    </View>
                  ))}
                </Row>
                <Pressable onPress={() => router.push({ pathname: '/deni', params: { range: rangeParam(range) } })}
                  accessibilityLabel="See deni given and repaid"
                  style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <T weight="600">Deni repaid {money(data.totals.deni_repaid.total)}</T>
                    <Muted size={12}>
                      {money(data.totals.deni_repaid.cash)} cash · {money(data.totals.deni_repaid.mpesa)} M-Pesa
                      {Number(data.totals.credit_due) > 0 ? ` · ${money(data.totals.credit_due)} of these sales still owed` : ''}
                    </Muted>
                  </View>
                  <Muted>Details</Muted>
                </Pressable>
              </Card>
            ) : null}
            {own ? <Banner kind="warning" text="Showing your own sales." /> : null}
          </View>
        }
        ListEmptyComponent={loading ? undefined : <Empty text="No sales in this period." />}
        renderItem={({ item: s }) => (
          <ListItem title={`${s.receipt_no} · ${s.customer ?? s.cashier}`}
            subtitle={`${dateTime(s.completed_at)} · ${s.items} item${s.items === 1 ? '' : 's'} · ${s.payments.map((p) => METHOD_LABELS[p.method]).join(' + ')}`}
            right={money(s.total)} rightSub={s.status_label}
            tone={s.status === 'voided' ? c.danger : s.status_label === 'On deni' ? c.warning : undefined}
            onPress={() => router.push({ pathname: '/sale/[id]', params: { id: String(s.id) } })} />
        )}
      />
      <Sheet visible={filtering} title="Filter sales" onClose={() => setFiltering(false)}>
        <Muted>Paid by</Muted>
        <ChipRow options={METHODS} value={method} onChange={setMethod} />
        {data?.cashiers.length ? (
          <>
            <Muted>Cashier</Muted>
            <ChipRow options={[{ value: '', label: 'Everyone' }, ...data.cashiers.map((x) => ({ value: String(x.id), label: x.name }))]}
              value={cashier} onChange={setCashier} />
          </>
        ) : null}
        <Button title="Show sales" onPress={() => setFiltering(false)} />
      </Sheet>
    </View>
  );
}

