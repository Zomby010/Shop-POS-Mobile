/** Who is signed in, to which shop server. The token lives in the phone's secure storage. */
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { configureApi, get, normaliseServer, post } from '../api/client';
import type { Level, ShopSettings, User } from '../api/types';

const SERVER_KEY = 'shoppos.server';
const TOKEN_KEY = 'shoppos.token';

interface SessionState {
  ready: boolean;
  server: string;
  token: string | null;
  user: User | null;
  settings: ShopSettings | null;
  restore: () => Promise<void>;
  signIn: (server: string, username: string, password: string, deviceName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useSession = create<SessionState>((set, getState) => ({
  ready: false,
  server: '',
  token: null,
  user: null,
  settings: null,

  async restore() {
    const [server, token] = await Promise.all([SecureStore.getItemAsync(SERVER_KEY), SecureStore.getItemAsync(TOKEN_KEY)]);
    configureApi({ baseUrl: server ?? '', token, onSignedOut: () => void getState().signOut() });
    set({ server: server ?? '', token });
    if (server && token) {
      try {
        const me = await get<{ user: User; settings: ShopSettings }>('me/');
        set({ user: me.user, settings: me.settings });
      } catch {
        // Offline or signed out: the 401 handler clears the token; offline keeps it for later.
      }
    }
    set({ ready: true });
  },

  async signIn(serverInput, username, password, deviceName) {
    const server = normaliseServer(serverInput);
    configureApi({ baseUrl: server, token: null });
    const res = await post<{ token: string; user: User; settings: ShopSettings }>('auth/login/', {
      username: username.trim(), password, device_name: deviceName,
    });
    await SecureStore.setItemAsync(SERVER_KEY, server);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    configureApi({ token: res.token });
    set({ server, token: res.token, user: res.user, settings: res.settings });
  },

  async signOut() {
    if (getState().token) {
      try { await post('auth/logout/'); } catch { /* the token is dropped on the phone either way */ }
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    configureApi({ token: null });
    set({ token: null, user: null });
  },

  async refresh() {
    const me = await get<{ user: User; settings: ShopSettings }>('me/');
    set({ user: me.user, settings: me.settings });
  },
}));

/** The user's level for a privilege, as on People -> Roles and privileges. */
export function levelOf(user: User | null, key: string): Level {
  return (user?.privileges[key] as Level | undefined) ?? 'no';
}

export const can = (user: User | null, ...keys: string[]) => keys.some((k) => levelOf(user, k) !== 'no');
