/** Download a report's Excel file from the website and open the share sheet (save to Files, WhatsApp, email). */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { fileRequest } from '@/api/client';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function shareExcel(report: string, query: Record<string, string | number | undefined>, title: string) {
  const { url, headers } = fileRequest(`reports/${report}/excel/`, query);
  const stamp = new Date().toISOString().slice(0, 10);
  const target = new File(Paths.cache, `${report}-${stamp}.xlsx`);
  let file: File;
  try {
    file = await File.downloadFileAsync(url, target, { headers, idempotent: true });
  } catch {
    throw new Error("Couldn't download the Excel file. Check the connection and try again.");
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(file.uri, { mimeType: XLSX, dialogTitle: title, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}
