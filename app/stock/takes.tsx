import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { get, post } from '@/api/client';
import type { Named, StockTake } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, ListItem, Muted, Screen, T } from '@/components/ui';
import { dateTime } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

/** Full counts: start one for every product or one category, count, then the owner approves. */
export default function StockTakes() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const { data, error, reload } = useApi(() => get<{ stocktakes: StockTake[]; categories: Named[] }>('stocktakes/'));
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const open = data?.stocktakes.find((t) => t.status === 'open');

  const start = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await post<{ stocktake: StockTake }>('stocktakes/', { category_id: category || null, note });
      router.push(`/stock/take/${r.stocktake.id}`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Banner text={error ?? msg} />
      {!open && can(user, 'stocktake') ? (
        <Card>
          <T weight="600">Start a stock take</T>
          <Muted>The stock on record is noted now. Sales made while you count are kept when it is approved.</Muted>
          <ChipRow value={category} onChange={setCategory}
            options={[{ value: '', label: 'All products' }, ...(data?.categories ?? []).map((x) => ({ value: String(x.id), label: x.name }))]} />
          <Field label="Note" value={note} onChangeText={setNote} placeholder="e.g. Month end" />
          <Button title="Start counting" icon="clipboard-outline" busy={busy} onPress={start} />
        </Card>
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: 14, paddingBottom: 4 }}><T weight="600">Stock takes</T></View>
        {(data?.stocktakes ?? []).map((t) => (
          <ListItem key={t.id} title={`${t.code} · ${t.status_label}`}
            subtitle={`${dateTime(t.started_at)} · ${t.started_by ?? ''}${t.note ? ` · ${t.note}` : ''} · ${t.line_count ?? 0} products`}
            onPress={() => router.push(`/stock/take/${t.id}`)} />
        ))}
        {data && !data.stocktakes.length ? <View style={{ padding: 14 }}><Muted>None yet.</Muted></View> : null}
      </Card>
    </Screen>
  );
}
