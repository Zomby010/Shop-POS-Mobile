import { useRouter } from 'expo-router';

import { Card, ListItem, Muted, Screen } from '@/components/ui';
import { can, useSession } from '@/store/session';

const REPORTS = [
  ['/reports/summary', 'Summary', 'Sales, money collected, deni, profit and suppliers'],
  ['/reports/profit', 'Profit and loss', 'Day by day, expenses by category, losses by kind'],
  ['/reports/sales', 'Sales by day', 'Cash, M-Pesa, deni given and repaid each day'],
  ['/reports/sold', 'Sold items', 'What sold and at what margin'],
  ['/reports/movers', 'Fast and slow movers', 'What sells, what sits, days of stock left'],
  ['/reports/stock-movement', 'Stock movement', 'Opening, bought, sold, lost and closing per product'],
  ['/reports/purchased', 'Purchased items', 'What was bought from suppliers'],
  ['/reports/stock-value', 'Stock value', 'Stock at cost and at selling price'],
  ['/stock/stock-loss', 'Stock loss explained', 'Lost and found per product, with reasons'],
  ['/expenses', 'Expenses', 'Add, see and delete expenses'],
] as const;

/** The website's reports, one line each. Every report has the same period chips and an Excel download. */
export default function ReportsMenu() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  return (
    <Screen>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {REPORTS.map(([href, title, subtitle]) => (
          <ListItem key={href} title={title} subtitle={subtitle} onPress={() => router.push(href)} />
        ))}
        {can(user, 'all_cashups') ? <ListItem title="Cash-ups" subtitle="Every shift's count against the records" onPress={() => router.push('/cashups')} /> : null}
      </Card>
      <Muted size={12}>Tap the download button at the top of a report for its Excel file.</Muted>
    </Screen>
  );
}
