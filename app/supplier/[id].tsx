import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Pressable } from 'react-native';

import { SupplierView } from '@/components/SupplierView';
import { useColors } from '@/components/ui';
import { can, useSession } from '@/store/session';

/** One supplier on a phone. Tablets show this beside the list instead. */
export default function SupplierScreen() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useSession((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => can(user, 'edit_suppliers') ? (
        <Pressable onPress={() => router.push({ pathname: '/supplier/edit', params: { id } })} hitSlop={12} style={{ padding: 8 }} accessibilityLabel="Edit supplier">
          <Ionicons name="create-outline" size={22} color={c.text} />
        </Pressable>
      ) : null,
    });
  }, [navigation, router, c, user, id]);
  return <SupplierView id={Number(id)} />;
}
