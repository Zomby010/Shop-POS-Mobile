import { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { get } from '@/api/client';
import type { AuditEntry } from '@/api/types';
import { Banner, Empty, ListItem } from '@/components/ui';
import { dateTime } from '@/lib/format';
import { useApi } from '@/lib/useApi';

interface Page { entries: AuditEntry[]; next_offset: number | null }

/** Voids, refunds, price changes, privilege changes and other sensitive steps, newest first. */
export default function AuditLog() {
  const [more, setMore] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const { data, error, loading, reload } = useApi(async () => {
    const r = await get<Page>('audit-log/');
    setMore([]); setNext(r.next_offset);
    return r;
  });
  const loadMore = async () => {
    if (next === null) return;
    const r = await get<Page>('audit-log/', { offset: next });
    setMore((m) => [...m, ...r.entries]); setNext(r.next_offset);
  };
  return (
    <FlatList
      data={[...(data?.entries ?? []), ...more]}
      keyExtractor={(e) => String(e.id)}
      onEndReached={loadMore}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      ListHeaderComponent={error ? <Banner text={error} /> : undefined}
      ListEmptyComponent={loading ? undefined : <Empty text="Nothing recorded yet." />}
      renderItem={({ item: e }) => (
        <ListItem title={`${e.action} · ${e.object}`}
          subtitle={[dateTime(e.created_at), e.user ?? 'system', e.authorised_by ? `approved by ${e.authorised_by}` : '', e.reason]
            .filter(Boolean).join(' · ')} />
      )}
    />
  );
}
