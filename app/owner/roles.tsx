import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { get, post } from '@/api/client';
import type { RolesPage } from '@/api/types';
import { Banner, Button, Card, ChipRow, Loading, Muted, Screen, T } from '@/components/ui';

type Levels = Record<string, Record<string, string>>;

/** What each staff role may do, area by area, with the website's levels. Owner-only privileges stay with the owner. */
export default function Roles() {
  const [page, setPage] = useState<RolesPage | null>(null);
  const [role, setRole] = useState('');
  const [edits, setEdits] = useState<Levels>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const apply = (p: RolesPage) => {
    setPage(p); setEdits({}); setRole((r) => r || p.roles[0]);
    setDone(p.changes.length ? `Saved: ${p.changes.join('; ')}` : null);
  };
  useEffect(() => { get<RolesPage>('roles/').then(apply).catch((e: Error) => setError(e.message)); }, []);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try { apply(await post<RolesPage>('roles/', body)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (!page) return error ? <Screen><Banner text={error} /></Screen> : <Loading />;
  const count = Object.values(edits).reduce((n, r) => n + Object.keys(r).length, 0);
  const levelOf = (key: string, saved: string) => edits[role]?.[key] ?? saved;
  const choose = (key: string, saved: string) => (level: string) => setEdits((e) => {
    const forRole = { ...(e[role] ?? {}) };
    if (level === saved) delete forRole[key]; else forRole[key] = level;
    return { ...e, [role]: forRole };
  });
  return (
    <Screen>
      <Banner text={error} />
      <Banner text={done} kind="good" />
      <ChipRow options={page.roles.map((r) => ({ value: r, label: r }))} value={role} onChange={setRole} />
      <Muted size={12}>The owner can always do everything.</Muted>
      {page.areas.map((a) => (
        <Card key={a.area}>
          <T weight="600">{a.area}</T>
          {a.privileges.map((p) => (
            <View key={p.key} style={{ gap: 6 }}>
              <T>{p.label}</T>
              {p.owner_only ? <Muted size={12}>Owner only</Muted> : (
                <ChipRow options={p.levels.map((l) => ({ value: l, label: page.level_labels[l] ?? l }))}
                  value={levelOf(p.key, p.values[role])} onChange={choose(p.key, p.values[role])} />
              )}
            </View>
          ))}
        </Card>
      ))}
      <Button title={count ? `Save ${count} change${count === 1 ? '' : 's'}` : 'No changes'} busy={busy} disabled={!count}
        onPress={() => void send({ levels: edits })} />
      <Button title="Reset every role to the defaults" kind="ghost" small disabled={busy} onPress={() => Alert.alert(
        'Reset every role?', 'Cashiers and stock clerks go back to the standard privileges. The change is written to the audit log.',
        [{ text: 'Back' }, { text: 'Reset', style: 'destructive', onPress: () => void send({ reset: true }) }])} />
    </Screen>
  );
}
