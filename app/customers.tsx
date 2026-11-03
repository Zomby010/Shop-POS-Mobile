import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { Customer, Dec } from '@/api/types';
import { Banner, Button, Card, ChipRow, Empty, Field, KeyValue, ListItem, useColors } from '@/components/ui';
import { isNegative, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const FILTERS = [
  { value: '', label: 'All' }, { value: 'owing', label: 'Has balance' }, { value: 'overpaid', label: 'Overpaid' },
  { value: 'clear', label: 'No balance' },
];

/** The deni list: who owes the shop, and who the shop owes back. */
export default function Customers() {
  const c = useColors();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [balance, setBalance] = useState('');
  const { data, error, loading, reload } = useApi(
    () => get<{ customers: Customer[]; total_owed: Dec; total_overpaid: Dec }>('customers/', { q, balance }), [balance]);

  return (
    <FlatList
      data={data?.customers ?? []}
      keyExtractor={(cu) => String(cu.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <Field value={q} onChangeText={setQ} placeholder="Search name, phone or email" returnKeyType="search" onSubmitEditing={reload} />
          <ChipRow options={FILTERS} value={balance} onChange={setBalance} />
          <Banner text={error} />
          {data ? (
            <Card>
              <KeyValue label="Customers owe you" value={money(data.total_owed)} strong />
              <KeyValue label="You owe overpaid customers" value={money(data.total_overpaid)} />
            </Card>
          ) : null}
          <Button title="Add customer" kind="secondary" icon="person-add-outline" onPress={() => router.push('/customer/new')} />
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Empty text="No customers match." />}
      renderItem={({ item: cu }) => (
        <ListItem title={cu.name} subtitle={[cu.phone, cu.active ? '' : 'Inactive'].filter(Boolean).join(' · ')}
          right={money(cu.balance)} rightSub={isNegative(cu.balance) ? 'overpaid' : Number(cu.balance) > 0 ? 'owes' : ''}
          tone={Number(cu.balance) > 0 ? c.warning : undefined}
          onPress={() => router.push({ pathname: '/customer/[id]', params: { id: String(cu.id) } })} />
      )}
    />
  );
}
