/** Printing and sharing the receipt the server laid out (the same text the shop's thermal printer prints). */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function html(lines: string[], paperMm: number) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<html><head><meta name="viewport" content="width=device-width"><style>
    @page { size: ${paperMm}mm auto; margin: 2mm; }
    body { margin: 0; } pre { font-family: 'Courier New', monospace; font-size: ${paperMm <= 58 ? 9 : 10}pt; line-height: 1.25; margin: 0; white-space: pre; }
  </style></head><body><pre>${lines.map(esc).join('\n')}</pre></body></html>`;
}

/** Opens the phone's print dialog: a Wi-Fi printer, a Bluetooth printer with an Android print service, or Save as PDF. */
export async function printReceipt(lines: string[], paperMm = 80) {
  await Print.printAsync({ html: html(lines, paperMm) });
}

/** Shares the receipt as a PDF, e.g. on WhatsApp. */
export async function shareReceipt(lines: string[], paperMm = 80, name = 'receipt') {
  const { uri } = await Print.printToFileAsync({ html: html(lines, paperMm), width: paperMm * 2.835 * 1.6 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: name });
}
