import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { get, post } from '@/api/client';
import type { CustomerDetail } from '@/api/types';
import { Banner, Button, Card, Field, Loading, Muted, Screen, T } from '@/components/ui';
import { can, useSession } from '@/store/session';

const BLANK = { name: '', phone: '', email: '', address: '', kra_pin: '', credit_limit: '', notes: '' };
type Form = typeof BLANK;

/** Edit a customer with the website's customer form. Deactivating keeps their deni and history. */
export default function EditCustomer() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [f, setF] = useState<Form>(BLANK);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    get<CustomerDetail>(`customers/${id}/`).then((c) => {
      setF({ name: c.name, phone: c.phone, email: c.email, address: c.address, kra_pin: c.kra_pin,
        credit_limit: c.credit_limit ?? '', notes: c.notes });
      setActive(c.active); setReady(true);
    }).catch((e: Error) => { setError(e.message); setReady(true); });
  }, [id]);

  const save = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try {
      await post(`customers/${id}/`, body);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const limits = can(user, 'credit_limit');

  if (!ready) return <Loading />;
  return (
    <Screen>
      <Banner text={error} />
      <Card>
        <T weight="600">Customer</T>
        <Field label="Name" value={f.name} onChangeText={set('name')} />
        <Field label="KRA PIN" value={f.kra_pin} onChangeText={set('kra_pin')} autoCapitalize="characters" />
        {limits ? (
          <Field label="Credit limit (KSh)" value={f.credit_limit} onChangeText={set('credit_limit')} keyboardType="decimal-pad" hint="Leave blank for no limit." />
        ) : <Muted>Only the owner can change the credit limit.</Muted>}
      </Card>
      <Card>
        <T weight="600">Contact</T>
        <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Address" value={f.address} onChangeText={set('address')} />
        <Field label="Reference / notes" value={f.notes} onChangeText={set('notes')} multiline />
      </Card>
      <Button title="Save changes" busy={busy} disabled={!f.name.trim()} onPress={() => {
        const { credit_limit, ...rest } = f;
        void save(limits ? { ...f } : rest);
      }} />
      {active ? (
        <Button title="Make inactive" kind="ghost" small disabled={busy} onPress={() => Alert.alert(
          'Make this customer inactive?', 'They can no longer take deni. Their balance, statement and sales stay, and they can still repay.',
          [{ text: 'Back' }, { text: 'Make inactive', style: 'destructive', onPress: () => void save({ active: false }) }])} />
      ) : (
        <>
          <Muted>This customer is inactive.</Muted>
          <Button title="Make active again" kind="secondary" small disabled={busy} onPress={() => void save({ active: true })} />
        </>
      )}
    </Screen>
  );
}
