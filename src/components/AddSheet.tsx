/** Picking how much of a product to sell: quick-sale buttons, or a custom quantity or amount. */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Product } from '@/api/types';
import type { AddInput } from '@/domain/cart';
import { money } from '@/lib/format';
import { parseMoney, parseQty } from '@/lib/money';

import { Banner, Button, ChipRow, Field, Muted, Sheet, T, useColors } from './ui';

export function AddSheet({ product, onClose, onAdd }: {
  product: Product | null; onClose: () => void; onAdd: (p: Product, input: AddInput) => string | void;
}) {
  const c = useColors();
  const [mode, setMode] = useState<'qty' | 'amount'>('qty');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!product) return null;
  const loose = product.sold_by !== 'piece';
  const modes = product.sell_mode === 'both' && loose ? (['qty', 'amount'] as const) : [product.sell_mode === 'amount' ? 'amount' : 'qty'] as const;
  const current = modes.includes(mode as never) ? mode : modes[0];

  const close = () => { setValue(''); setError(null); setMode('qty'); onClose(); };
  const add = (input: AddInput) => {
    const problem = onAdd(product, input);
    if (problem) setError(problem); else close();
  };
  const addCustom = () => {
    if (current === 'amount') {
      const cents = parseMoney(value);
      if (!cents || cents <= 0) return setError('Type the amount in KSh.');
      add({ amountCents: cents });
    } else {
      const milli = parseQty(value);
      if (!milli || milli <= 0) return setError(`Type how many ${product.unit}.`);
      add({ qtyMilli: milli });
    }
  };

  return (
    <Sheet visible title={product.name} onClose={close}>
      <Muted>{money(product.selling_price)} per {product.unit === 'pcs' ? 'piece' : product.unit} · {product.stock_qty.replace(/\.?0+$/, '')} {product.unit} in stock</Muted>
      <Banner text={error} />
      {product.presets.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {product.presets.map((p) => (
            <Pressable key={p.id} onPress={() => {
              const v = p.kind === 'amount' ? { amountCents: parseMoney(p.value) ?? 0 }
                : p.has_fixed_price ? { fixedQtyMilli: parseQty(p.value) ?? 0, fixedTotalCents: parseMoney(p.price) ?? 0 }
                  : { qtyMilli: parseQty(p.value) ?? 0 };
              add(v);
            }} style={({ pressed }) => ({
              backgroundColor: c.chip, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, minWidth: 84,
              alignItems: 'center', opacity: pressed ? 0.7 : 1,
            })}>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{p.has_fixed_price ? p.quantity_label : p.label}</Text>
              {p.has_fixed_price ? <Text style={{ color: c.muted, fontSize: 12 }}>{money(p.price)}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      {modes.length > 1 ? (
        <ChipRow value={current} onChange={(v) => { setMode(v); setValue(''); }}
          options={[{ value: 'qty', label: `By ${product.unit}` }, { value: 'amount', label: 'By KSh' }]} />
      ) : null}
      <Field label={current === 'amount' ? 'Amount (KSh)' : `Quantity (${product.unit})`} value={value} onChangeText={setValue}
        keyboardType="decimal-pad" autoFocus={!product.presets.length} onSubmitEditing={addCustom}
        placeholder={current === 'amount' ? '50' : loose ? '0.25' : '1'} />
      <Button title="Add to cart" onPress={addCustom} />
      {current === 'amount' ? <T size={12} color={c.muted}>The quantity is worked out from the price, like at the till.</T> : null}
    </Sheet>
  );
}
