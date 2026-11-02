import Constants from 'expo-constants';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner, Button, Card, Field, Muted, Screen, T } from '@/components/ui';
import { useSession } from '@/store/session';

/** Sign in with the same username and password as the website. */
export default function Login() {
  const { server: saved, signIn } = useSession();
  const [server, setServer] = useState(saved);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!server.trim() || !username.trim() || !password) {
      setError('Fill in the shop address, your username and your password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(server, username, password, Constants.deviceName ?? 'Phone');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: 48, paddingBottom: 8, gap: 4 }}>
        <T size={28} weight="700">Shop POS</T>
        <Muted size={15}>Sign in with your POS username and password.</Muted>
      </View>
      <Card>
        <Banner text={error} />
        <Field label="Shop address" value={server} onChangeText={setServer} placeholder="your-shop.vercel.app"
          autoCapitalize="none" autoCorrect={false} keyboardType="url"
          hint="The website address the shop uses. On the shop Wi-Fi you can use the laptop, e.g. http://192.168.1.20:8000" />
        <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={submit} />
        <Button title="Sign in" onPress={submit} busy={busy} />
      </Card>
    </Screen>
  );
}
