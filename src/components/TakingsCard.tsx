/** What the drawer and M-Pesa should hold for a shift: the website's cash-up breakdown. */
import type { ExpectedTakings } from '@/api/types';
import { dateTime, money } from '@/lib/format';

import { Card, KeyValue, Muted } from './ui';

export function TakingsCard({ e }: { e: ExpectedTakings }) {
  return (
    <Card>
      <Muted>{dateTime(e.start)} to {dateTime(e.end)} · {e.sales_count} sale{e.sales_count === 1 ? '' : 's'}</Muted>
      <KeyValue label="Opening float" value={money(e.opening_float)} />
      <KeyValue label="Cash sales" value={money(e.cash_sales)} />
      <KeyValue label="Cash refunds" value={`− ${money(e.cash_refunds)}`} />
      <KeyValue label="Deni repaid in cash" value={money(e.cash_repayments)} />
      <KeyValue label="Expenses from the drawer" value={`− ${money(e.cash_expenses)}`} />
      <KeyValue label="Expected cash" value={money(e.expected_cash)} strong />
      <KeyValue label="M-Pesa sales" value={money(e.mpesa_sales)} />
      <KeyValue label="M-Pesa refunds" value={`− ${money(e.mpesa_refunds)}`} />
      <KeyValue label="Deni repaid by M-Pesa" value={money(e.mpesa_repayments)} />
      <KeyValue label="Expected M-Pesa" value={money(e.expected_mpesa)} strong />
      <KeyValue label="Deni given" value={money(e.credit_sales)} />
    </Card>
  );
}

export const diffTone = (d: string, c: { danger: string; warning: string; good: string }) =>
  (Number(d) < 0 ? c.danger : Number(d) > 0 ? c.warning : c.good);
