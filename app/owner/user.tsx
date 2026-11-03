import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { get, post } from '@/api/client';
import type { StaffUser } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, Loading, Muted, Screen, T } from '@/components/ui';
import { useSession } from '@/store/session';

/** Add a user, or change one: name, role, a new password or owner PIN, and whether they can sign in. */
export default function EditUser() {
  const router = useRouter();
  const me = useSession((s) => s.user);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [roles, setRoles] = useState<string[]>([]);
  const [u, setU] = useState<StaffUser | null>(null);
  const [f, setF] = useState({ username: '', name: '', email: '', role: 'Cashier', password: '', pin: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(!id);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const load = get<{ user?: StaffUser; roles: string[] }>(id ? `users/${id}/` : 'users/');
    load.then((r) => {
      setRoles(r.roles);
      if (id && r.user) {
        setU(r.user);
        setF({ username: r.user.username, name: r.user.name, email: r.user.email, role: r.user.role, password: '', pin: '' });
      }
      setReady(true);
    }).catch((e: Error) => { setError(e.message); setReady(true); });
  }, [id]);

  const save = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try {
      await post(id ? `users/${id}/` : 'users/', body);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = () => {
    const body: Record<string, unknown> = { username: f.username.trim(), name: f.name, email: f.email, role: f.role };
    if (f.password) body.password = f.password;
    if (f.pin) body.pin = f.pin;
    void save(body);
  };

  if (!ready) return <Loading />;
  const self = u?.id === me?.id;
  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit user' : 'Add user' }} />
      <Banner text={error} />
      <Card>
        <T weight="600">Who</T>
        <Field label="Username" value={f.username} onChangeText={set('username')} autoCapitalize="none" autoCorrect={false} />
        <Field label="Name" value={f.name} onChangeText={set('name')} />
        <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        <Muted>Role</Muted>
        <ChipRow options={roles.map((r) => ({ value: r, label: r }))} value={f.role} onChange={set('role')} />
      </Card>
      <Card>
        <T weight="600">{id ? 'Reset sign-in' : 'Sign-in'}</T>
        <Field label="Password" value={f.password} onChangeText={set('password')} secureTextEntry autoCapitalize="none"
          hint={id ? 'At least 6 characters. Leave blank to keep the current password.' : 'At least 6 characters.'} />
        {f.role === 'Owner' ? (
          <Field label="Owner PIN" value={f.pin} onChangeText={set('pin')} secureTextEntry keyboardType="number-pad" maxLength={8}
            hint={`4 to 8 digits. Owners use it to approve voids and refunds.${u?.has_pin ? ' Leave blank to keep the current PIN.' : ''}`} />
        ) : null}
      </Card>
      <Button title={id ? 'Save changes' : 'Add user'} busy={busy}
        disabled={!f.username.trim() || (!id && f.password.length < 6)} onPress={submit} />
      {u && !self ? (u.is_active ? (
        <Button title="Stop this user signing in" kind="ghost" small disabled={busy} onPress={() => Alert.alert(
          `Stop ${u.username} signing in?`, 'Their sales and records stay. You can let them back in later.',
          [{ text: 'Back' }, { text: 'Stop sign-in', style: 'destructive', onPress: () => void save({ is_active: false }) }])} />
      ) : (
        <>
          <Muted>This user can't sign in.</Muted>
          <Button title="Let them sign in again" kind="secondary" small disabled={busy} onPress={() => void save({ is_active: true })} />
        </>
      )) : null}
    </Screen>
  );
}
