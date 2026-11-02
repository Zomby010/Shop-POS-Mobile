import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useColors } from '@/components/ui';
import { can, useSession } from '@/store/session';

/** Tabs follow the user's privileges, like the website's top bar. */
export default function TabsLayout() {
  const c = useColors();
  const user = useSession((s) => s.user);
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: unknown; size: number }) =>
    <Ionicons name={name} color={color as string} size={size} />;
  const hide = (show: boolean) => (show ? {} : { href: null });
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: c.card }, headerTintColor: c.text, tabBarActiveTintColor: c.primary,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border }, sceneStyle: { backgroundColor: c.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Sell', tabBarIcon: icon('cart-outline'), ...hide(can(user, 'sell')) }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales', tabBarIcon: icon('receipt-outline'), ...hide(can(user, 'view_sales')) }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers', tabBarIcon: icon('people-outline'), ...hide(can(user, 'customers')) }} />
      <Tabs.Screen name="stock" options={{
        title: 'Stock', tabBarIcon: icon('cube-outline'),
        ...hide(can(user, 'receive_stock', 'adjust_stock', 'stock_history')),
      }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('ellipsis-horizontal') }} />
    </Tabs>
  );
}
