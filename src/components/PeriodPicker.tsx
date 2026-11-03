/** Period chips (Today, This week, This month, Last month, Custom) with real date pickers for a custom range. */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, View, useColorScheme } from 'react-native';

import { REPORT_PERIODS, type Range, fromIsoDay, isoDay } from '@/lib/period';
import { day } from '@/lib/format';

import { Button, ChipRow, Muted, Row, Sheet, T, useColors } from './ui';

/** A button that shows a date and opens the phone's calendar. */
export function DateButton({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const c = useColors();
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(fromIsoDay(value));
  const picked = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (e.type === 'set' && d) onChange(isoDay(d));
    } else if (d) setDraft(d);
  };
  return (
    <>
      <Pressable onPress={() => { setDraft(fromIsoDay(value)); setOpen(true); }} accessibilityLabel={`${label}: ${day(value)}`}
        style={{ flex: 1, minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.input,
          paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="calendar-outline" size={18} color={c.muted} />
        <View>
          <Muted size={11}>{label}</Muted>
          <T weight="600">{day(value)}</T>
        </View>
      </Pressable>
      {open && Platform.OS === 'android' ? (
        <DateTimePicker value={fromIsoDay(value)} mode="date" maximumDate={new Date()} onChange={picked} />
      ) : null}
      {Platform.OS !== 'android' ? (
        <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
          <DateTimePicker value={draft} mode="date" display="inline" maximumDate={new Date()} onChange={picked}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'} />
          <Button title="Done" onPress={() => { onChange(isoDay(draft)); setOpen(false); }} />
        </Sheet>
      ) : null}
    </>
  );
}

/** The period chips every report shares. `allowAll` adds an All time chip for logs that are not reports. */
export function PeriodPicker({ value, onChange, allowAll }: { value: Range; onChange: (r: Range) => void; allowAll?: boolean }) {
  const today = isoDay(new Date());
  const chip = value.kind === 'period' ? value.period : value.kind;
  const options = [
    ...(allowAll ? [{ value: 'all', label: 'All time' }] : []),
    ...REPORT_PERIODS,
    { value: 'custom', label: 'Custom' },
  ];
  const pick = (v: string) => {
    if (v === 'all') onChange({ kind: 'all' });
    else if (v === 'custom') onChange(value.kind === 'custom' ? value : { kind: 'custom', start: today, end: today });
    else onChange({ kind: 'period', period: v });
  };
  return (
    <View style={{ gap: 8 }}>
      <ChipRow options={options} value={chip} onChange={pick} />
      {value.kind === 'custom' ? (
        <Row>
          <DateButton label="From" value={value.start} onChange={(start) => onChange({ ...value, start })} />
          <DateButton label="To" value={value.end} onChange={(end) => onChange({ ...value, end })} />
        </Row>
      ) : null}
    </View>
  );
}
