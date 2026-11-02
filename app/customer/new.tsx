import { useRouter } from 'expo-router';
import { useState } from 'react';

import { post } from '@/api/client';
import type { Customer } from '@/api/types';
import { Banner, Button, Field, Screen } from '@/components/ui';
import { can, useSession } from '@/store/session';

/** Add a customer for deni or invoices. An opening balance is deni they owed before this system. */
export default function NewCustomer() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const [f, setF] = useState({ name: '', phone: '', email: '', kra_pin: '', credit_limit: '', opening_balance: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const c = await post<Customer>('customers/', f);
      router.replace({ pathname: '/customer/[id]', params: { id: String(c.id) } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Banner text={error} />
      <Field label="Name" value={f.name} onChangeText={set('name')} autoFocus />
      <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Field label="KRA PIN" value={f.kra_pin} onChangeText={set('kra_pin')} autoCapitalize="characters" />
      {can(user, 'credit_limit') ? (
        <Field label="Credit limit (KSh)" value={f.credit_limit} onChangeText={set('credit_limit')} keyboardType="decimal-pad" hint="Leave blank for no limit." />
      ) : null}
      <Field label="Opening balance (KSh)" value={f.opening_balance} onChangeText={set('opening_balance')} keyboardType="decimal-pad"
        hint="Deni they already owed before using this system." />
      <Field label="Reference / notes" value={f.notes} onChangeText={set('notes')} />
      <Button title="Save customer" onPress={save} busy={busy} disabled={!f.name.trim()} />
    </Screen>
  );
}
