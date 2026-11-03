import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { SaleSummary, SalesTotals } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Banner, Card, ChipRow, Empty, Field, ListItem, Muted, Row, T, useColors } from '@/components/ui';
import { METHOD_LABELS, dateTime, money } from '@/lib/format';
import { type Range, rangeKey, rangeParam, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';
import { levelOf, useSession } from '@/store/session';

interface SalesPage { sales: SaleSummary[]; totals: SalesTotals; next_offset: number | null }

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
  const { data, error, loading, reload } = useApi(() => get<SalesPage>('sales/', { ...rangeQuery(range), status, q }), [rangeKey(range), status]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data?.sales ?? []}
        keyExtractor={(s) => String(s.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={
          <View style={{ padding: 12, gap: 10 }}>
            <Field value={q} onChangeText={setQ} placeholder="Receipt number, customer or M-Pesa code" returnKeyType="search"
              onSubmitEditing={reload} />
            <PeriodPicker value={range} onChange={setRange} />
            <ChipRow options={STATUS} value={status} onChange={setStatus} />
            <Banner text={error} />
            {data ? (
              <Card>
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
    </View>
  );
}

