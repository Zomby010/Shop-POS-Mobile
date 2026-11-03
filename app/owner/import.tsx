import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';

import { upload } from '@/api/client';
import type { ImportPreview } from '@/api/types';
import { Banner, Button, Card, KeyValue, ListItem, Muted, Screen, T, useColors } from '@/components/ui';
import { shareWorkbook, XLSX } from '@/lib/excel';
import { useCatalog } from '@/store/catalog';

type Picked = { uri: string; name: string; mimeType?: string };

function formFor(file: Picked, confirm: boolean) {
  const form = new FormData();
  // React Native's FormData takes a file as {uri, name, type}.
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? XLSX } as unknown as Blob);
  if (confirm) form.append('confirm', '1');
  return form;
}

/** The website's product import: pick the workbook, check every row, then add or update the good ones.
 * Also downloads the template and the full product list to edit and import again. */
export default function ProductImport() {
  const c = useColors();
  const [file, setFile] = useState<Picked | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const pick = () => run('pick', async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: [XLSX, 'application/vnd.ms-excel'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const picked = { uri: a.uri, name: a.name, mimeType: a.mimeType };
    setFile(picked); setDone(null); setPreview(null);
    setPreview(await upload<ImportPreview>('products/import/', formFor(picked, false)));
  });
  const confirm = () => file && run('confirm', async () => {
    const r = await upload<{ created: number; updated: number; skipped: number }>('products/import/', formFor(file, true));
    setDone(`Added ${r.created}, updated ${r.updated}${r.skipped ? `, skipped ${r.skipped} with problems` : ''}.`);
    setPreview(null); setFile(null);
    await useCatalog.getState().load(true);
  });

  return (
    <Screen>
      <Banner text={error} />
      <Banner text={done} kind="good" />
      <Card>
        <T weight="600">Import products from Excel</T>
        <Muted>Use the template, or export the products, change them and import the file again. Nothing is saved until you confirm.</Muted>
        <Button title={file ? 'Choose another file' : 'Choose Excel file'} icon="document-outline" busy={busy === 'pick'}
          disabled={!!busy} onPress={pick} />
      </Card>
      {preview ? (
        <>
          <Card>
            <T weight="600">{file?.name}</T>
            <KeyValue label="Rows ready" value={String(preview.good)} />
            <KeyValue label="Rows with problems" value={String(preview.bad)} color={preview.bad ? c.danger : undefined} />
            {preview.bad ? <Muted size={12}>Rows with problems are skipped. Fix them in the file and import it again.</Muted> : null}
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {preview.rows.map((r) => (
              <ListItem key={r.row_number} title={`Row ${r.row_number}: ${r.name || '(no name)'}`}
                subtitle={r.errors.length ? r.errors.join(' ') : undefined}
                right={r.errors.length ? 'Problem' : r.action === 'update' ? 'Update' : 'New'} tone={r.errors.length ? c.danger : undefined} />
            ))}
          </Card>
          <Button title={`Import ${preview.good} row${preview.good === 1 ? '' : 's'}`} busy={busy === 'confirm'}
            disabled={!preview.good || !!busy} onPress={() => void confirm()} />
        </>
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <ListItem title="Download the template" subtitle="Empty workbook with the right columns"
          onPress={() => void run('t', () => shareWorkbook('products/import/template/', 'products-template.xlsx', 'Products template'))} />
        <ListItem title="Export every product" subtitle="Edit it in Excel and import it again"
          onPress={() => void run('e', () => shareWorkbook('products/export/', `products-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Products'))} />
      </Card>
    </Screen>
  );
}
