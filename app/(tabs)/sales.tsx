import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { Dec, SaleSummary } from '@/api/types';
import { Banner, Card, ChipRow, Empty, Field, ListItem, Muted, Row, T, useColors } from '@/components/ui';
import { METHOD_LABELS, PERIODS, type Period, dateTime, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { levelOf, useSession } from '@/store/session';

interface SalesPage { sales: SaleSummary[]; totals: { cash: Dec; mpesa: Dec; credit: Dec }; next_offset: number | null }

const STATUS = [
  { value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'deni_owed', label: 'On deni' },
  { value: 'refunded', label: 'Refunded' }, { value: 'voided', label: 'Voided' },
];

/** Every completed or voided sale, with the website's filters. Cashiers see only their own. */
export default function Sales() {
  const c = useColors();
  const router = useRouter();
  const own = levelOf(useSession((s) => s.user), 'view_sales') === 'own';
  const [period, setPeriod] = useState<Period>('today');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useApi(() => get<SalesPage>('sales/', { period, status, q }), [period, status]);

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
            <ChipRow options={[...PERIODS]} value={period} onChange={setPeriod} />
            <ChipRow options={STATUS} value={status} onChange={setStatus} />
            <Banner text={error} />
            {data ? (
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  {(['cash', 'mpesa', 'credit'] as const).map((m) => (
                    <View key={m} style={{ alignItems: 'center', flex: 1 }}>
                      <Muted>{METHOD_LABELS[m]}</Muted>
                      <T weight="700">{money(data.totals[m])}</T>
                    </View>
                  ))}
                </Row>
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

