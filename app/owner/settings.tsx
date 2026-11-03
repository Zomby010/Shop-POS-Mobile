import { useEffect, useState } from 'react';
import { Switch } from 'react-native';

import { get, post } from '@/api/client';
import type { ShopSettings } from '@/api/types';
import { Banner, Button, Card, ChipRow, Field, Loading, Muted, Row, Screen, T } from '@/components/ui';
import { useSession } from '@/store/session';

interface Choice { value: string | number; label: string }
interface Values {
  business_name: string; address: string; phone: string; kra_pin: string; receipt_footer: string;
  printer_connection: string; printer_address: string; paper_width_mm: number; low_stock_default: string; allow_credit: boolean;
}
interface Page { values: Values; choices: { printer_connection: Choice[]; paper_width_mm: Choice[] }; settings: ShopSettings }

/** The website's shop settings form, without the logo and backups, which stay on the website. */
export default function ShopSettingsScreen() {
  const [page, setPage] = useState<Page | null>(null);
  const [v, setV] = useState<Values | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Values>(k: K) => (x: Values[K]) => { setSaved(false); setV((o) => o && { ...o, [k]: x }); };

  useEffect(() => {
    get<Page>('settings/').then((p) => { setPage(p); setV(p.values); }).catch((e: Error) => setError(e.message));
  }, []);

  if (!v || !page) return error ? <Screen><Banner text={error} /></Screen> : <Loading />;
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const p = await post<Page>('settings/', v);
      setPage(p); setV(p.values); setSaved(true);
      useSession.setState({ settings: p.settings });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Banner text={error} />
      <Banner text={saved ? 'Settings saved.' : null} kind="good" />
      <Card>
        <T weight="600">Shop</T>
        <Field label="Business name" value={v.business_name} onChangeText={set('business_name')} />
        <Field label="Address" value={v.address} onChangeText={set('address')} />
        <Field label="Phone" value={v.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="KRA PIN" value={v.kra_pin} onChangeText={set('kra_pin')} autoCapitalize="characters" />
      </Card>
      <Card>
        <T weight="600">Receipts and printer</T>
        <Field label="Receipt footer" value={v.receipt_footer} onChangeText={set('receipt_footer')} />
        <Muted>Printer connection (for the website's till)</Muted>
        <ChipRow options={page.choices.printer_connection.map((c) => ({ value: String(c.value), label: c.label }))}
          value={v.printer_connection} onChange={set('printer_connection')} />
        <Field label="Printer address" value={v.printer_address} onChangeText={set('printer_address')} autoCapitalize="none"
          hint="USB: 0x0416:0x5011 · Network: 192.168.1.50 · Windows: the printer name as shown in Windows" />
        <Muted>Paper width</Muted>
        <ChipRow options={page.choices.paper_width_mm.map((c) => ({ value: String(c.value), label: c.label }))}
          value={String(v.paper_width_mm)} onChange={(x) => set('paper_width_mm')(Number(x))} />
      </Card>
      <Card>
        <T weight="600">Stock and deni</T>
        <Field label="Low stock level for new products" value={v.low_stock_default} onChangeText={set('low_stock_default')} keyboardType="decimal-pad" />
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <T>Allow deni sales</T>
          <Switch value={v.allow_credit} onValueChange={set('allow_credit')} />
        </Row>
        <Muted size={12}>Turn off to stop all new deni sales. Customers who already owe can still repay.</Muted>
      </Card>
      <Button title="Save settings" busy={busy} disabled={!v.business_name.trim()} onPress={save} />
      <Muted size={12}>The logo and backups are set on the website.</Muted>
    </Screen>
  );
}
