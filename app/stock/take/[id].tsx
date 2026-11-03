import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { get, post } from '@/api/client';
import type { Named, StockTakeSheet } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, KeyValue, Muted, Row, T, useColors } from '@/components/ui';
import { dateTime, money, qty } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useCatalog } from '@/store/catalog';
import { useScan } from '@/store/scan';
import { can, useSession } from '@/store/session';

/** The count sheet: type what is on the shelf for each product, save as you go, then approve. */
export default function StockTakeScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const categories: Named[] = useCatalog((s) => s.catalog?.categories ?? []);
  const [category, setCategory] = useState('');
  const [show, setShow] = useState<'' | 'uncounted' | 'changed'>('');
  const uncounted = show === 'uncounted';
  const [term, setTerm] = useState('');
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'danger' } | null>(null);
  const { data, error, loading, reload, setData } = useApi(
    () => get<StockTakeSheet>(`stocktakes/${id}/`, { category, uncounted: uncounted ? 1 : '', changed: show === 'changed' ? 1 : '' }), [id, category, show]);

  useFocusEffect(useCallback(() => {
    const code = useScan.getState().take('stocktake');
    if (code) setTerm(code);
  }, []));

  const open = data?.stocktake.status === 'open';
  const mayCount = open && can(user, 'stocktake');
  const lines = useMemo(() => {
    const t = term.trim().toLowerCase();
    const all = data?.lines ?? [];
    return t ? all.filter((l) => l.barcode === term.trim() || l.product.toLowerCase().includes(t)) : all;
  }, [data, term]);
  const changed = Object.keys(typed).length;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await post<StockTakeSheet>(`stocktakes/${id}/?category=${category}${uncounted ? '&uncounted=1' : ''}${show === 'changed' ? '&changed=1' : ''}`, { counts: typed });
      setData(r); setTyped({});
      setMsg(r.errors.length ? { text: r.errors.join(' '), kind: 'danger' } : { text: 'Counts saved.', kind: 'good' });
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const finish = (action: 'approve' | 'cancel') => Alert.alert(
    action === 'approve' ? 'Approve this stock take?' : 'Cancel this stock take?',
    action === 'approve' ? 'Stock levels will change to match the counts. Products not counted stay as they are.' : 'The counts are thrown away.',
    [{ text: 'Back' }, { text: action === 'approve' ? 'Approve' : 'Cancel it', style: action === 'cancel' ? 'destructive' : 'default', onPress: async () => {
      setBusy(true);
      try {
        await post(`stocktakes/${id}/${action}/`);
        void useCatalog.getState().load(true);
        if (action === 'cancel') router.back(); else void reload();
      } catch (e) {
        setMsg({ text: (e as Error).message, kind: 'danger' });
      } finally {
        setBusy(false);
      }
    } }]);

  const header = data ? (
    <View style={{ padding: 12, gap: 10 }}>
      <Card>
        <T size={18} weight="700">{data.stocktake.code} · {data.stocktake.status_label}</T>
        <Muted>Started {dateTime(data.stocktake.started_at)} by {data.stocktake.started_by ?? '?'}{data.stocktake.note ? ` · ${data.stocktake.note}` : ''}</Muted>
        <KeyValue label="Counted" value={`${data.counted_count} of ${data.total_count}`} strong />
        {data.variance_value !== null ? <KeyValue label="Difference so far" value={money(data.variance_value)} /> : null}
        {data.stocktake.approved_at ? <Muted>Approved {dateTime(data.stocktake.approved_at)} by {data.stocktake.approved_by}</Muted> : null}
      </Card>
      <Banner text={error ?? msg?.text} kind={msg?.kind ?? 'danger'} />
      <Row>
        <View style={{ flex: 1 }}><Field value={term} onChangeText={setTerm} placeholder="Find a product or scan" autoCorrect={false} /></View>
        <Pressable onPress={() => { useScan.getState().open('stocktake'); router.push('/scan'); }}
          style={{ backgroundColor: c.chip, borderRadius: 10, height: 46, width: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="barcode-outline" size={24} color={c.text} />
        </Pressable>
      </Row>
      <ChipRow value={category} onChange={setCategory} options={[{ value: '', label: 'All categories' }, ...categories.map((x) => ({ value: String(x.id), label: x.name }))]} />
      <ChipRow value={show} onChange={setShow} options={[{ value: '' as const, label: 'All' },
        ...(open ? [{ value: 'uncounted' as const, label: 'Not counted yet' }] : []), { value: 'changed' as const, label: 'Differences only' }]} />
    </View>
  ) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={lines}
        keyExtractor={(l) => String(l.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: l }) => {
          const neg = l.variance !== null && l.variance.startsWith('-');
          return (
            <View style={{ backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T weight="600">{l.product}</T>
                  <Muted size={12}>Expected {qty(l.expected_qty, l.unit)}{l.variance !== null ? ` · difference ${qty(l.variance)}` : ''}
                    {l.variance_value !== undefined && l.counted_qty !== null ? ` (${money(l.variance_value)})` : ''}</Muted>
                </View>
                <View style={{ width: 110 }}>
                  <Field value={typed[l.id] ?? (l.counted_qty !== null ? qty(l.counted_qty) : '')} editable={mayCount}
                    onChangeText={(v) => setTyped((t) => ({ ...t, [l.id]: v }))} keyboardType={l.loose ? 'decimal-pad' : 'number-pad'}
                    placeholder={l.unit} style={neg ? { borderColor: c.danger } : undefined} />
                </View>
              </Row>
            </View>
          );
        }}
      />
      {open ? (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, gap: 8 }}>
          {mayCount ? <Button title={changed ? `Save ${changed} count${changed === 1 ? '' : 's'}` : 'Counts saved'} busy={busy} disabled={!changed} onPress={save} /> : null}
          <Row>
            {can(user, 'approve_stocktake') ? <View style={{ flex: 1 }}><Button title="Approve" kind="secondary" icon="checkmark-done" disabled={busy || !!changed} onPress={() => finish('approve')} /></View> : null}
            {can(user, 'stocktake') ? <View style={{ flex: 1 }}><Button title="Cancel" kind="ghost" disabled={busy} onPress={() => finish('cancel')} /></View> : null}
          </Row>
        </View>
      ) : null}
    </View>
  );
}
