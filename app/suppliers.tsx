import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, useWindowDimensions } from 'react-native';

import { get } from '@/api/client';
import type { Dec, Supplier } from '@/api/types';
import { SupplierView } from '@/components/SupplierView';
import { Banner, Card, ChipRow, Empty, Field, KeyValue, ListItem, Muted, useColors } from '@/components/ui';
import { money } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { can, useSession } from '@/store/session';

const FILTERS = [
  { value: '', label: 'All' }, { value: 'owing', label: 'You owe them' }, { value: 'clear', label: 'Nothing owed' },
  { value: 'inactive', label: 'Include inactive' },
];

/** The website's Suppliers list: who the shop buys from and what it owes each. Tablets show the supplier beside it. */
export default function Suppliers() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useSession((s) => s.user);
  const wide = useWindowDimensions().width >= 820;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const { data, error, loading, reload } = useApi(() => get<{ suppliers: Supplier[]; total_owed: Dec }>('suppliers/', {
    q, balance: filter === 'inactive' ? '' : filter, inactive: filter === 'inactive' ? 1 : '',
  }), [filter]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => can(user, 'edit_suppliers') ? (
        <Pressable onPress={() => router.push('/supplier/edit')} hitSlop={12} style={{ padding: 8 }} accessibilityLabel="Add supplier">
          <Ionicons name="add" size={26} color={c.text} />
        </Pressable>
      ) : null,
    });
  }, [navigation, router, c, user]);

  const list = (
    <FlatList
      style={{ flex: 1 }}
      data={data?.suppliers ?? []}
      keyExtractor={(s) => String(s.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <Field value={q} onChangeText={setQ} placeholder="Search name, contact or phone" returnKeyType="search" onSubmitEditing={reload} />
          <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
          <Banner text={error} />
          {data ? (
            <Card>
              <KeyValue label="You owe suppliers" value={money(data.total_owed)} strong color={Number(data.total_owed) > 0 ? c.danger : undefined} />
              <Muted size={12}>Pay a supplier from their page, against the purchase you are paying for.</Muted>
            </Card>
          ) : null}
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Empty text={q ? `No supplier matches '${q}'.` : 'No suppliers yet.'} />}
      renderItem={({ item: s }) => (
        <ListItem title={s.name} subtitle={[s.contact_person, s.phone, s.active ? '' : 'Inactive'].filter(Boolean).join(' · ') || undefined}
          right={money(s.owed)} rightSub={Number(s.owed) > 0 ? 'you owe' : undefined}
          tone={Number(s.owed) > 0 ? c.danger : undefined}
          onPress={() => (wide ? setSelected(s.id) : router.push({ pathname: '/supplier/[id]', params: { id: String(s.id) } }))} />
      )}
    />
  );
  if (!wide) return list;
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      <View style={{ width: 380, borderRightWidth: 1, borderRightColor: c.border }}>{list}</View>
      <View style={{ flex: 1 }}>
        {selected ? <SupplierView key={selected} id={selected} /> : <Empty text="Choose a supplier." />}
      </View>
    </View>
  );
}
