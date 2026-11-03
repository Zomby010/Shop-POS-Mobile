/** The cart: lines with quantity steppers. Lowering or removing a line asks for the owner's PIN, as on the website. */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { post } from '@/api/client';
import { type CartLine, CartError, needsApproval } from '@/domain/cart';
import { formatQty, ksh, parseQty } from '@/lib/money';
import { useCart } from '@/store/cart';
import { useCatalog } from '@/store/catalog';
import { levelOf, useSession } from '@/store/session';

import { Banner, Button, Field, Muted, PinSheet, Row, Sheet, T, useColors } from './ui';

export function CartPanel() {
  const c = useColors();
  const { lines, short, setQty } = useCart();
  const byId = useCatalog((s) => s.byId);
  const user = useSession((s) => s.user);
  const [editing, setEditing] = useState<CartLine | null>(null);
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState<{ line: CartLine; qty: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (line: CartLine, qty: number) => {
    try {
      setQty(line.key, qty, line.productId ? byId.get(line.productId) : undefined);
      setError(null);
    } catch (e) {
      setError(e instanceof CartError ? e.message : String(e));
    }
  };

  /** Raising is free; lowering needs the owner unless this user may do it freely. */
  const change = (line: CartLine, qty: number) => {
    if (needsApproval(line, qty) && levelOf(user, 'cart_reduce') !== 'yes') {
      setPending({ line, qty });
      return;
    }
    apply(line, qty);
  };

  const step = (line: CartLine, dir: 1 | -1) => {
    const p = line.productId ? byId.get(line.productId) : undefined;
    if (p && p.sold_by !== 'piece') { setEditing(line); setTyped(formatQty(line.qtyMilli)); return; }
    change(line, Math.max(line.qtyMilli + dir * 1000, 0));
  };

  if (!lines.length) return <Muted size={15}>Scan, search or tap a product to start a sale.</Muted>;

  return (
    <View style={{ gap: 8 }}>
      <Banner text={error} />
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 6 }}>
        {lines.map((line) => (
          <View key={line.key} style={{
            backgroundColor: c.card, borderRadius: 10, padding: 10, gap: 6,
            borderWidth: 1, borderColor: line.productId && short.has(line.productId) ? c.danger : c.border,
          }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T weight="600" numberOfLines={2}>{line.name}</T>
                <Muted size={12}>
                  {formatQty(line.qtyMilli)} {line.unit} × {ksh(line.unitPriceCents)}{line.tierApplied ? ' · bulk' : ''}
                  {line.enteredAs === 'amount' ? ' · by amount' : line.enteredAs === 'fixed' && line.productId ? ' · fixed price' : ''}
                </Muted>
              </View>
              <T weight="700">{ksh(line.totalCents)}</T>
            </Row>
            <Row style={{ justifyContent: 'flex-end' }}>
              <Pressable hitSlop={8} onPress={() => change(line, 0)} accessibilityLabel="Remove">
                <Ionicons name="trash-outline" size={20} color={c.danger} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable hitSlop={8} onPress={() => step(line, -1)} accessibilityLabel="Less">
                <Ionicons name="remove-circle-outline" size={28} color={c.text} />
              </Pressable>
              <Pressable onPress={() => { setEditing(line); setTyped(formatQty(line.qtyMilli)); }}>
                <T weight="700" size={16}>{formatQty(line.qtyMilli)}</T>
              </Pressable>
              <Pressable hitSlop={8} onPress={() => step(line, 1)} accessibilityLabel="More">
                <Ionicons name="add-circle-outline" size={28} color={c.text} />
              </Pressable>
            </Row>
          </View>
        ))}
      </ScrollView>

      <Sheet visible={!!editing} title={editing?.name ?? ''} onClose={() => setEditing(null)}>
        <Field label={`Quantity (${editing?.unit ?? ''})`} value={typed} onChangeText={setTyped} keyboardType="decimal-pad" autoFocus />
        <Button title="Set quantity" onPress={() => {
          const milli = parseQty(typed);
          if (editing && milli !== null && milli >= 0) change(editing, milli);
          setEditing(null);
        }} />
      </Sheet>

      <PinSheet visible={!!pending} title={pending?.qty === 0 ? 'Remove this line?' : 'Lower this line?'} withReason
        onClose={() => setPending(null)}
        onSubmit={async (pin, reason) => {
          if (!pending) return;
          try {
            await post('auth/verify-pin/', {
              privilege: 'cart_reduce', pin, reason, product_id: pending.line.productId,
              old_quantity: formatQty(pending.line.qtyMilli), new_quantity: formatQty(pending.qty),
            });
          } catch (e) {
            return (e as Error).message;
          }
          apply(pending.line, pending.qty);
        }} />
    </View>
  );
}

