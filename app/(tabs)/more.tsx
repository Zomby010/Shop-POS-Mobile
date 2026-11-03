import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { Button, Card, ListItem, Muted, Screen, T } from '@/components/ui';
import { useCart } from '@/store/cart';
import { useCatalog } from '@/store/catalog';
import { can, useSession } from '@/store/session';

type Item = { show: boolean; title: string; subtitle?: string; to: string };

function Group({ title, items, go }: { title: string; items: Item[]; go: (to: string) => void }): ReactNode {
  const shown = items.filter((i) => i.show);
  if (!shown.length) return null;
  return (
    <>
      <Muted size={12}>{title.toUpperCase()}</Muted>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {shown.map((i) => <ListItem key={i.to} title={i.title} subtitle={i.subtitle} onPress={() => go(i.to)} />)}
      </Card>
    </>
  );
}

/** Everything that isn't a tab, grouped as People, Money, Documents and Owner, then who is signed in. */
export default function More() {
  const router = useRouter();
  const { user, settings, server, signOut } = useSession();
  const go = (to: string) => router.push(to as never);
  const owner = !!user?.is_owner;
  return (
    <Screen>
      <Group title="People" go={go} items={[
        { show: can(user, 'customers'), title: 'Customers', subtitle: 'Deni balances and repayments', to: '/customers' },
        { show: can(user, 'view_suppliers'), title: 'Suppliers', subtitle: 'What you owe, purchases and payments', to: '/suppliers' },
      ]} />
      <Group title="Money" go={go} items={[
        { show: true, title: 'Today', subtitle: 'Takings, deni and low stock', to: '/today' },
        { show: can(user, 'reports'), title: 'Reports', subtitle: 'Summary, profit, sales, stock and Excel downloads', to: '/reports' },
        { show: can(user, 'reports'), title: 'Expenses', subtitle: 'Rent, transport, wages…', to: '/expenses' },
        { show: can(user, 'cashup'), title: 'Cash-up', subtitle: 'End of shift', to: '/cashup' },
        { show: can(user, 'all_cashups'), title: 'Cash-ups', subtitle: "Every shift's count against the records", to: '/cashups' },
        { show: can(user, 'sell'), title: 'Held sales', to: '/held' },
      ]} />
      <Group title="Documents" go={go} items={[
        { show: can(user, 'documents'), title: 'Invoices and quotations', subtitle: 'Make, share as PDF, take payments', to: '/documents' },
      ]} />
      <Group title="Owner" go={go} items={[
        { show: can(user, 'settings'), title: 'Shop settings', subtitle: 'Name, receipts, printer, deni', to: '/owner/settings' },
        { show: owner, title: 'Users', subtitle: 'Add staff, reset passwords and PINs', to: '/owner/users' },
        { show: owner, title: 'Roles and privileges', subtitle: 'What cashiers and stock clerks may do', to: '/owner/roles' },
        { show: can(user, 'audit_log'), title: 'Audit log', subtitle: 'Voids, refunds, price and privilege changes', to: '/owner/audit' },
        { show: can(user, 'add_products'), title: 'Import and export products', subtitle: 'Excel template, import, export', to: '/owner/import' },
      ]} />
      <Card>
        <T size={18} weight="700">{settings?.business_name ?? 'Shop POS'}</T>
        <Muted>Signed in as {user?.name || user?.username} ({user?.roles.join(', ')})</Muted>
        <Muted size={12}>{server}</Muted>
      </Card>
      <Button title="Sign out" kind="secondary" icon="log-out-outline" onPress={async () => {
        useCart.getState().clear();
        await useCatalog.getState().clear();
        await signOut();
      }} />
    </Screen>
  );
}
