import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { get } from '@/api/client';
import type { StaffUser } from '@/api/types';
import { Banner, Button, Empty, ListItem, useColors } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

/** Everyone who can sign in, with today's sales. Owner only, as on the website. */
export default function Users() {
  const c = useColors();
  const router = useRouter();
  const { data, error, loading, reload } = useApi(() => get<{ users: StaffUser[] }>('users/'));
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return (
    <>
      <Stack.Screen options={{ headerRight: () => (
        <Button title="Add" small kind="ghost" icon="person-add-outline" onPress={() => router.push('/owner/user')} />
      ) }} />
      <FlatList
        data={data?.users ?? []}
        keyExtractor={(u) => String(u.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={error ? <Banner text={error} /> : undefined}
        ListEmptyComponent={loading ? undefined : <Empty text="No users yet." />}
        renderItem={({ item: u }) => (
          <ListItem title={u.name ? `${u.name} (${u.username})` : u.username}
            subtitle={`${u.roles.join(', ') || u.role}${u.is_active ? '' : ' · cannot sign in'} · last in ${u.last_login ? dateTime(u.last_login) : 'never'}`}
            right={money(u.takings_today ?? '0')} rightSub={`${u.sales_today ?? 0} sales today`}
            tone={u.is_active ? undefined : c.muted}
            onPress={() => router.push({ pathname: '/owner/user', params: { id: String(u.id) } })} />
        )}
      />
    </>
  );
}
