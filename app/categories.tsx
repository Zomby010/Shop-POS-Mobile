import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Switch } from 'react-native';

import { get, post } from '@/api/client';
import type { CategoryRow } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, Muted, Row, Screen, Sheet, T, useColors } from '@/components/ui';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';

type Kind = 'categories' | 'quick-categories';
const KEY: Record<Kind, 'categories' | 'quick_categories'> = { categories: 'categories', 'quick-categories': 'quick_categories' };

/** Product categories and the sell screen's quick-sale tabs. */
export default function Categories() {
  const c = useColors();
  const [kind, setKind] = useState<Kind>('categories');
  const { data, error, reload, setData } = useApi(() => get<Record<string, CategoryRow[]>>(`${kind}/`), [kind]);
  const [editing, setEditing] = useState<Partial<CategoryRow> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const rows = data?.[KEY[kind]] ?? [];

  const send = async (body: Record<string, unknown>) => {
    setBusy(true); setMsg(null);
    try {
      setData(await post<Record<string, CategoryRow[]>>(`${kind}/`, body));
      setEditing(null);
      void useCatalog.getState().load(true);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ChipRow value={kind} onChange={(k) => { setKind(k); setEditing(null); }}
        options={[{ value: 'categories', label: 'Categories' }, { value: 'quick-categories', label: 'Quick-sale tabs' }]} />
      <Muted>{kind === 'categories'
        ? 'Categories group products in lists and reports. Removing one keeps its products.'
        : 'These are the tabs on the sell screen. Removing one only takes its tab away; its products are kept.'}</Muted>
      <Banner text={error ?? msg} />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {rows.map((r) => (
          <Pressable key={r.id} onPress={() => setEditing(r)} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T weight="600">{r.name}{r.active === false ? ' (hidden)' : ''}</T>
              <Muted>{r.item_count} product{r.item_count === 1 ? '' : 's'}</Muted>
            </Row>
            {r.description ? <Muted size={12}>{r.description}</Muted> : null}
          </Pressable>
        ))}
        {!rows.length ? <Muted>None yet.</Muted> : null}
      </Card>
      <Button title="Add" icon="add" kind="secondary" onPress={() => setEditing({ name: '', order: rows.length, active: true })} />
      <Button title="Refresh" kind="ghost" small onPress={reload} />

      <Sheet visible={!!editing} title={editing?.id ? 'Change' : 'Add'} onClose={() => setEditing(null)}>
        <Banner text={msg} />
        <Field label="Name" value={editing?.name ?? ''} onChangeText={(name) => setEditing((e) => e && { ...e, name })} autoFocus />
        {kind === 'categories' ? <Field label="What goes in it" value={editing?.description ?? ''}
          onChangeText={(description) => setEditing((e) => e && { ...e, description })} /> : null}
        <Field label="Order (lower comes first)" value={String(editing?.order ?? 0)} keyboardType="number-pad"
          onChangeText={(v) => setEditing((e) => e && { ...e, order: Number(v) || 0 })} />
        {kind === 'quick-categories' ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Show on the sell screen</T>
            <Switch value={editing?.active ?? true} onValueChange={(active) => setEditing((e) => e && { ...e, active })} />
          </Row>
        ) : null}
        <Button title="Save" busy={busy} disabled={!editing?.name?.trim()} onPress={() => editing && void send({
          id: editing.id, name: editing.name, order: editing.order ?? 0,
          ...(kind === 'categories' ? { description: editing.description ?? '' } : { active: editing.active ?? true }),
        })} />
        {editing?.id ? (
          <Pressable onPress={() => Alert.alert(`Remove ${editing.name}?`, 'Its products are kept.', [
            { text: 'Keep' }, { text: 'Remove', style: 'destructive', onPress: () => void send({ id: editing.id, delete: true }) },
          ])} style={{ alignSelf: 'center', padding: 8 }}>
            <Row gap={6}><Ionicons name="trash-outline" size={18} color={c.danger} /><T color={c.danger}>Remove</T></Row>
          </Pressable>
        ) : null}
      </Sheet>
    </Screen>
  );
}
