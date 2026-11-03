/** The frame every report shares: period chips, an Excel button in the header, pull to refresh, loading, empty
 * and error states, and rows that open a sheet with every figure instead of a sideways-scrolling table. */
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { type ReactNode, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { shareExcel } from '@/lib/excel';
import type { Range } from '@/lib/period';
import { rangeQuery } from '@/lib/period';

import { PeriodPicker } from './PeriodPicker';
import { Banner, Empty, KeyValue, ListItem, Sheet, useColors } from './ui';

/** Puts an Excel download button in the screen's header. */
export function useExcelButton(report: string, query: Record<string, string | number | undefined>, title: string,
  onError: (m: string) => void) {
  const c = useColors();
  const navigation = useNavigation();
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(query);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable disabled={busy} hitSlop={12} style={{ padding: 8 }} accessibilityLabel="Download Excel" onPress={async () => {
          setBusy(true);
          try { await shareExcel(report, query, title); } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
        }}>
          {busy ? <ActivityIndicator /> : <Ionicons name="download-outline" size={22} color={c.text} />}
        </Pressable>
      ),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, c, busy, report, key, title]);
}

export interface RowView { key: string; title: string; subtitle?: string; right?: string; rightSub?: string; tone?: string;
  details?: [string, string][] }

export function ReportList({ report, title, range, onRange, extra, header, rows, loading, error, reload, empty, noPeriod }: {
  report: string; title: string; range: Range; onRange: (r: Range) => void; extra?: Record<string, string>;
  header?: ReactNode; rows: RowView[]; loading: boolean; error: string | null; reload: () => void; empty: string; noPeriod?: boolean;
}) {
  const [open, setOpen] = useState<RowView | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  useExcelButton(report, { ...(noPeriod ? {} : rangeQuery(range)), ...extra }, title, setExcelError);
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={
          <View style={{ padding: 12, gap: 10 }}>
            {noPeriod ? null : <PeriodPicker value={range} onChange={onRange} />}
            <Banner text={error ?? excelError} />
            {header}
          </View>
        }
        ListEmptyComponent={loading ? undefined : <Empty text={empty} />}
        renderItem={({ item: r }) => (
          <ListItem title={r.title} subtitle={r.subtitle} right={r.right} rightSub={r.rightSub} tone={r.tone}
            onPress={r.details?.length ? () => setOpen(r) : undefined} />
        )}
      />
      <Sheet visible={!!open} title={open?.title ?? ''} onClose={() => setOpen(null)}>
        {open?.details?.map(([k, v]) => <KeyValue key={k} label={k} value={v} />)}
      </Sheet>
    </View>
  );
}
