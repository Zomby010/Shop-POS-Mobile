import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { DeniActivity } from '@/api/types';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Banner, Card, ChipRow, Empty, KeyValue, ListItem, Muted, useColors } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import { type Range, parseRange, rangeKey, rangeQuery } from '@/lib/period';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

const SHOW = [{ value: '', label: 'All' }, { value: 'charge', label: 'Given' }, { value: 'repayment', label: 'Repaid' }];

/** Deni given and repaid in a period: how much went out on deni, how much came back, and from whom. */
export default function Deni() {
  const c = useColors();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const params = useLocalSearchParams<{ range?: string }>();
  const [range, setRange] = useState<Range>(parseRange(params.range));
  const [show, setShow] = useState('');
  const { data, error, loading, reload } = useApi(() => get<DeniActivity>('deni/', rangeQuery(range)), [rangeKey(range)]);
  const entries = (data?.entries ?? []).filter((e) => !show || e.kind === show);
  const t = data?.totals;

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <PeriodPicker value={range} onChange={setRange} />
          <Banner text={error} />
          {t ? (
            <Card>
              <KeyValue label="Given on deni" value={money(t.given)} strong />
              <KeyValue label="Repaid in cash" value={money(t.repaid_cash)} />
              <KeyValue label="Repaid by M-Pesa" value={money(t.repaid_mpesa)} />
              <KeyValue label="Repaid in total" value={money(t.repaid)} strong />
              {Number(t.cleared) > 0 ? <KeyValue label="Cleared by refunds or voids" value={money(t.cleared)} /> : null}
              {data && can(user, 'customers', 'reports') ? (
                <KeyValue label="Customers owe now (all time)" value={money(data.owed_now)} color={Number(data.owed_now) > 0 ? c.danger : undefined} />
              ) : null}
              <Muted size={12}>Repaid money is already in the cash and M-Pesa totals for the day it came in. Cleared deni brought no money in.</Muted>
            </Card>
          ) : null}
          <ChipRow options={SHOW} value={show} onChange={setShow} />
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Empty text="No deni given or repaid in this period." />}
      renderItem={({ item: e }) => (
        <ListItem title={`${e.label} · ${e.customer}`}
          subtitle={[dateTime(e.created_at), e.receipt_no, e.user, e.note].filter(Boolean).join(' · ')}
          right={`${e.kind === 'charge' ? '' : '−'}${money(e.amount)}`}
          tone={e.kind === 'charge' ? c.warning : c.good}
          onPress={can(user, 'customers') ? () => router.push(`/customer/${e.customer_id}`) : undefined} />
      )}
    />
  );
}
