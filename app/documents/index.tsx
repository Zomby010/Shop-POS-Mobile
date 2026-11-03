import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { get } from '@/api/client';
import type { DocChoices, DocSummary } from '@/api/types';
import { Banner, ChipRow, Empty, Field, ListItem, useColors } from '@/components/ui';
import { day, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

interface Page extends DocChoices { documents: DocSummary[]; next_offset: number | null }

const KINDS = [{ value: '', label: 'All' }, { value: 'invoice', label: 'Invoices' }, { value: 'quotation', label: 'Quotations' }];

/** The website's Invoices and quotations list. */
export default function Documents() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [more, setMore] = useState<DocSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const { data, error, loading, reload } = useApi(async () => {
    const r = await get<Page>('documents/', { kind, status, q });
    setMore([]); setNext(r.next_offset);
    return r;
  }, [kind, status]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const loadMore = async () => {
    if (next === null) return;
    const r = await get<Page>('documents/', { kind, status, q, offset: next });
    setMore((m) => [...m, ...r.documents]); setNext(r.next_offset);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push({ pathname: '/documents/edit', params: { kind: kind || 'invoice' } })} hitSlop={12}
          style={{ padding: 8 }} accessibilityLabel="New invoice or quotation">
          <Ionicons name="add" size={26} color={c.text} />
        </Pressable>
      ),
    });
  }, [navigation, router, c, kind]);

  return (
    <FlatList
      data={[...(data?.documents ?? []), ...more]}
      keyExtractor={(d) => String(d.id)}
      onEndReached={loadMore}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <Field value={q} onChangeText={setQ} placeholder="Name or number, e.g. INV-0012" returnKeyType="search" onSubmitEditing={reload} autoCapitalize="characters" />
          <ChipRow options={KINDS} value={kind} onChange={setKind} />
          <ChipRow options={[{ value: '', label: 'Any status' }, ...(data?.statuses ?? [])]} value={status} onChange={setStatus} />
          <Banner text={error} />
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Empty text="No invoices or quotations here." />}
      renderItem={({ item: d }) => {
        const owing = d.balance_due !== null && Number(d.balance_due) > 0 && d.status !== 'draft';
        return (
          <ListItem title={`${d.code} · ${d.party}`} subtitle={`${day(d.date)} · ${d.status_label}`}
            right={money(d.total)} rightSub={owing ? `${money(d.balance_due)} due` : undefined} tone={owing ? c.danger : undefined}
            onPress={() => router.push({ pathname: '/documents/[id]', params: { id: String(d.id) } })} />
        );
      }}
    />
  );
}
