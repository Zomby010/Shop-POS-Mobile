import { useRouter } from 'expo-router';

import { Card, ListItem, Muted, Screen } from '@/components/ui';
import { can, useSession } from '@/store/session';

/** The Stock menu, showing only what this user may do. */
export default function Stock() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  return (
    <Screen>
      <Muted>Every change to stock is recorded with its cost, just like on the website.</Muted>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {can(user, 'receive_stock') ? <ListItem title="Receive stock" subtitle="A delivery from a supplier" onPress={() => router.push('/stock/receive')} /> : null}
        {can(user, 'adjust_stock') ? <ListItem title="Recount" subtitle="Count a few products and fix the stock" onPress={() => router.push('/stock/recount')} /> : null}
        {can(user, 'adjust_stock') ? <ListItem title="Loss and wastage" subtitle="Spillage, expiry, damage" onPress={() => router.push('/stock/loss')} /> : null}
        {can(user, 'stock_history') ? <ListItem title="Low stock" subtitle="What to reorder" onPress={() => router.push('/stock/low')} /> : null}
      </Card>
    </Screen>
  );
}
