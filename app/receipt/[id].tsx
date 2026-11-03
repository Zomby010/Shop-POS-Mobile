import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { get } from '@/api/client';
import type { SaleDetail } from '@/api/types';
import { Banner, Button, Card, KeyValue, Loading, Row, Screen, T, useColors } from '@/components/ui';
import { money } from '@/lib/format';
import { printReceipt, shareReceipt } from '@/lib/receipt';
import { useApi } from '@/lib/useApi';
import { useSession } from '@/store/session';

/** "Sale complete": the change to give, then print or share the receipt. Receipts are not printed automatically. */
export default function Receipt() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const paper = useSession((s) => s.settings?.paper_width_mm ?? 80);
  const { data: sale, error, loading } = useApi(() => get<SaleDetail>(`sales/${id}/`), [id]);

  return (
    <Screen>
      <Banner text={error} />
      {loading && !sale ? <Loading /> : null}
      {sale ? (
        <>
          <Card>
            <T size={14} color={c.muted}>{sale.receipt_no}</T>
            <T size={28} weight="700">{money(sale.total)}</T>
            {Number(sale.change_given) > 0 ? <KeyValue label="Change to give" value={money(sale.change_given)} strong color={c.primary} /> : null}
            {sale.payments.map((p) => <KeyValue key={p.method} label={p.method === 'credit' ? 'Deni' : p.method === 'mpesa' ? `M-Pesa ${p.reference}` : 'Cash'} value={money(p.amount)} />)}
          </Card>
          <Row>
            <View style={{ flex: 1 }}><Button title="Print" icon="print-outline" onPress={() => void printReceipt(sale.receipt_lines ?? [], paper)} /></View>
            <View style={{ flex: 1 }}><Button title="Share" kind="secondary" icon="share-outline" onPress={() => void shareReceipt(sale.receipt_lines ?? [], paper, sale.receipt_no)} /></View>
          </Row>
          <Card>
            <ScrollView horizontal>
              <T mono size={12}>{(sale.receipt_lines ?? []).join('\n')}</T>
            </ScrollView>
          </Card>
          <Button title="New sale" kind="secondary" icon="add" onPress={() => router.dismissTo('/')} />
        </>
      ) : null}
    </Screen>
  );
}
