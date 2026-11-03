import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColors } from '@/components/ui';
import { useCatalog } from '@/store/catalog';
import { useSession } from '@/store/session';

/** Restores the sign-in, sends signed-out users to the login screen, and loads the products once signed in. */
export default function RootLayout() {
  const c = useColors();
  const { ready, token, restore } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { void restore(); }, [restore]);

  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === 'login';
    if (!token && !onLogin) router.replace('/login');
    if (token && onLogin) router.replace('/');
    if (token) void useCatalog.getState().load();
  }, [ready, token, segments, router]);

  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><ActivityIndicator /></View>;
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: c.card }, headerTintColor: c.text, contentStyle: { backgroundColor: c.bg },
        headerTitleStyle: { fontWeight: '600' },
      }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pay" options={{ title: 'Pay', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan a barcode', presentation: 'modal' }} />
        <Stack.Screen name="receipt/[id]" options={{ title: 'Sale complete', headerBackVisible: false }} />
        <Stack.Screen name="sale/[id]" options={{ title: 'Sale' }} />
        <Stack.Screen name="customers" options={{ title: 'Customers' }} />
        <Stack.Screen name="customer/[id]" options={{ title: 'Customer' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="product/new" options={{ title: 'Add product' }} />
        <Stack.Screen name="product/history/[id]" options={{ title: 'Stock history' }} />
        <Stack.Screen name="categories" options={{ title: 'Categories' }} />
        <Stack.Screen name="customer/new" options={{ title: 'Add customer', presentation: 'modal' }} />
        <Stack.Screen name="held" options={{ title: 'Held sales' }} />
        <Stack.Screen name="cashup" options={{ title: 'Cash-up' }} />
        <Stack.Screen name="cashups" options={{ title: 'Cash-ups' }} />
        <Stack.Screen name="cashup-record/[id]" options={{ title: 'Cash-up' }} />
        <Stack.Screen name="customer/edit" options={{ title: 'Edit customer', presentation: 'modal' }} />
        <Stack.Screen name="reports" options={{ title: 'Money and reports' }} />
        <Stack.Screen name="expenses" options={{ title: 'Expenses' }} />
        <Stack.Screen name="stock/receive" options={{ title: 'Receive stock' }} />
        <Stack.Screen name="stock/loss" options={{ title: 'Loss and wastage' }} />
        <Stack.Screen name="stock/recount" options={{ title: 'Recount' }} />
        <Stack.Screen name="stock/low" options={{ title: 'Low stock' }} />
        <Stack.Screen name="stock/purchases" options={{ title: 'Purchases' }} />
        <Stack.Screen name="stock/purchase/[id]" options={{ title: 'Purchase' }} />
        <Stack.Screen name="stock/convert" options={{ title: 'Convert stock' }} />
        <Stack.Screen name="stock/takes" options={{ title: 'Stock takes' }} />
        <Stack.Screen name="stock/take/[id]" options={{ title: 'Stock take' }} />
        <Stack.Screen name="stock/movements" options={{ title: 'Stock movements' }} />
        <Stack.Screen name="stock/loss-report" options={{ title: 'Loose-goods loss report' }} />
        <Stack.Screen name="stock/stock-loss" options={{ title: 'Stock loss explained' }} />
        <Stack.Screen name="stock/recounts" options={{ title: 'Recount history' }} />
        <Stack.Screen name="deni" options={{ title: 'Deni given and repaid' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
