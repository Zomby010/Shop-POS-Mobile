/** Small building blocks shared by every screen, in light and dark. */
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  type TextInputProps, View, type ViewStyle, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const palette = {
  light: {
    bg: '#f5f6f4', card: '#ffffff', text: '#16201b', muted: '#5f6b65', border: '#dfe3df', primary: '#1f7a4d',
    primaryText: '#ffffff', danger: '#b42318', warning: '#b45309', good: '#1f7a4d', chip: '#e8efe9', input: '#ffffff',
  },
  dark: {
    bg: '#0f1412', card: '#18201c', text: '#f2f6f3', muted: '#b4c0b9', border: '#2a3530', primary: '#4cc78a',
    primaryText: '#08130d', danger: '#f97066', warning: '#f5a524', good: '#3fb07a', chip: '#22302a', input: '#121a16',
  },
};

export type Colors = typeof palette.light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const c = useColors();
  const inner = padded ? { padding: 16, gap: 12 } : undefined;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.card, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, padding: 14, gap: 8 }, style]}>{children}</View>;
}

export function T({ children, size = 15, weight = '400', color, align, mono, numberOfLines }: {
  children: ReactNode; size?: number; weight?: '400' | '500' | '600' | '700'; color?: string;
  align?: 'left' | 'right' | 'center'; mono?: boolean; numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text numberOfLines={numberOfLines} style={{
      fontSize: size, fontWeight: weight, color: color ?? c.text, textAlign: align,
      fontFamily: mono ? Platform.select({ ios: 'Menlo', default: 'monospace' }) : undefined,
      fontVariant: ['tabular-nums'],
    }}>{children}</Text>
  );
}

export const Muted = ({ children, size = 13 }: { children: ReactNode; size?: number }) => {
  const c = useColors();
  return <T size={size} color={c.muted}>{children}</T>;
};

export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, busy, small }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; busy?: boolean; small?: boolean;
}) {
  const c = useColors();
  const bg = { primary: c.primary, secondary: c.chip, danger: c.danger, ghost: 'transparent' }[kind];
  const fg = kind === 'primary' ? c.primaryText : kind === 'danger' ? '#fff' : c.text;
  return (
    <Pressable
      accessibilityRole="button" onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => ({
        backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, borderRadius: 10,
        paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 16, minHeight: small ? 36 : 48,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      })}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: small ? 14 : 16, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label?: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      {label ? <T size={13} weight="500" color={c.muted}>{label}</T> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[{
          backgroundColor: c.input, color: c.text, borderColor: c.border, borderWidth: 1, borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, minHeight: 46,
        }, props.style]}
      />
      {hint ? <Muted size={12}>{hint}</Muted> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{
      backgroundColor: active ? c.primary : c.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    }}>
      <Text style={{ color: active ? c.primaryText : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => <Chip key={o.value} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} />)}
    </ScrollView>
  );
}

export function Banner({ text, kind = 'danger' }: { text: string | null | undefined; kind?: 'danger' | 'good' | 'warning' }) {
  const c = useColors();
  if (!text) return null;
  const color = c[kind];
  return (
    <View style={{ borderLeftWidth: 4, borderLeftColor: color, backgroundColor: c.card, padding: 12, borderRadius: 8 }}>
      <T color={color} weight="500">{text}</T>
    </View>
  );
}

export function KeyValue({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Muted size={14}>{label}</Muted>
      <T weight={strong ? '700' : '500'} color={color}>{value}</T>
    </Row>
  );
}

export function Empty({ text }: { text: string }) {
  return <View style={{ padding: 32, alignItems: 'center' }}><Muted size={15}>{text}</Muted></View>;
}

export function Loading() {
  return <View style={{ padding: 32 }}><ActivityIndicator /></View>;
}

export function ListItem({ title, subtitle, right, rightSub, onPress, tone }: {
  title: string; subtitle?: string; right?: string; rightSub?: string; onPress?: () => void; tone?: string;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({
      backgroundColor: c.card, paddingVertical: 12, paddingHorizontal: 14, opacity: pressed ? 0.7 : 1,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, flexDirection: 'row', gap: 12, alignItems: 'center',
    })}>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="600" numberOfLines={1}>{title}</T>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      {right ? (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <T weight="600" color={tone}>{right}</T>
          {rightSub ? <Muted size={12}>{rightSub}</Muted> : null}
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={c.muted} /> : null}
    </Pressable>
  );
}

/** A centred sheet for short forms: a PIN, a quantity, a reason. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 20 }} onPress={onClose}>
          <Pressable style={{ backgroundColor: c.card, borderRadius: 16, padding: 18, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' }} onPress={() => {}}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={18} weight="700">{title}</T>
              <Pressable onPress={onClose} hitSlop={12}><Ionicons name="close" size={22} color={c.muted} /></Pressable>
            </Row>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Asks for the owner's PIN; `onSubmit` returns an error message to show, or nothing when it worked. */
export function PinSheet({ visible, title, withReason, onClose, onSubmit }: {
  visible: boolean; title: string; withReason?: boolean; onClose: () => void;
  onSubmit: (pin: string, reason: string) => Promise<string | void>;
}) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const close = () => { setPin(''); setReason(''); setErr(null); onClose(); };
  return (
    <Sheet visible={visible} title={title} onClose={close}>
      <Banner text={err} />
      {withReason ? <Field label="Reason" value={reason} onChangeText={setReason} placeholder="Why?" /> : null}
      <Field label="Owner's PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry autoFocus maxLength={12} />
      <Button title="Approve" busy={busy} onPress={async () => {
        setBusy(true);
        const problem = await onSubmit(pin, reason);
        setBusy(false);
        if (problem) setErr(problem); else close();
      }} />
    </Sheet>
  );
}
