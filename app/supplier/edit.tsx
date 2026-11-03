import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { get, post } from '@/api/client';
import type { Supplier, SupplierPage } from '@/api/types';
import { Banner, Button, Card, Field, Loading, Muted, Screen, T } from '@/components/ui';

const BLANK = { name: '', contact_person: '', phone: '', email: '', address: '', kra_pin: '', notes: '' };
type Form = typeof BLANK;

/** Add or edit a supplier, with the website's supplier form. */
export default function EditSupplier() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [f, setF] = useState<Form>(BLANK);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!id) return;
    get<SupplierPage>(`suppliers/${id}/`).then(({ supplier: s }) => {
      setF({ name: s.name, contact_person: s.contact_person, phone: s.phone, email: s.email, address: s.address,
        kra_pin: s.kra_pin, notes: s.notes });
      setActive(s.active); setReady(true);
    }).catch((e: Error) => { setError(e.message); setReady(true); });
  }, [id]);

  const save = async (body: Partial<Form> & { active?: boolean }) => {
    setBusy(true); setError(null);
    try {
      const r = await post<{ supplier: Supplier }>(id ? `suppliers/${id}/` : 'suppliers/', body);
      if (id) router.back();
      else router.replace({ pathname: '/supplier/[id]', params: { id: String(r.supplier.id) } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <Loading />;
  return (
    <Screen>
      <Banner text={error} />
      <Card>
        <T weight="600">Supplier</T>
        <Field label="Name" value={f.name} onChangeText={set('name')} autoFocus={!id} />
        <Field label="Contact person" value={f.contact_person} onChangeText={set('contact_person')} />
        <Field label="KRA PIN" value={f.kra_pin} onChangeText={set('kra_pin')} autoCapitalize="characters" />
      </Card>
      <Card>
        <T weight="600">Contact</T>
        <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Address" value={f.address} onChangeText={set('address')} />
        <Field label="Notes" value={f.notes} onChangeText={set('notes')} multiline />
      </Card>
      <Button title={id ? 'Save changes' : 'Add supplier'} busy={busy} disabled={!f.name.trim()}
        onPress={() => void save(id ? { ...f, active } : f)} />
      {id ? (
        active ? (
          <Button title="Make inactive" kind="ghost" small disabled={busy} onPress={() => Alert.alert(
            'Make this supplier inactive?', 'They leave the supplier lists and the Receive stock picker. Their purchases and payments stay.',
            [{ text: 'Back' }, { text: 'Make inactive', style: 'destructive', onPress: () => void save({ active: false }) }])} />
        ) : (
          <>
            <Muted>This supplier is inactive.</Muted>
            <Button title="Make active again" kind="secondary" small disabled={busy} onPress={() => void save({ active: true })} />
          </>
        )
      ) : null}
    </Screen>
  );
}
