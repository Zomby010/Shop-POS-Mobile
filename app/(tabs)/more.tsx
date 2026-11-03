import { useRouter } from 'expo-router';

import { Button, Card, ListItem, Muted, Screen, T } from '@/components/ui';
import { useCart } from '@/store/cart';
import { useCatalog } from '@/store/catalog';
import { can, useSession } from '@/store/session';

/** Cash-up, held sales, money and reports, and signing out. */
export default function More() {
  const router = useRouter();
  const { user, settings, server, signOut } = useSession();
  return (
    <Screen>
      <Card>
        <T size={18} weight="700">{settings?.business_name ?? 'Shop POS'}</T>
        <Muted>Signed in as {user?.name} ({user?.roles.join(', ')})</Muted>
        <Muted size={12}>{server}</Muted>
      </Card>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {can(user, 'customers') ? <ListItem title="Customers" subtitle="Deni balances and repayments" onPress={() => router.push('/customers')} /> : null}
        {can(user, 'sell') ? <ListItem title="Held sales" onPress={() => router.push('/held')} /> : null}
        {can(user, 'cashup') ? <ListItem title="Cash-up" subtitle="End of shift" onPress={() => router.push('/cashup')} /> : null}
        {can(user, 'reports') ? <ListItem title="Money and reports" subtitle="Today's sales, profit and deni" onPress={() => router.push('/reports')} /> : null}
        {can(user, 'reports') ? <ListItem title="Expenses" subtitle="Rent, transport, wages…" onPress={() => router.push('/expenses')} /> : null}
      </Card>
      <Muted size={12}>Users, invoices, full reports and shop settings are managed on the website.</Muted>
      <Button title="Sign out" kind="secondary" icon="log-out-outline" onPress={async () => {
        useCart.getState().clear();
        await useCatalog.getState().clear();
        await signOut();
      }} />
    </Screen>
  );
}
