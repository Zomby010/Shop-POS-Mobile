import { useLocalSearchParams } from 'expo-router';

import { get } from '@/api/client';
import type { CashUp, ExpectedTakings } from '@/api/types';
import { TakingsCard, diffTone } from '@/components/TakingsCard';
import { Banner, Card, KeyValue, Loading, Muted, Screen, T, useColors } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

/** One past cash-up: what was counted against what the records said. */
export default function CashUpRecord() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useApi(() => get<{ cashup: CashUp; expected: ExpectedTakings }>(`cashups/${id}/`), [id]);
  if (loading && !data) return <Loading />;
  if (!data) return <Screen><Banner text={error} /></Screen>;
  const r = data.cashup;
  return (
    <Screen>
      <Card>
        <T size={18} weight="700">{r.cashier}</T>
        <Muted>Saved {dateTime(r.period_end)}{r.note ? ` · ${r.note}` : ''}</Muted>
        <KeyValue label="Cash counted" value={money(r.counted_cash)} />
        <KeyValue label="Cash expected" value={money(r.expected_cash)} />
        <KeyValue label="Cash difference" value={money(r.cash_difference)} strong color={diffTone(r.cash_difference, c)} />
        <KeyValue label="M-Pesa received" value={money(r.counted_mpesa)} />
        <KeyValue label="M-Pesa expected" value={money(r.expected_mpesa)} />
        <KeyValue label="M-Pesa difference" value={money(r.mpesa_difference)} strong color={diffTone(r.mpesa_difference, c)} />
      </Card>
      <TakingsCard e={data.expected} />
    </Screen>
  );
}
