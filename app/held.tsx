import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { get, post } from '@/api/client';
import type { Dec } from '@/api/types';
import { Banner, Empty, ListItem, Loading, Screen } from '@/components/ui';
import { type EnteredAs, fromHeld } from '@/domain/cart';
import { dateTime, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useCart } from '@/store/cart';
import { useCatalog } from '@/store/catalog';

interface Held { id: number; label: string; total: Dec; items: number; cashier: string; created_at: string }

/** Sales parked on hold, from this phone or any till. Resuming brings one back into the cart. */
export default function HeldSales() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi(() => get<{ held: Held[] }>('held/'));
  const [problem, setProblem] = useState<string | null>(null);

  const resume = async (h: Held) => {
    const doIt = async () => {
      try {
        const res = await post<{ label: string; lines: { product_id: number; quantity: string; entered_as: EnteredAs; amount: string | null; fixed_total: string | null }[] }>(`held/${h.id}/resume/`);
        useCart.getState().replace(fromHeld(res.lines, useCatalog.getState().byId), res.label);
        router.back();
      } catch (e) {
        setProblem((e as Error).message);
        void reload();
      }
    };
    if (useCart.getState().lines.length) {
      Alert.alert('The cart is not empty', 'Hold or finish the current sale first.');
      return;
    }
    await doIt();
  };

  return (
    <Screen padded={false}>
      <Banner text={error ?? problem} />
      {loading && !data ? <Loading /> : null}
      {data && !data.held.length ? <Empty text="No sales on hold." /> : null}
      {data?.held.map((h) => (
        <ListItem key={h.id} title={h.label} subtitle={`${dateTime(h.created_at)} · ${h.items} item${h.items === 1 ? '' : 's'} · ${h.cashier}`}
          right={money(h.total)} onPress={() => void resume(h)} />
      ))}
    </Screen>
  );
}
