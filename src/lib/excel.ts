/** Download a file from the website (an Excel report, an invoice PDF) and open the share sheet, so it can be saved
 * to Files or sent by WhatsApp or email. */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { fileRequest } from '@/api/client';

export const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function shareFile(path: string, query: Record<string, string | number | undefined>, name: string,
  mimeType: string, uti: string, title: string) {
  const { url, headers } = fileRequest(path, query);
  let file: File;
  try {
    file = await File.downloadFileAsync(url, new File(Paths.cache, name), { headers, idempotent: true });
  } catch {
    throw new Error("Couldn't download the file. Check the connection and try again.");
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: title, UTI: uti });
}

export function shareExcel(report: string, query: Record<string, string | number | undefined>, title: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return shareFile(`reports/${report}/excel/`, query, `${report}-${stamp}.xlsx`, XLSX, 'org.openxmlformats.spreadsheetml.sheet', title);
}

export function sharePdf(path: string, name: string, title: string) {
  return shareFile(path, {}, name, 'application/pdf', 'com.adobe.pdf', title);
}

/** An Excel file the website makes outside the reports, such as the products export or the import template. */
export function shareWorkbook(path: string, name: string, title: string) {
  return shareFile(path, {}, name, XLSX, 'org.openxmlformats.spreadsheetml.sheet', title);
}
