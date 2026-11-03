import { get } from '@/api/client';
import type { Product } from '@/api/types';
import { Banner, Empty, ListItem, Loading, Screen, useColors } from '@/components/ui';
import { qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';

/** Products at or below their alert level: a shopping list for suppliers. */
export default function LowStock() {
  const c = useColors();
  const { data, error, loading } = useApi(() => get<{ products: Product[] }>('products/low-stock/'));
  return (
    <Screen padded={false}>
      <Banner text={error} />
      {loading && !data ? <Loading /> : null}
      {data && !data.products.length ? <Empty text="Nothing is low on stock." /> : null}
      {data?.products.map((p) => (
        <ListItem key={p.id} title={p.name}
          subtitle={[`Alert at ${qty(p.alert_at, p.unit)}`, p.reorder_qty ? `reorder ${qty(p.reorder_qty, p.unit)}` : '', p.last_supplier ?? ''].filter(Boolean).join(' · ')}
          right={qty(p.stock_qty, p.unit)} tone={Number(p.stock_qty) <= 0 ? c.danger : c.warning} />
      ))}
    </Screen>
  );
}
